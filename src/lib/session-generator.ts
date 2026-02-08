import type OpenAI from "openai";
import { READER_VOICE, GUIDE_VOICE } from "./openai";
import { getIntroPrompt, getNudgesPrompt, getPacingPrompt } from "./prompts";
import { SessionSegment, GeneratedSession, PacedLine } from "./types";

export type { SessionSegment, GeneratedSession };

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\[.*?\]/g, "")
    .replace(/§\s*\d+/g, "")
    .replace(/\(\d+\)/g, "")
    .replace(/^\d+[\.,]\s*/gm, "")
    .replace(/^[IVXLCDM]+\.\s*/gm, "")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractJSON(content: string): string {
  const stripped = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const match = stripped.match(/\[[\s\S]*\]/);
  return match ? match[0] : "[]";
}

function splitIntoPassages(chapterText: string): string[] {
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

// Split text into chunks under 4096 chars at sentence boundaries
function chunkText(text: string, maxLen = 4000): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let breakAt = remaining.lastIndexOf(". ", maxLen);
    if (breakAt < maxLen / 2) breakAt = remaining.lastIndexOf(" ", maxLen);
    if (breakAt < 1) breakAt = maxLen;
    chunks.push(remaining.slice(0, breakAt + 1).trim());
    remaining = remaining.slice(breakAt + 1).trim();
  }
  if (remaining) chunks.push(remaining);

  return chunks;
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

async function generateTTS(
  openai: OpenAI,
  text: string,
  voice: "nova" | "onyx"
): Promise<string> {
  const chunks = chunkText(text);
  const buf = await generateTTSSingle(openai, chunks[0], voice);
  return buf.toString("base64");
}

// For long texts: returns multiple base64 audio strings (one per chunk)
async function generateTTSChunked(
  openai: OpenAI,
  text: string,
  voice: "nova" | "onyx"
): Promise<string[]> {
  const chunks = chunkText(text);
  const results: string[] = [];
  for (const chunk of chunks) {
    const buf = await generateTTSSingle(openai, chunk, voice);
    results.push(buf.toString("base64"));
  }
  return results;
}

