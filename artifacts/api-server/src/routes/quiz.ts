import { Router, type IRouter } from "express";
import { db, notesTable, subjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GenerateQuizBody, GenerateQuizParams } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

type RawQuestion = { id: number; question: string; options: string[]; correctAnswer: number; explanation: string };

function reconcileCorrectAnswer(q: RawQuestion): RawQuestion {
  if (!Array.isArray(q.options) || q.options.length === 0) return q;
  const match = q.explanation?.match(/The correct answer is ['"](.+?)['"]/i);
  if (!match) return q;
  const claimedText = match[1].trim().toLowerCase();
  const currentOption = (q.options[q.correctAnswer] ?? "").trim().toLowerCase();
  if (currentOption === claimedText) return q;
  const fixedIdx = q.options.findIndex(o => o.trim().toLowerCase() === claimedText);
  if (fixedIdx === -1) return q;
  return { ...q, correctAnswer: fixedIdx };
}

const LEVEL_LABELS: Record<string, string> = {
  P1: "Primary 1", P2: "Primary 2", P3: "Primary 3",
  P4: "Primary 4", P5: "Primary 5", P6: "Primary 6",
  S1: "Secondary 1", S2: "Secondary 2", S3: "Secondary 3",
  S4: "Secondary 4", S5: "Secondary 5", S6: "Secondary 6",
  U1: "University Year 1", U2: "University Year 2",
  U3: "University Year 3", U4: "University Year 4",
};

const LEVEL_INSTRUCTIONS: Record<string, string> = {
  P1: "Use very simple vocabulary and short sentences. Focus on basic concepts a 7-year-old can grasp.",
  P2: "Use simple language. Focus on foundational concepts for an 8-year-old.",
  P3: "Use straightforward language appropriate for a 9-year-old student.",
  P4: "Suitable for a 10-year-old. Questions may involve simple reasoning.",
  P5: "Suitable for an 11-year-old. Include some application questions.",
  P6: "Suitable for a 12-year-old. Include application and some analysis questions.",
  S1: "Secondary 1 (age 13). Go beyond basic recall — require students to explain concepts in their own words, identify cause-and-effect relationships, and apply knowledge to simple new situations. Use precise academic vocabulary. Distractors must be plausible misconceptions, not obviously wrong.",
  S2: "Secondary 2 (age 14). Demand genuine understanding: questions must test application of concepts to unfamiliar scenarios, comparison between ideas, and interpretation of data or statements. Avoid straightforward recall. Distractors should reflect common student errors.",
  S3: "Secondary 3 (age 15). Focus on analysis and evaluation. Questions should require students to break down complex ideas, assess validity of claims, infer conclusions from given information, and integrate knowledge across sub-topics. All options must be sophisticated and the correct answer non-obvious without real understanding.",
  S4: "Secondary 4 (age 16, major national exam preparation). Questions must be at full exam standard: multi-concept application, interpretation of scenarios, critical evaluation, and synthesis of information. Distractors must represent subtle but incorrect reasoning. No straightforward recall questions — every question should require thinking.",
  S5: "Secondary 5 (age 17, advanced exam level). High-difficulty questions demanding deep conceptual mastery, evaluation of competing arguments, and synthesis across topics. Questions should mirror the hardest questions in national exams. Distractors must be based on sophisticated but flawed reasoning that a weak student could mistake for correct.",
  S6: "Secondary 6 / Pre-university (age 18). Near university-entry level. Questions must require critical synthesis, nuanced evaluation, and application of theory to complex real-world scenarios. Expect the student to distinguish subtle distinctions between closely related concepts. Distractors should require careful analytical reading to eliminate.",
  U1: "University Year 1 level. Questions should test conceptual understanding and application.",
  U2: "University Year 2 level. Expect deeper analysis and cross-topic reasoning.",
  U3: "University Year 3 level. Advanced questions requiring synthesis and critical evaluation.",
  U4: "Final year university level. Research-level thinking; expect nuanced, complex questions.",
};

router.post("/notes/:id/quiz", async (req, res) => {
  const { id } = GenerateQuizParams.parse(req.params);
  const body = GenerateQuizBody.parse(req.body);

  const [note] = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.id, id));

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const questionCount = body.questionCount ?? 5;
  const difficulty = body.difficulty;
  const level = body.level;
  const difficultyInstructions = {
    easy: "Create straightforward questions testing basic recall and simple understanding.",
    normal: "Create moderately challenging questions testing understanding and application.",
    difficult: "Create challenging questions requiring deep understanding, analysis, and synthesis.",
  }[difficulty];

  const levelLabel = level ? LEVEL_LABELS[level] : null;
  const levelInstruction = level ? LEVEL_INSTRUCTIONS[level] : null;

  const levelSection = levelLabel && levelInstruction
    ? `\nStudent Education Level: ${levelLabel}\nLevel-appropriate instruction: ${levelInstruction}`
    : "";

  const prompt = `Generate a ${difficulty} difficulty quiz with exactly ${questionCount} multiple-choice questions based on the following study notes.
${levelSection}

${difficultyInstructions}

Notes title: ${note.title}
Notes content:
${note.content}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "The correct answer is '[paste the exact text of the correct option here]' because ..."
    }
  ]
}

CRITICAL RULES — you MUST follow these exactly:
- correctAnswer is the 0-based index (0=first option, 1=second, 2=third, 3=fourth)
- Before finalising each question, verify: options[correctAnswer] is factually correct, and ALL other options are factually wrong
- The explanation MUST begin with "The correct answer is '[exact text of the correct option]' because" — this forces you to confirm the index is right
- Never mark a wrong answer as correct. If unsure, choose a different question
- Always provide exactly 4 options
- Base questions ONLY on the provided notes
- Do not ask about images or visual content
- Tailor vocabulary and complexity to the specified student level`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: "You are a precise, accurate quiz generator. Your top priority is factual correctness — every correctAnswer index must point to the genuinely correct option. You must verify each answer before outputting. Never guess.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const content = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  let questions;
  try {
    const parsed = JSON.parse(content);
    questions = parsed.questions;
  } catch {
    res.status(500).json({ error: "Failed to parse quiz from AI response" });
    return;
  }

  questions = Array.isArray(questions) ? questions.map(reconcileCorrectAnswer) : questions;

  res.json({
    noteId: id,
    difficulty,
    questions,
  });
});

export default router;
