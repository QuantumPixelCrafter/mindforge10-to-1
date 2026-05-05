import { Router, type IRouter } from "express";
import { db, notesTable, subjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/games/revision-cards", async (req, res) => {
  const count = (req.body?.count as number) ?? 8;

  const notes = await db
    .select({
      title: notesTable.title,
      content: notesTable.content,
      subjectName: subjectsTable.name,
    })
    .from(notesTable)
    .leftJoin(subjectsTable, eq(notesTable.subjectId, subjectsTable.id));

  if (notes.length === 0) {
    res.json({ cards: [], subject: "General" });
    return;
  }

  const notesText = notes
    .map((n) => `[${n.subjectName ?? "General"}] ${n.title}\n${n.content}`)
    .join("\n\n---\n\n");

  const prompt = `You are a study assistant creating revision flashcards. Based on the following student notes, generate exactly ${count} flashcard pairs. Each pair has a concise "term" (a key concept, person, formula, event, or vocabulary word) and a clear "definition" (an explanation of 1-3 sentences).

Student notes:
${notesText}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "cards": [
    { "id": 1, "term": "Term here", "definition": "Definition here" }
  ]
}

Rules:
- Generate exactly ${count} pairs
- Terms must be distinct and meaningful
- Definitions should be clear and informative
- Cover the breadth of the notes, not just one topic
- Keep terms concise (2-6 words max)
- Keep definitions to 1-2 sentences`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  let cards;
  try {
    const parsed = JSON.parse(content);
    cards = parsed.cards ?? [];
  } catch {
    res.status(500).json({ error: "Failed to parse cards from AI response" });
    return;
  }

  res.json({ cards });
});

export default router;
