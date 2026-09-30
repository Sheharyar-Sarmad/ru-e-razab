"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isUrduScript } from "./KalamFontUtils";

const THEME = {
  strawberryWhite: "#FFF7F4",
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

interface Props {
  type: KalamType;
  content: any;
}

interface VoiceOption {
  name: string;
  lang: string;
  gender: "male" | "female" | "unknown";
  raw: SpeechSynthesisVoice;
}

function guessGender(name: string): "male" | "female" | "unknown" {
  const n = name.toLowerCase();
  const femaleHints = ["female", "zira", "susan", "samantha", "veena", "heera", "swara", "kalpana", "kanya", "shruti", "aditi", "riya", "priya", "swati"];
  const maleHints = ["male", "david", "mark", "ravi", "madhur", "hemant", "arjun", "rishi", "rakesh", "kabir", "prashant"];
  if (femaleHints.some((h) => n.includes(h))) return "female";
  if (maleHints.some((h) => n.includes(h))) return "male";
  return "unknown";
}

function isUrduCapable(lang: string): boolean {
  const l = lang.toLowerCase();
  return l.startsWith("ur") || l.startsWith("hi") || l.startsWith("fa") || l.startsWith("ar") || l.startsWith("pa");
}

function extractLines(type: KalamType, content: any): string[] {
  if (!content) return [];
  if (type === "shair") return Array.isArray(content) ? content.filter(Boolean) : [];
  if (type === "nazm")
    return (content as any[])
      .flatMap((band) => band.shairs || [])
      .flatMap((shair) => shair.lines || [])
      .filter(Boolean);
  return (content as any[]).flatMap((couplet) => couplet.lines || []).filter(Boolean);
}

export default function KalamRecitationPlayer({ type, content }: Props) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [rate, setRate] = useState(0.75);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [supported, setSupported] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lines = useMemo(() => extractLines(type, content), [type, content]);

  /* ---------- Load voices ---------- */
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all || all.length === 0) return;

      const urduCapable = all.filter((v) => isUrduCapable(v.lang));
      const pool = urduCapable.length > 0 ? urduCapable : all;

      const mapped: VoiceOption[] = pool.map((v) => ({
        name: v.name,
        lang: v.lang,
        gender: guessGender(v.name),
        raw: v,
      }));

      setVoices(mapped);
      if (!selectedVoiceName && mapped.length > 0) {
        const preferred = mapped.find((m) => m.gender === "male") ?? mapped[0];
        setSelectedVoiceName(preferred.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredVoices = useMemo(() => {
    if (genderFilter === "all") return voices;
    return voices.filter((v) => v.gender === genderFilter);
  }, [voices, genderFilter]);

  const getSelectedVoice = useCallback((): SpeechSynthesisVoice | null => {
    return voices.find((x) => x.name === selectedVoiceName)?.raw ?? null;
  }, [voices, selectedVoiceName]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
    utteranceRef.current = null;
  }, []);

  const speakLine = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      if (index >= lines.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentLineIndex(-1);
        return;
      }

      const text = lines[index];
      if (!text) return speakLine(index + 1);

      setCurrentLineIndex(index);

      const u = new SpeechSynthesisUtterance(text);
      const voice = getSelectedVoice();
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = 1;

      u.onend = () => setTimeout(() => speakLine(index + 1), 200);
      u.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentLineIndex(-1);
      };

      utteranceRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [lines, rate, getSelectedVoice]
  );

  const play = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    if (window.speechSynthesis.paused && isPaused) {
      window.speechSynthesis.resume();
      return;
    }
    speakLine(0);
  }, [isPaused, speakLine]);

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  useEffect(() => {
    if (isPlaying && !isPaused) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoiceName, rate]);

  if (!supported) return null;

  const currentLine = currentLineIndex >= 0 ? lines[currentLineIndex] : "";
  const currentIsUrdu = isUrduScript(currentLine);

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: THEME.border,
      }}
    >
      {/* Compact header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Play / Pause */}
        {!isPlaying ? (
          <button
            onClick={play}
            disabled={lines.length === 0}
            aria-label="Play"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 disabled:opacity-40"
            style={{
              background: `linear-gradient(135deg, ${THEME.rust}, ${THEME.orangeGlow})`,
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : isPaused ? (
          <button
            onClick={resume}
            aria-label="Resume"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${THEME.emerald}, #065F46)` }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={pause}
            aria-label="Pause"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${THEME.rust}, #7C2D12)` }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          </button>
        )}

        {/* Center: title + line counter */}
        <div className="min-w-0 flex-1" dir="rtl">
          <p
            className="font-urdu truncate text-sm font-bold leading-[1.8]"
            style={{ color: THEME.darkText }}
          >
            کلام بذریعہ صوت
          </p>
          <p
            className="font-outfit truncate text-[10px] uppercase tracking-widest"
            style={{ color: THEME.mutedText }}
            dir="ltr"
          >
            {isPlaying && currentLineIndex >= 0
              ? `${currentLineIndex + 1} / ${lines.length}`
              : `${lines.length} lines`}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label="Toggle controls"
          className="shrink-0 rounded-full p-2 transition-opacity hover:opacity-70"
          style={{ color: THEME.mutedText }}
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Stop */}
        {isPlaying && (
          <button
            onClick={stop}
            aria-label="Stop"
            className="shrink-0 rounded-full border p-2 transition-opacity hover:opacity-70"
            style={{ borderColor: THEME.border, color: THEME.mutedText }}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Live line preview */}
      <AnimatePresence>
        {isPlaying && currentLine && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t px-3 py-3"
            style={{
              borderColor: THEME.border,
              backgroundColor: `${THEME.orangeGlow}06`,
            }}
            dir={currentIsUrdu ? "rtl" : "ltr"}
          >
            <p
              className={
                currentIsUrdu
                  ? "font-urdu line-clamp-2 text-base leading-[2.2]"
                  : "font-outfit line-clamp-2 text-sm leading-[1.6]"
              }
              style={{ color: THEME.darkText }}
            >
              {currentLine}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded controls */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t"
            style={{ borderColor: THEME.border }}
          >
            <div className="space-y-3 p-3">
              {/* Gender chips */}
              <div className="flex gap-1.5" dir="rtl">
                {(
                  [
                    { key: "male", label: "مرد" },
                    { key: "female", label: "عورت" },
                    { key: "all", label: "سب" },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setGenderFilter(g.key)}
                    className="font-urdu flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all"
                    style={{
                      borderColor:
                        genderFilter === g.key ? THEME.rust : THEME.border,
                      backgroundColor:
                        genderFilter === g.key ? `${THEME.rust}10` : "#FFF",
                      color:
                        genderFilter === g.key ? THEME.rust : THEME.mutedText,
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              {/* Voice select */}
              <select
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="font-outfit w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
                style={{
                  borderColor: THEME.border,
                  backgroundColor: "#FFF",
                  color: THEME.darkText,
                }}
                dir="ltr"
              >
                {filteredVoices.length === 0 && (
                  <option value="">No voices</option>
                )}
                {filteredVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>

              {/* Speed */}
              <div>
                <div
                  className="font-outfit mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: THEME.mutedText }}
                >
                  <span>Speed</span>
                  <span style={{ color: THEME.rust }}>{rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.2}
                  step={0.05}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-[#9A3412]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}