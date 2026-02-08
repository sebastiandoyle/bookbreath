export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
}

export interface PacedLine {
  line: string;
  pause_after_seconds: number;
}

export interface SessionSegment {
  type: "intro" | "passage" | "nudge" | "closing";
  text: string;
  voice: "nova" | "onyx";
  audioBase64: string;
  pauseAfter?: number;
}

export interface GeneratedSession {
  segments: SessionSegment[];
  bookTitle: string;
  chapterTitle: string;
}

export interface Progress {
  [bookId: string]: string[]; // array of completed chapter IDs
}
