"use client";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  description: string;
  chapterCount: number;
  completedChapters: number;
  onSelect: (bookId: string) => void;
}

const bookEmojis: Record<string, string> = {
  meditations: "🏛️",
  siddhartha: "🌿",
  "art-of-war": "⚔️",
};

const bookGradients: Record<string, string> = {
  meditations: "from-stone-800 to-stone-600",
  siddhartha: "from-emerald-800 to-teal-600",
  "art-of-war": "from-red-900 to-amber-700",
};

export default function BookCard({
  id,
  title,
  author,
  description,
  chapterCount,
  completedChapters,
  onSelect,
}: BookCardProps) {
  const progress = chapterCount > 0 ? completedChapters / chapterCount : 0;

  return (
    <button
      onClick={() => onSelect(id)}
      className={`group relative w-full rounded-2xl bg-gradient-to-br ${bookGradients[id] || "from-gray-800 to-gray-600"} p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
    >
      <div className="mb-4 text-4xl">{bookEmojis[id] || "📖"}</div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/70">{author}</p>
      <p className="mt-3 text-sm text-white/60 leading-relaxed">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/80 transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-white/50">
          {completedChapters}/{chapterCount}
        </span>
      </div>
    </button>
  );
}