async function addPacing(
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

async function batchTTS(
  openai: OpenAI,
  items: { text: string; voice: "nova" | "onyx" }[],
  onEach?: () => void
): Promise<string[]> {
  const results = await Promise.all(
    items.map(async (item, i) => {
      const start = Date.now();
      const buf = await generateTTSSingle(openai, item.text, item.voice);
      const ms = Date.now() - start;
      console.log(`[TIMING] TTS #${i + 1}/${items.length}: ${ms}ms (${item.text.length} chars, ${item.voice})`);
      onEach?.();
      return buf.toString("base64");
    })
  );
  return results;
}

async function generateIntro(
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

async function generateNudges(
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

export async function generateSession(
  openai: OpenAI,
  bookId: string,
  chapterId: string,
  userIntention: string,
  books: Record<
    string,
    {
      title: string;
      author: string;
      chapters: { id: string; title: string; content: string }[];
    }
  >,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<GeneratedSession> {
  const book = books[bookId];
  if (!book) throw new Error(`Book not found: ${bookId}`);

  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error(`Chapter not found: ${chapterId}`);

  const passages = splitIntoPassages(chapter.content);
  const chapterPreview = chapter.content.slice(0, 500);

  const t0 = Date.now();

  // Phase 1: Generate GPT content (intro + nudges in parallel)
  onProgress?.("Crafting your session...", 1, 2);
  const [introText, nudges] = await Promise.all([
    generateIntro(openai, userIntention, book.title, book.author, chapterPreview),
    generateNudges(openai, userIntention, passages, book.title, book.author),
  ]);

  const t1 = Date.now();
  console.log(
    `[TIMING] Phase 1 (GPT intro+nudges): ${t1 - t0}ms — intro ${introText.length} chars, ${nudges.length} nudges, ${passages.length} passages`
  );

  // Phase 2: Add pacing to all segments via GPT
  onProgress?.("Adding breathing pauses...", 1, 3);

  // Pace intro, all nudges, and all passages in parallel
  const pacingPromises: Promise<PacedLine[]>[] = [
    addPacing(openai, introText, "intro"),
    ...passages.map((p) => addPacing(openai, cleanTextForTTS(p), "passage")),
    ...nudges.map((n) => addPacing(openai, n, "nudge")),
  ];
  const pacingResults = await Promise.all(pacingPromises);

  const introPaced = pacingResults[0];
  const passagesPaced = pacingResults.slice(1, 1 + passages.length);
  const nudgesPaced = pacingResults.slice(1 + passages.length);

  // Hardcoded closing pacing — no GPT call needed
  const closingPaced: PacedLine[] = [
    { line: "Take a slow, deep breath in... and release.", pause_after_seconds: 6 },
    { line: "This session is now complete.", pause_after_seconds: 6 },
    { line: "Notice how you feel in this moment. There is no rush to move.", pause_after_seconds: 6 },
    { line: "When you are ready, carry this awareness gently with you.", pause_after_seconds: 7 },
  ];

  const t2 = Date.now();
  console.log(
    `[TIMING] Phase 2 (pacing): ${t2 - t1}ms — intro ${introPaced.length} lines, ` +
    `passages ${passagesPaced.map((p) => p.length).join("+")} lines, ` +
    `nudges ${nudgesPaced.map((n) => n.length).join("+")} lines, ` +
    `closing ${closingPaced.length} lines`
  );

  // Phase 3: Generate TTS for all paced lines
  // Merge adjacent lines with 0s pause into single TTS items to reduce API calls
  type TTSItem = { text: string; voice: "nova" | "onyx"; segType: SessionSegment["type"]; pauseAfter: number; displayText: string };

  function mergePacedLines(
    lines: PacedLine[],
    voice: "nova" | "onyx",
    segType: SessionSegment["type"]
  ): TTSItem[] {
    const items: TTSItem[] = [];
    let mergedText = "";
    for (const line of lines) {
      mergedText += (mergedText ? " " : "") + line.line;
      if (line.pause_after_seconds > 0 || line === lines[lines.length - 1]) {
        items.push({
          text: mergedText,
          voice,
          segType,
          pauseAfter: line.pause_after_seconds,
          displayText: mergedText,
        });
        mergedText = "";
      }
    }
    return items;
  }

  const allItems: TTSItem[] = [];

  // Intro lines (keep individual — each has meaningful pauses)
  allItems.push(...mergePacedLines(introPaced, GUIDE_VOICE, "intro"));

  // Interleave passages and nudges
  for (let i = 0; i < passages.length; i++) {
    allItems.push(...mergePacedLines(passagesPaced[i], READER_VOICE, "passage"));
    if (i < passages.length - 1 && nudgesPaced[i]) {
      allItems.push(...mergePacedLines(nudgesPaced[i], GUIDE_VOICE, "nudge"));
    }
  }

  // Closing lines (each has a pause, so no merging happens)
  allItems.push(...mergePacedLines(closingPaced, GUIDE_VOICE, "closing"));

  onProgress?.("Recording audio...", 2, 3);

  const t3start = Date.now();
  let ttsCompleted = 0;
  const audioResults = await batchTTS(
    openai,
    allItems.map((item) => ({ text: item.text, voice: item.voice })),
    () => {
      ttsCompleted++;
      if (ttsCompleted % 5 === 0 || ttsCompleted === allItems.length) {
        onProgress?.(`Recording audio... (${ttsCompleted}/${allItems.length})`, 2, 3);
      }
    }
  );

  // Phase 4: Assemble segments
  const segments: SessionSegment[] = allItems.map((item, i) => ({
    type: item.segType,
    text: item.displayText,
    voice: item.voice,
    audioBase64: audioResults[i],
    pauseAfter: item.pauseAfter > 0 ? item.pauseAfter : undefined,
  }));

  const t3end = Date.now();
  console.log(`[TIMING] Phase 3 (TTS): ${t3end - t3start}ms for ${allItems.length} calls`);
  console.log(`[TIMING] Total: ${t3end - t0}ms`);

  onProgress?.("Session ready!", 3, 3);
  console.log(`Session generated: ${segments.length} segments (${allItems.length} TTS calls)`);

  return {
    segments,
    bookTitle: book.title,
    chapterTitle: chapter.title,
  };
}
