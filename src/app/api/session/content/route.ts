import { NextRequest } from "next/server";
import { createOpenAIClient } from "@/lib/openai";
import { books } from "@/lib/books";
import {
  splitIntoPassages,
  generateIntro,
  generateNudges,
  cleanTextForTTS,
} from "@/lib/session-generator";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { bookId, chapterId, userIntention, apiKey } = await request.json();

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-") || apiKey.length < 20) {
    return Response.json({ error: "Valid OpenAI API key required" }, { status: 401 });
  }
  if (!bookId || !chapterId || !userIntention) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const book = books[bookId];
  if (!book) return Response.json({ error: `Book not found: ${bookId}` }, { status: 404 });

  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) return Response.json({ error: `Chapter not found: ${chapterId}` }, { status: 404 });

  try {
    const openai = createOpenAIClient(apiKey);
    const rawPassages = splitIntoPassages(chapter.content);
    const chapterPreview = chapter.content.slice(0, 500);

    const t0 = Date.now();
    const [intro, nudges] = await Promise.all([
      generateIntro(openai, userIntention, book.title, book.author, chapterPreview),
      generateNudges(openai, userIntention, rawPassages, book.title, book.author),
    ]);
    console.log(`[TIMING] Content phase: ${Date.now() - t0}ms`);

    return Response.json({
      intro,
      passages: rawPassages.map(cleanTextForTTS),
      nudges,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("401") || message.includes("invalid_api_key")) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }
    return Response.json({ error: `Content generation failed: ${message}` }, { status: 500 });
  }
}
