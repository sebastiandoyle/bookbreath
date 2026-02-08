import { NextRequest } from "next/server";
import { generateSession } from "@/lib/session-generator";
import { createOpenAIClient } from "@/lib/openai";
import { books } from "@/lib/books";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { bookId, chapterId, userIntention, apiKey } = await request.json();

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-") || apiKey.length < 20) {
    return Response.json(
      { error: "Valid OpenAI API key required (must start with sk-)" },
      { status: 401 }
    );
  }

  if (!bookId || !chapterId || !userIntention) {
    return Response.json(
      { error: "Missing required fields: bookId, chapterId, userIntention" },
      { status: 400 }
    );
  }

  try {
    const openai = createOpenAIClient(apiKey);
    const session = await generateSession(
      openai,
      bookId,
      chapterId,
      userIntention,
      books
    );

    return Response.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : "";
    console.error("Session generation error:", message);
    console.error("Stack:", stack);

    if (message.includes("401") || message.includes("Incorrect API key") || message.includes("invalid_api_key")) {
      return Response.json(
        { error: "Invalid API key. Please check your OpenAI API key and try again." },
        { status: 401 }
      );
    }

    return Response.json(
      { error: `Failed to generate session: ${message}` },
      { status: 500 }
    );
  }
}
