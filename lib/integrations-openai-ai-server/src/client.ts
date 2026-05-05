import OpenAI from "openai";

const userKey = process.env.OpenAI_API_Key || process.env.OPENAI_API_KEY;

let openai: OpenAI;

if (userKey) {
  openai = new OpenAI({ apiKey: userKey });
} else {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error(
      "Either OpenAI_API_Key or AI_INTEGRATIONS_OPENAI_BASE_URL must be set.",
    );
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error(
      "Either OpenAI_API_Key or AI_INTEGRATIONS_OPENAI_API_KEY must be set.",
    );
  }
  openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export { openai };
