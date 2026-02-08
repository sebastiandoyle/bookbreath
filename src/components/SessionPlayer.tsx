"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SessionSegment } from "@/lib/types";

interface SessionPlayerProps {
  segments: SessionSegment[];
  bookTitle: string;
  chapterTitle: string;
  onComplete: () => void;
}

export default function SessionPlayer({
  segments,
  bookTitle,
  chapterTitle,
  onComplete,
}: SessionPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const binauralRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  const segment = segments[currentIndex];
  const passageCount = segments.filter((s) => s.type === "passage").length;
  const currentPassage =
    segments.slice(0, currentIndex + 1).filter((s) => s.type === "passage")
      .length || 0;

  const playSegment = useCallback(
    (index: number) => {
      if (index >= segments.length) {
        onComplete();
        return;
      }

      const seg = segments[index];
      if (!seg.audioBase64) return;

      setIsPausing(false);
      const audio = new Audio(`data:audio/mpeg;base64,${seg.audioBase64}`);
      audioRef.current = audio;

      audio.onended = () => {
        const pauseDuration = seg.pauseAfter;
        if (pauseDuration && pauseDuration > 0) {
          // Silence gap — binaural beats continue, visual cue shown
          setIsPausing(true);
          pauseTimerRef.current = setTimeout(() => {
            setIsPausing(false);
            setCurrentIndex(index + 1);
            playSegment(index + 1);
          }, pauseDuration * 1000);
        } else {
          setCurrentIndex(index + 1);
          playSegment(index + 1);
        }
      };

      audio.play().catch(console.error);
    },
    [segments, onComplete]
  );

  const startSession = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setIsPlaying(true);

    // Start binaural beats
    if (binauralRef.current) {
      binauralRef.current.volume = 0.15;
      binauralRef.current.loop = true;
      binauralRef.current.play().catch(console.error);
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    playSegment(0);
  }, [playSegment]);

  const togglePlayPause = () => {
    if (!hasStartedRef.current) {
      startSession();
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      binauralRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      setIsPlaying(false);
    } else {
      if (isPausing) {
        // Was in a silence gap when paused — resume the gap
        // For simplicity, just advance to next segment
        setIsPausing(false);
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        playSegment(nextIndex);
      } else {
        audioRef.current?.play().catch(console.error);
      }
      binauralRef.current?.play().catch(console.error);
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      audioRef.current?.pause();
      binauralRef.current?.pause();
    };
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const segmentLabel = () => {
    if (!segment) return "";
    if (isPausing) return "Breathe";
    switch (segment.type) {
      case "intro":
        return "Body Scan & Breathing";
      case "passage":
        return `Passage ${currentPassage} of ${passageCount}`;
      case "nudge":
        return "Gentle Attention Check";
      case "closing":
        return "Session Closing";
    }
  };

  const segmentColor = () => {
    if (!segment) return "text-white/50";
    if (isPausing) return "text-blue-300";
    switch (segment.type) {
      case "intro":
        return "text-blue-400";
      case "passage":
        return "text-white/70";
      case "nudge":
        return "text-amber-400";
      case "closing":
        return "text-emerald-400";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
      <audio ref={binauralRef} src="/audio/binaural-beats.mp3" preload="auto" />

      <div className="text-center space-y-1">
        <p className="text-xs text-white/30 uppercase tracking-wider">
          {bookTitle}
        </p>
        <p className="text-sm text-white/50">{chapterTitle}</p>
      </div>

      {/* Visualization */}
      <div className="relative flex items-center justify-center w-48 h-48">
        <div
          className={`absolute inset-0 rounded-full transition-all duration-1000 ${
            isPlaying ? "bg-white/5" : "bg-white/3"
          }`}
          style={{
            animation: isPlaying
              ? isPausing
                ? "breathe 4s ease-in-out infinite"
                : "breathe 4s ease-in-out infinite"
              : "none",
          }}
        />
        <div className="relative text-center z-10">
          <p className="text-3xl font-light text-white">
            {formatTime(elapsed)}
          </p>
          <p className={`mt-1 text-xs font-medium ${segmentColor()}`}>
            {segmentLabel()}
          </p>
        </div>
      </div>

      {/* Segment progress dots */}
      <div className="flex gap-1 flex-wrap justify-center max-w-xs">
        {segments.map((seg, i) => {
          const isBreak = seg.pauseAfter && seg.pauseAfter > 0;
          const isNudge = seg.type === "nudge";
          let dotColor: string;

          if (i === currentIndex) {
            dotColor = isBreak ? "bg-blue-400" : isNudge ? "bg-amber-400" : "bg-white";
          } else if (i < currentIndex) {
            dotColor = isBreak ? "bg-blue-400/50" : isNudge ? "bg-amber-400/40" : "bg-white/30";
          } else {
            dotColor = isBreak ? "bg-blue-400/30" : isNudge ? "bg-amber-400/20" : "bg-white/10";
          }

          return (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${dotColor}`}
            />
          );
        })}
      </div>

      {/* Current text / breathing cue — fixed height to prevent layout jumps */}
      <div className="h-16 max-w-md text-center px-4 flex items-start justify-center overflow-hidden">
        {isPausing ? (
          <p className="text-xs text-blue-300/50 leading-relaxed animate-pulse">
            ...
          </p>
        ) : segment && isPlaying ? (
          <p className="text-xs text-white/30 leading-relaxed line-clamp-2">
            {segment.text.slice(0, 150)}
            {segment.text.length > 150 ? "..." : ""}
          </p>
        ) : null}
      </div>

      {/* Controls */}
      <button
        onClick={togglePlayPause}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black transition-all hover:bg-white hover:scale-105 active:scale-95"
      >
        {isPlaying ? (
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <style jsx>{`
        @keyframes breathe {
          0%,
          100% {
            transform: scale(0.95);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
