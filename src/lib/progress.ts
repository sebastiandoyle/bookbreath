import { Progress } from "./types";

const STORAGE_KEY = "genmeditate-progress";

export function getProgress(): Progress {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function markChapterComplete(bookId: string, chapterId: string) {
  const progress = getProgress();
  if (!progress[bookId]) {
    progress[bookId] = [];
  }
  if (!progress[bookId].includes(chapterId)) {
    progress[bookId].push(chapterId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  return progress;
}

export function getCompletedChapters(bookId: string): string[] {
  const progress = getProgress();
  return progress[bookId] || [];
}
