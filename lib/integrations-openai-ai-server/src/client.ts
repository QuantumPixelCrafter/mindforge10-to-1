import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (_openai) return _openai;

  const userKey = process.env.OpenAI_API_Key || process.env.OPENAI_API_KEY;

  if (userKey) {
    _openai = new OpenAI({ apiKey: userKey });
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
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }

  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenAI();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
