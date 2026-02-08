import OpenAI from "openai";

export const READER_VOICE = "nova" as const;
export const GUIDE_VOICE = "onyx" as const;

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}
