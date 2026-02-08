import meditationsData from "./books/meditations.json";
import siddharthaData from "./books/siddhartha.json";
import artOfWarData from "./books/art-of-war.json";
import { Book } from "./types";

export const books: Record<string, Book> = {
  meditations: meditationsData as Book,
  siddhartha: siddharthaData as Book,
  "art-of-war": artOfWarData as Book,
};

export function getBookList() {
  return Object.values(books).map(({ id, title, author, description, chapters }) => ({
    id,
    title,
    author,
    description,
    chapterCount: chapters.length,
  }));
}
