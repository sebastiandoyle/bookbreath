import { NextRequest } from "next/server";
import { createOpenAIClient } from "@/lib/openai";
import { addPacing } from "@/lib/session-generator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { items, apiKey } = await request.json();

  if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-") || apiKey.length < 20) {
    return Response.json({ error: "Valid OpenAI API key required" }, { status: 401 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "items array required" }, { status: 400 });
  }

  try {
    const openai = createOpenAIClient(apiKey);
    const t0 = Date.now();

    const results = await Promise.all(
      items.map((item: { text: string; segmentType: string }) =>
        addPacing(openai, item.text, item.segmentType)
      )
    );

    console.log(`[TIMING] Pacing batch (${items.length} items): ${Date.now() - t0}ms`);
    return Response.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("401") || message.includes("invalid_api_key")) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }
    return Response.json({ error: `Pacing failed: ${message}` }, { status: 500 });
  }
}
