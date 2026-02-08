"use client";

import { useState } from "react";
import { isValidKeyFormat } from "@/lib/api-key";

interface ApiKeyInputProps {
  onSubmit: (key: string) => void;
}

export default function ApiKeyInput({ onSubmit }: ApiKeyInputProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!isValidKeyFormat(trimmed)) {
      setError("Please enter a valid OpenAI API key (starts with sk-)");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5">
            <span className="text-3xl">📖</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            BookBreath
          </h1>
          <p className="text-sm text-white/40">
            Focused attention meditation with classic literature
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-left space-y-2">
          <p className="text-sm text-white/70 leading-relaxed">
            This app uses OpenAI to generate personalized meditation sessions
            with text-to-speech narration. Paste your API key below to get
            started.
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            Your key is stored only in your browser and sent directly to OpenAI.
            It is never saved on any server.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError("");
              }}
              placeholder="sk-..."
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors font-mono text-sm"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full rounded-xl bg-white/90 px-6 py-3 font-medium text-black transition-all hover:bg-white disabled:opacity-30 disabled:hover:bg-white/90"
          >
            Start Meditating
          </button>
        </form>

        <p className="text-xs text-white/30">
          Need a key?{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 underline hover:text-white/70 transition-colors"
          >
            Get one from OpenAI
          </a>
        </p>
      </div>
    </div>
  );
}
