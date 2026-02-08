"use client";

import { useEffect, useState } from "react";

interface CompletionCelebrationProps {
  bookTitle: string;
  chapterTitle: string;
  onContinue: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function CompletionCelebration({
  bookTitle,
  chapterTitle,
  onContinue,
}: CompletionCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Generate floating particles
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[70vh] space-y-8 overflow-hidden">
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      <div
        className={`relative z-10 text-center space-y-6 transition-all duration-1000 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        {/* Bloom ring */}
        <div className="mx-auto relative w-32 h-32">
          <div
            className="absolute inset-0 rounded-full bg-emerald-500/10"
            style={{ animation: "bloom 3s ease-out infinite" }}
          />
          <div
            className="absolute inset-4 rounded-full bg-emerald-500/20"
            style={{ animation: "bloom 3s ease-out 0.5s infinite" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="40"
              height="40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="text-emerald-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Session Complete</h2>
          <p className="text-sm text-white/50">
            {bookTitle} &middot; {chapterTitle}
          </p>
        </div>

        <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
          Take a moment to notice how you feel. The stillness you cultivated is
          yours to carry forward.
        </p>

        <button
          onClick={onContinue}
          className="mt-4 rounded-xl bg-white/10 px-8 py-3 text-sm font-medium text-white transition-all hover:bg-white/20"
        >
          Return to Library
        </button>
      </div>

      <style jsx>{`
        @keyframes float {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-20px);
          }
        }
        @keyframes bloom {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
