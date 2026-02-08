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
import { Progress, GeneratedSession, ContentResult, PacedLine } from "@/lib/types";
import { buildTTSItems, assembleSegments } from "@/lib/session-assembly";

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

      const PACING_BATCH = 5;
      const AUDIO_BATCH = 30;

      async function post(url: string, body: Record<string, unknown>) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, apiKey: apiKeyState }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          if (res.status === 401) {
            clearApiKey();
            setApiKeyState(null);
            throw new Error("INVALID_KEY");
          }
          throw new Error(err.error || `API ${res.status}`);
        }
        return res.json();
      }

      try {
        // Step 1: Generate text content (~15s)
        setGenProgress({ step: "Crafting your session...", current: 1, total: 3 });
        const content: ContentResult = await post("/api/session/content", {
          bookId: selectedBook.id,
          chapterId: selectedChapter.id,
          userIntention: intention,
        });

        // Step 2: Pacing — batch items and run batches in parallel
        setGenProgress({ step: "Adding breathing pauses...", current: 2, total: 3 });
        const pacingItems = [
          { text: content.intro, segmentType: "intro" },
          ...content.passages.map((p) => ({ text: p, segmentType: "passage" })),
          ...content.nudges.map((n) => ({ text: n, segmentType: "nudge" })),
        ];

        const pacingBatches: typeof pacingItems[] = [];
        for (let i = 0; i < pacingItems.length; i += PACING_BATCH) {
          pacingBatches.push(pacingItems.slice(i, i + PACING_BATCH));
        }

        const pacingResponses = await Promise.all(
          pacingBatches.map((batch) =>
            post("/api/session/pacing", { items: batch })
          )
        );
        const allPaced: PacedLine[][] = pacingResponses.flatMap((r) => r.results);

        // Split pacing results back into intro / passages / nudges
        const introPaced = allPaced[0];
        const passagesPaced = allPaced.slice(1, 1 + content.passages.length);
        const nudgesPaced = allPaced.slice(1 + content.passages.length);

        // Build TTS items (client-side, instant)
        const ttsItems = buildTTSItems(introPaced, passagesPaced, nudgesPaced);
        console.log(`TTS items to generate: ${ttsItems.length}`);

        // Step 3: Audio — batch items and run batches in parallel
        setGenProgress({ step: "Recording audio...", current: 3, total: 3 });
        const audioBatches: { text: string; voice: "nova" | "onyx" }[][] = [];
        for (let i = 0; i < ttsItems.length; i += AUDIO_BATCH) {
          audioBatches.push(
            ttsItems.slice(i, i + AUDIO_BATCH).map((item) => ({
              text: item.text,
              voice: item.voice,
            }))
          );
        }

        const audioResponses = await Promise.all(
          audioBatches.map((batch) =>
            post("/api/session/audio", { items: batch })
          )
        );
        const allAudio: string[] = audioResponses.flatMap((r) => r.results);

        // Assemble final session
        const segments = assembleSegments(ttsItems, allAudio);
        console.log("Segments received:", segments.length);

        setSession({
          segments,
          bookTitle: selectedBook.title,
          chapterTitle: selectedChapter.title,
        });
        setView("playing");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg === "INVALID_KEY") {
          alert("Invalid API key. Please enter a valid OpenAI key.");
        } else {
          console.error("Session generation failed:", msg);
          alert(`Failed to generate session: ${msg}`);
        }
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
