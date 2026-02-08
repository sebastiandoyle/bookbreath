"use client";

import { useState, useEffect, useCallback } from "react";
import BookCard from "@/components/BookCard";
import ChapterList from "@/components/ChapterList";
import IntentionInput from "@/components/IntentionInput";
import GeneratingScreen from "@/components/GeneratingScreen";
import SessionPlayer from "@/components/SessionPlayer";
import CompletionCelebration from "@/components/CompletionCelebration";
import ApiKeyInput from "@/components/ApiKeyInput";
import { getProgress, markChapterComplete } from "@/lib/progress";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/api-key";
import { Progress, GeneratedSession } from "@/lib/types";

interface BookMeta {
  id: string;
  title: string;
  author: string;
  description: string;
  chapters: { id: string; title: string }[];
}

type View =
  | "library"
  | "chapters"
  | "intention"
  | "generating"
  | "playing"
  | "complete";

export default function Home() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [view, setView] = useState<View>("library");
  const [selectedBook, setSelectedBook] = useState<BookMeta | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({
    step: "",
    current: 0,
    total: 0,
  });
  const [session, setSession] = useState<GeneratedSession | null>(null);
  const [apiKeyState, setApiKeyState] = useState<string | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);

  useEffect(() => {
    setApiKeyState(getApiKey());
    setKeyChecked(true);
    setProgress(getProgress());
    fetch("/api/books")
      .then((r) => r.json())
      .then(setBooks)
      .catch(console.error);
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    setApiKeyState(key);
  };

  const handleClearKey = () => {
    clearApiKey();
    setApiKeyState(null);
  };

  const handleSelectBook = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) {
      setSelectedBook(book);
      setView("chapters");
    }
  };

  const handleSelectChapter = (chapterId: string) => {
    const chapter = selectedBook?.chapters.find((c) => c.id === chapterId);
    if (chapter) {
      setSelectedChapter(chapter);
      setView("intention");
    }
  };

  const handleSubmitIntention = useCallback(
    async (intention: string) => {
      if (!selectedBook || !selectedChapter || isGenerating || !apiKeyState) return;

      setIsGenerating(true);
      setView("generating");
      setGenProgress({ step: "Starting...", current: 0, total: 1 });

      try {
        const res = await fetch("/api/generate-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: selectedBook.id,
            chapterId: selectedChapter.id,
            userIntention: intention,
            apiKey: apiKeyState,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: res.statusText }));
          if (res.status === 401) {
            clearApiKey();
            setApiKeyState(null);
            alert("Invalid API key. Please enter a valid OpenAI key.");
            return;
          }
          throw new Error(errBody.error || `API ${res.status}`);
        }

        const text = await res.text();
        console.log("Response size:", (text.length / 1024 / 1024).toFixed(2), "MB");
        const data: GeneratedSession = JSON.parse(text);
        console.log("Segments received:", data.segments?.length);
        setSession(data);
        setView("playing");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Session generation failed:", msg);
        alert(`Failed to generate session: ${msg}`);
        setView("intention");
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedBook, selectedChapter, isGenerating, apiKeyState]
  );

  const handleSessionComplete = useCallback(() => {
    if (selectedBook && selectedChapter) {
      const updated = markChapterComplete(selectedBook.id, selectedChapter.id);
      setProgress(updated);
    }
    setView("complete");
  }, [selectedBook, selectedChapter]);

  const handleReturnToLibrary = () => {
    setView("library");
    setSelectedBook(null);
    setSelectedChapter(null);
    setSession(null);
  };

  if (!keyChecked) return null;
  if (!apiKeyState) {
    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <ApiKeyInput onSubmit={handleSaveKey} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="mx-auto max-w-lg">
        {view === "library" && (
          <div className="space-y-6">
            <div className="text-center space-y-2 pt-8 pb-4">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                BookBreath
              </h1>
              <p className="text-sm text-white/40">
                Focus your attention. Listen deeply.
              </p>
              <button
                onClick={handleClearKey}
                className="text-xs text-white/20 hover:text-white/40 transition-colors"
              >
                Change API key
              </button>
            </div>

            <div className="space-y-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  description={book.description}
                  chapterCount={book.chapters.length}
                  completedChapters={
                    (progress[book.id] || []).length
                  }
                  onSelect={handleSelectBook}
                />
              ))}
            </div>
          </div>
        )}

        {view === "chapters" && selectedBook && (
          <ChapterList
            bookTitle={selectedBook.title}
            chapters={selectedBook.chapters.map((c) => ({
              ...c,
              content: "",
            }))}
            completedChapterIds={progress[selectedBook.id] || []}
            onSelectChapter={handleSelectChapter}
            onBack={() => setView("library")}
          />
        )}

        {view === "intention" && selectedBook && selectedChapter && (
          <IntentionInput
            bookTitle={selectedBook.title}
            chapterTitle={selectedChapter.title}
            onSubmit={handleSubmitIntention}
            onBack={() => setView("chapters")}
          />
        )}

        {view === "generating" && (
          <GeneratingScreen
            step={genProgress.step}
            current={genProgress.current}
            total={genProgress.total}
          />
        )}

        {view === "playing" && session && (
          <SessionPlayer
            segments={session.segments}
            bookTitle={session.bookTitle}
            chapterTitle={session.chapterTitle}
            onComplete={handleSessionComplete}
          />
        )}

        {view === "complete" && selectedBook && selectedChapter && (
          <CompletionCelebration
            bookTitle={selectedBook.title}
            chapterTitle={selectedChapter.title}
            onContinue={handleReturnToLibrary}
          />
        )}
      </div>
    </main>
  );
}
