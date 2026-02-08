import { books } from "@/lib/books";

export async function GET() {
  const bookList = Object.values(books).map(
    ({ id, title, author, description, chapters }) => ({
      id,
      title,
      author,
      description,
      chapters: chapters.map(({ id, title }) => ({ id, title })),
    })
  );

  return Response.json(bookList);
}
