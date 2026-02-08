// Client-side book metadata (no full content — that stays server-side)

export interface BookMeta {
  id: string;
  title: string;
  author: string;
  description: string;
  chapters: { id: string; title: string }[];
}

export const booksMeta: BookMeta[] = [
  {
    id: "meditations",
    title: "Meditations",
    author: "Marcus Aurelius",
    description:
      "Stoic reflections on life, duty, and the nature of the mind — written as personal notes by a Roman emperor.",
    chapters: [], // populated dynamically
  },
  {
    id: "siddhartha",
    title: "Siddhartha",
    author: "Hermann Hesse",
    description:
      "A young man's spiritual journey through ancient India, seeking meaning beyond comfort and convention.",
    chapters: [],
  },
  {
    id: "art-of-war",
    title: "The Art of War",
    author: "Sun Tzu",
    description:
      "Ancient wisdom on strategy, conflict, and self-mastery — applicable far beyond the battlefield.",
    chapters: [],
  },
];
