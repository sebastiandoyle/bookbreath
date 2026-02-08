"use client";

import { Chapter } from "@/lib/types";

interface ChapterListProps {
  bookTitle: string;
  chapters: Chapter[];
  completedChapterIds: string[];
  onSelectChapter: (chapterId: string) => void;
  onBack: () => void;
}

export default function ChapterList({
  bookTitle,
  chapters,
  completedChapterIds,
  onSelectChapter,
  onBack,
}: ChapterListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-2xl font-semibold text-white">{bookTitle}</h2>
      </div>

      <div className="space-y-2">
        {chapters.map((chapter) => {
          const isCompleted = completedChapterIds.includes(chapter.id);
          return (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter.id)}
              className="w-full flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3.5 text-left transition-all hover:bg-white/10 active:scale-[0.99]"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {isCompleted ? (
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-xs font-medium">
                    {chapters.indexOf(chapter) + 1}
                  </span>
                )}
              </div>
              <span
                className={`text-sm ${isCompleted ? "text-white/50" : "text-white/90"}`}
              >
                {chapter.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
