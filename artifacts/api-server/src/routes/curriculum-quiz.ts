import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

type RawQuestion = { id: number; question: string; options: string[]; correctAnswer: number; explanation: string };

/**
 * The AI prompt requires explanations to start with:
 *   "The correct answer is '[exact option text]' because …"
 * We extract that text and find which option index it belongs to.
 * If the index from the AI matches, great. If not, we correct it.
 * This catches cases where the AI gives the right explanation but the wrong index.
 */
function reconcileCorrectAnswer(q: RawQuestion): RawQuestion {
  if (!Array.isArray(q.options) || q.options.length === 0) return q;

  const match = q.explanation?.match(/The correct answer is ['"](.+?)['"]/i);
  if (!match) return q;

  const claimedText = match[1].trim().toLowerCase();
  const currentOption = (q.options[q.correctAnswer] ?? "").trim().toLowerCase();

  if (currentOption === claimedText) return q; // index is already consistent

  const fixedIdx = q.options.findIndex(o => o.trim().toLowerCase() === claimedText);
  if (fixedIdx === -1) return q; // can't find a match, leave as-is

  return { ...q, correctAnswer: fixedIdx };
}

const LEVEL_LABELS: Record<string, string> = {
  P1:"Primary 1",P2:"Primary 2",P3:"Primary 3",P4:"Primary 4",P5:"Primary 5",P6:"Primary 6",
  S1:"Secondary 1",S2:"Secondary 2",S3:"Secondary 3",S4:"Secondary 4",S5:"Secondary 5",S6:"Secondary 6",
  U1:"University Year 1",U2:"University Year 2",U3:"University Year 3",U4:"University Year 4",
};

const LEVEL_INSTRUCTIONS: Record<string, string> = {
  P1:"Use very simple vocabulary and short sentences. Focus on basic concepts suitable for a 7-year-old.",
  P2:"Use simple language. Focus on foundational concepts for an 8-year-old.",
  P3:"Use straightforward language appropriate for a 9-year-old student.",
  P4:"Suitable for a 10-year-old. Questions may involve simple reasoning and application.",
  P5:"Suitable for an 11-year-old. Include some application-level questions.",
  P6:"Suitable for a 12-year-old preparing for PSLE. Include application and some analysis questions.",
  S1:"Suitable for a 13-year-old secondary student. Use intermediate vocabulary.",
  S2:"Suitable for a 14-year-old secondary student. Questions should test understanding and application.",
  S3:"Suitable for a 15-year-old. Include analysis and some evaluation questions.",
  S4:"Suitable for a 16-year-old preparing for O-Levels. Include rigorous exam-style questions.",
  S5:"Suitable for a 17-year-old. Exam-level questions with detailed reasoning required.",
  S6:"Suitable for an 18-year-old pre-university student. Advanced analysis and evaluation required.",
  U1:"University Year 1 level. Questions should test conceptual understanding and application of theory.",
  U2:"University Year 2 level. Expect deeper analysis and cross-topic reasoning.",
  U3:"University Year 3 level. Advanced questions requiring synthesis and critical evaluation.",
  U4:"Final year university level. Research-level thinking; nuanced, complex questions required.",
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy:"Create straightforward questions testing basic recall and simple understanding. Avoid trick questions.",
  normal:"Create moderately challenging questions that test understanding and application. Include some inference.",
  difficult:"Create challenging questions requiring deep understanding, analysis, synthesis and critical thinking.",
};

router.post("/curriculum-quiz/generate", async (req, res) => {
  const { level, subject, topic, difficulty = "normal", questionCount = 10, recentConcepts } = req.body;

  if (!level || !subject || !topic) {
    res.status(400).json({ error: "level, subject, and topic are required" });
    return;
  }

  if (!LEVEL_LABELS[level]) {
    res.status(400).json({ error: "Invalid level" });
    return;
  }

  const levelLabel = LEVEL_LABELS[level];
  const levelInstruction = LEVEL_INSTRUCTIONS[level];
  const diffInstruction = DIFFICULTY_INSTRUCTIONS[difficulty] ?? DIFFICULTY_INSTRUCTIONS.normal;
  const count = Math.min(Math.max(Number(questionCount) || 10, 3), 20);

  const parsedConcepts: string[] = recentConcepts
    ? recentConcepts.split(";").map((c: string) => c.trim()).filter(Boolean)
    : [];

  if (parsedConcepts.length > 0) {
    try {
      const validation = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 200,
        messages: [
          { role: "system", content: "You are a validation assistant. Respond only with valid JSON, no markdown." },
          {
            role: "user",
            content: `Are these concepts related to the subject "${subject}"? Concepts: ${parsedConcepts.join(", ")}\n\nReply with JSON only: {"allRelated": true, "unrelatedConcepts": []} or {"allRelated": false, "unrelatedConcepts": ["concept1"]}`,
          },
        ],
      });
      const raw = validation.choices[0]?.message?.content ?? "{}";
      let result: { allRelated?: boolean; unrelatedConcepts?: string[] } = {};
      try { result = JSON.parse(raw); } catch { result = { allRelated: true }; }
      if (!result.allRelated && result.unrelatedConcepts && result.unrelatedConcepts.length > 0) {
        res.status(400).json({ error: `These concepts don't appear to be related to ${subject}: ${result.unrelatedConcepts.join(", ")}. Please check and try again.` });
        return;
      }
    } catch {
      // Validation failed silently — proceed without it
    }
  }

  const isMath = /math/i.test(subject);

  const mathSection = isMath ? `
MATHEMATICS-SPECIFIC RULES (this is a maths quiz — these override all other instructions):
- For every calculation question, compute the answer fully step by step BEFORE writing the options
- Write out each arithmetic step explicitly: e.g. 3x + 5 = 14 → 3x = 9 → x = 3
- Only after computing the correct answer, write it as one of the four options and set correctAnswer to its 0-based index
- The correct answer MUST be included verbatim in the options array at the index given by correctAnswer
- The other 3 options must be common calculation errors (e.g. sign errors, wrong order of operations), NOT random numbers
- Re-verify: mentally substitute your answer back into the question to confirm it is correct
- Double-check: options[correctAnswer] must equal the value you computed — if it does not, fix it before outputting
- NEVER guess a numerical answer — always compute it
- NEVER set correctAnswer to an index whose value is wrong` : "";

  const conceptsSection = parsedConcepts.length > 0
    ? `\nRecently studied concepts to focus on: ${parsedConcepts.join("; ")}\n- Prioritise these concepts when writing questions — most questions should directly test one of these concepts\n- You may include 1–2 questions on other parts of the topic for breadth\n`
    : "";

  const prompt = `Generate a ${difficulty} difficulty quiz with exactly ${count} multiple-choice questions on the topic "${topic}" within the subject "${subject}" for ${levelLabel} students.

Level-appropriate instruction: ${levelInstruction}

Difficulty instruction: ${diffInstruction}
${conceptsSection}${mathSection}
Important guidelines:
- All questions must be specific to the topic "${topic}" in "${subject}"
- Tailor vocabulary, complexity and depth to ${levelLabel} level
- Make each question unique — no repetition
- Provide exactly 4 answer options (A, B, C, D) per question
- Make distractors plausible but clearly wrong on careful reflection

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "The correct answer is '[exact text of the correct option]' because ..."
    }
  ]
}

CRITICAL RULES — you MUST follow these exactly:
- correctAnswer is the 0-based index (0=first option, 1=second, 2=third, 3=fourth)
- Before finalising each question, verify: options[correctAnswer] is factually correct, and ALL other options are factually wrong
- The explanation MUST begin with "The correct answer is '[exact text of the correct option]' because" and must show the full working if this is a calculation question
- Never mark a wrong answer as correct. If unsure about a fact or calculation, choose a different question
- Always provide exactly 4 options
- Generate exactly ${count} questions`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: isMath
            ? "You are a precise mathematics quiz generator. You MUST compute every numerical answer step by step before writing it. Never guess or estimate a number. After computing the answer, place it in the options array and set correctAnswer to its exact 0-based index. Verify by substituting back into the original expression. Factual accuracy is your absolute top priority."
            : "You are a precise, accurate quiz generator. Your top priority is factual correctness — every correctAnswer index must point to the genuinely correct option. You must verify each answer before outputting. Never guess.",
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
      if (!Array.isArray(questions) || questions.length === 0) throw new Error("No questions");
    } catch {
      res.status(500).json({ error: "Failed to parse quiz from AI response" });
      return;
    }

    questions = questions.map(reconcileCorrectAnswer);

    res.json({ level, subject, topic, difficulty, questions });
  } catch (err: any) {
    console.error("Curriculum quiz error:", err?.message);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
});

export default router;
