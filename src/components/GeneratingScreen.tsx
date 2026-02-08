"use client";

interface GeneratingScreenProps {
  step: string;
  current: number;
  total: number;
}

export default function GeneratingScreen({
  step,
  current,
  total,
}: GeneratingScreenProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Breathing animation */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-16 h-16 rounded-full bg-white/10"
            style={{
              animation: "breathe 4s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-white">
          Preparing your session
        </h2>
        <p className="text-sm text-white/50">{step}</p>
      </div>

      <div className="w-64">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/60 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs text-white/30">
          {current} / {total}
        </p>
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%,
          100% {
            transform: scale(0.8);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
