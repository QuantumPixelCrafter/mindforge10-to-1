import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const BOT_NAME = "Sage";

const CASUAL_SYSTEM = `You are ${BOT_NAME}, a warm, friendly companion inside the Mind Forge study app. Chat naturally and casually about anything the user wants — hobbies, feelings, daily life, ideas, jokes. Keep your tone light, playful, and supportive. Use everyday language and feel free to add a touch of humour. Keep replies concise unless the user wants depth. Never lecture.`;

const EDUCATIONAL_SYSTEM = `You are ${BOT_NAME}, an academic tutor inside the Mind Forge study app. Your primary focus is helping with academic topics: maths, sciences, languages, humanities, exam prep, study techniques, and homework. Maintain a professional, precise, and respectful tone. Show step-by-step reasoning, define key terms, and verify answers. If the user sends a non-academic message, respond briefly and warmly in one sentence, then gently steer the conversation back to studying — for example by asking if there's anything academic you can help with. Never ignore the user or refuse to reply. When writing mathematical expressions, always use $...$ for inline math and $$...$$ for display/block math. Never use \\[...\\] or \\(...\\) notation.`;

router.post("/chatbot", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { messages, mode } = req.body as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    mode?: "casual" | "educational";
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const cleanMessages = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-30)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (cleanMessages.length === 0) {
    res.status(400).json({ error: "no valid messages" });
    return;
  }

  const systemPrompt = mode === "educational" ? EDUCATIONAL_SYSTEM : CASUAL_SYSTEM;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanMessages,
      ],
      temperature: mode === "educational" ? 0.3 : 0.85,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Sorry, I couldn't think of a reply.";
    res.json({ reply, botName: BOT_NAME });
  } catch (err: any) {
    console.error("[chatbot] error", err?.message ?? err);
    res.status(500).json({ error: "Chatbot is temporarily unavailable. Please try again." });
  }
});

router.post("/chatbot/title", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { userMessage, botReply } = req.body as { userMessage?: string; botReply?: string };

  if (!userMessage || !botReply) {
    res.status(400).json({ error: "userMessage and botReply are required" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You generate very short, descriptive chat titles. Given the first user message and the assistant's reply, respond with ONLY a title of 3-5 words that captures the topic. No punctuation at the end. No quotes. Examples: 'Photosynthesis Explained Simply', 'Weekend Plans Chat', 'Calculus Derivatives Help', 'Feeling Stressed Today'.",
        },
        {
          role: "user",
          content: `User: ${userMessage.slice(0, 300)}\nAssistant: ${botReply.slice(0, 300)}`,
        },
      ],
      max_tokens: 20,
      temperature: 0.4,
    });

    const title = completion.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "New chat";
    res.json({ title });
  } catch {
    res.json({ title: "New chat" });
  }
});

export default router;
