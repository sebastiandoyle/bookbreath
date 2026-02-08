import { PacedLine, SessionSegment, TTSItem } from "./types";

export const READER_VOICE = "nova" as const;
export const GUIDE_VOICE = "onyx" as const;

export function cleanTextForTTS(text: string): string {
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

export const CLOSING_PACED: PacedLine[] = [
  { line: "Take a slow, deep breath in... and release.", pause_after_seconds: 6 },
  { line: "This session is now complete.", pause_after_seconds: 6 },
  { line: "Notice how you feel in this moment. There is no rush to move.", pause_after_seconds: 6 },
  { line: "When you are ready, carry this awareness gently with you.", pause_after_seconds: 7 },
];

export function mergePacedLines(
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

export function buildTTSItems(
  introPaced: PacedLine[],
  passagesPaced: PacedLine[][],
  nudgesPaced: PacedLine[][]
): TTSItem[] {
  const allItems: TTSItem[] = [];

  allItems.push(...mergePacedLines(introPaced, GUIDE_VOICE, "intro"));

  for (let i = 0; i < passagesPaced.length; i++) {
    allItems.push(...mergePacedLines(passagesPaced[i], READER_VOICE, "passage"));
    if (i < passagesPaced.length - 1 && nudgesPaced[i]) {
      allItems.push(...mergePacedLines(nudgesPaced[i], GUIDE_VOICE, "nudge"));
    }
  }

  allItems.push(...mergePacedLines(CLOSING_PACED, GUIDE_VOICE, "closing"));

  return allItems;
}

export function assembleSegments(
  items: TTSItem[],
  audioResults: string[]
): SessionSegment[] {
  return items.map((item, i) => ({
    type: item.segType,
    text: item.displayText,
    voice: item.voice,
    audioBase64: audioResults[i],
    pauseAfter: item.pauseAfter > 0 ? item.pauseAfter : undefined,
  }));
}
