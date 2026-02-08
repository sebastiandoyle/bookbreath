import type OpenAI from "openai";
import { getIntroPrompt, getNudgesPrompt, getPacingPrompt } from "./prompts";
import { PacedLine } from "./types";
import { cleanTextForTTS } from "./session-assembly";

function extractJSON(content: string): string {
  const stripped = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const match = stripped.match(/\[[\s\S]*\]/);
  return match ? match[0] : "[]";
}

export function splitIntoPassages(chapterText: string): string[] {
  const sentences = chapterText
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const passages: string[] = [];
  let sentenceIndex = 0;
  let passageIndex = 0;

  while (sentenceIndex < sentences.length) {
    const targetSentences = Math.min(3 + passageIndex * 3, 12);
    const end = Math.min(sentenceIndex + targetSentences, sentences.length);
    const passage = sentences.slice(sentenceIndex, end).join(" ");
    passages.push(passage);
    sentenceIndex = end;
    passageIndex++;
  }

  if (passages.length < 2 && passages.length === 1) {
    const mid = Math.floor(passages[0].length / 2);
    const breakPoint = passages[0].indexOf(". ", mid);
    const splitAt = breakPoint > 0 ? breakPoint + 1 : mid;
    return [
      passages[0].slice(0, splitAt).trim(),
      passages[0].slice(splitAt).trim(),
    ];
  }

  return passages;
}

async function generateTTSSingle(
  openai: OpenAI,
  text: string,
  voice: "nova" | "onyx"
): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
    response_format: "mp3",
  });

  return Buffer.from(await response.arrayBuffer());
}

export async function addPacing(
  openai: OpenAI,
  text: string,
  segmentType: string
): Promise<PacedLine[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "user", content: getPacingPrompt(text, segmentType) },
      ],
    });

    const content = response.choices[0].message.content || "[]";
    const parsed = JSON.parse(extractJSON(content)) as PacedLine[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.error(`Pacing parse failed for ${segmentType}, using fallback:`, e);
  }
  return [{ line: text, pause_after_seconds: 0 }];
}

export async function batchTTS(
  openai: OpenAI,
  items: { text: string; voice: "nova" | "onyx" }[]
): Promise<string[]> {
  const results = await Promise.all(
    items.map(async (item, i) => {
      const start = Date.now();
      const buf = await generateTTSSingle(openai, item.text, item.voice);
      const ms = Date.now() - start;
      console.log(`[TIMING] TTS #${i + 1}/${items.length}: ${ms}ms (${item.text.length} chars, ${item.voice})`);
      return buf.toString("base64");
    })
  );
  return results;
}

export async function generateIntro(
  openai: OpenAI,
  userIntention: string,
  bookTitle: string,
  bookAuthor: string,
  chapterPreview: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "user",
        content: getIntroPrompt(
          userIntention,
          bookTitle,
          bookAuthor,
          chapterPreview
        ),
      },
    ],
  });

  return response.choices[0].message.content || "";
}

export async function generateNudges(
  openai: OpenAI,
  userIntention: string,
  passages: string[],
  bookTitle: string,
  bookAuthor: string
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "user",
        content: getNudgesPrompt(
          userIntention,
          passages,
          bookTitle,
          bookAuthor
        ),
      },
    ],
  });

  const content = response.choices[0].message.content || "[]";
  try {
    return JSON.parse(extractJSON(content)) as string[];
  } catch {
    console.error("Failed to parse nudges JSON, using fallback");
    return [];
  }
}

export { cleanTextForTTS };
