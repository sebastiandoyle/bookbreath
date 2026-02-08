"use client";

import { useState, useEffect } from "react";
import { INTENTION_PROMPTS } from "@/lib/prompts";

interface IntentionInputProps {
  bookTitle: string;
  chapterTitle: string;
  onSubmit: (intention: string) => void;
  onBack: () => void;
}

export default function IntentionInput({
  bookTitle,
  chapterTitle,
  onSubmit,
  onBack,
}: IntentionInputProps) {
  const [intention, setIntention] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * INTENTION_PROMPTS.length));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intention.trim()) {
      onSubmit(intention.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <button
          onClick={onBack}
          className="mx-auto mb-4 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
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
        <p className="text-sm text-white/40">
          {bookTitle} &middot; {chapterTitle}
        </p>
        <h2 className="text-2xl font-semibold text-white">
          {INTENTION_PROMPTS[promptIndex]}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <textarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="Type freely..."
          rows={3}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none transition-colors"
          autoFocus
        />
        <button
          type="submit"
          disabled={!intention.trim()}
          className="w-full rounded-xl bg-white/90 px-6 py-3 font-medium text-black transition-all hover:bg-white disabled:opacity-30 disabled:hover:bg-white/90"
        >
          Begin Session
        </button>
      </form>
    </div>
  );
}
