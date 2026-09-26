"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/api";
import { isUrduScript } from "./KalamFontUtils";

const THEME = {
  strawberryWhite: "#FFF7F4",
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
  surface: "#FFFCFA",
};

interface Meaning {
  urdu: string;
  pronunciation: string;
  meaningUrdu: string;
  meaningEnglish: string;
  inContext: string;
}

interface Props {
  word: string;
  fullLine: string;
  prefetchDelayMs?: number;
}

/* =========================================================
   GLOBAL BATCHER
========================================================= */
let currentOpenId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

function broadcastOpen(id: string | null) {
  currentOpenId = id;
  listeners.forEach((fn) => fn(id));
}

function subscribe(fn: (id: string | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* =========================================================
   SCRIPT SPLITTER
========================================================= */
interface TextSegment {
  text: string;
  isUrdu: boolean;
}

function splitMixedContent(text: string | undefined | null): TextSegment[] {
  if (!text) return [];

  const URDU_RX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const NEUTRAL_RX = /[\s\u200B-\u200D\uFEFF.,!?؛:;'"()\[\]{}<>«»–—\-\/\\|]/;

  const segments: TextSegment[] = [];
  let buffer = "";
  let currentScript: boolean | null = null;

  for (const char of text) {
    const isUrduChar = URDU_RX.test(char);
    const isNeutral = NEUTRAL_RX.test(char);

    if (isNeutral) {
      if (currentScript !== null) buffer += char;
      continue;
    }

    if (currentScript === null) {
      currentScript = isUrduChar;
      buffer += char;
    } else if (currentScript === isUrduChar) {
      buffer += char;
    } else {
      const trimmed = buffer.trim();
      if (trimmed) {
        segments.push({ text: trimmed, isUrdu: currentScript });
      }
      buffer = char;
      currentScript = isUrduChar;
    }
  }

  const trimmed = buffer.trim();
  if (trimmed) {
    segments.push({ text: trimmed, isUrdu: currentScript ?? false });
  }

  return segments;
}

/* =========================================================
   SEGMENTED TEXT
   Nastaliq script needs:
   - tall line-height (2.8+)
   - vertical padding for deep descenders
   - overflow: visible so glyphs never get clipped
========================================================= */
function SegmentedText({
  text,
  variant = "body",
}: {
  text: string | undefined | null;
  variant?: "body" | "context";
}) {
  const segments = splitMixedContent(text);
  if (segments.length === 0) return null;

  const isContext = variant === "context";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isContext ? "14px" : "12px",
        width: "100%",
        maxWidth: "100%",
        // ✅ NEVER clip — Nastaliq extends way beyond normal line box
        overflow: "visible",
      }}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          dir={seg.isUrdu ? "rtl" : "ltr"}
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            // ✅ Clip horizontally but never vertically
            overflowY: "visible",
            overflowX: "visible",
            // ✅ Urdu needs vertical padding so ascenders/descenders fit
            paddingTop: seg.isUrdu ? "14px" : "0px",
            paddingBottom: seg.isUrdu ? "20px" : "4px",
          }}
        >
          <p
            className={
              seg.isUrdu
                ? isContext
                  ? "font-urdu text-base sm:text-lg"
                  : "font-urdu text-lg sm:text-xl"
                : isContext
                ? "font-outfit text-sm sm:text-base"
                : "font-outfit text-base"
            }
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              margin: 0,
              padding: 0,
              // ✅ THE critical fix — 3.0 line-height for Nastaliq
              //    Standard 2.2 clips دیوار / پیار / ر
              lineHeight: seg.isUrdu ? 3.0 : isContext ? 1.75 : 1.65,
              color: seg.isUrdu ? THEME.darkText : THEME.mutedText,
              textAlign: seg.isUrdu ? "right" : "left",
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              // ✅ Never clip Urdu glyphs
              overflow: "visible",
            }}
          >
            {seg.text}
          </p>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   MEANING PANEL
========================================================= */
function MeaningPanel({
  word,
  meaning,
  loading,
  onClose,
}: {
  word: string;
  meaning: Meaning | null;
  loading: boolean;
  onClose: () => void;
}) {
  const displayWord = meaning?.urdu || word;
  const wordIsUrdu = isUrduScript(displayWord);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-1/2 z-[100] -translate-x-1/2"
      style={{
        top: "5.5rem",
        // ✅ Wider on desktop, full width on mobile
        width: "min(96vw, 900px)",
        maxWidth: "calc(100vw - 1rem)",
        // ✅ THE KEY FIX — never exceeds 80% of the viewport
        maxHeight: "80vh",
        boxSizing: "border-box",
        // ✅ Flex column so header/footer stay pinned, body scrolls
        display: "flex",
        flexDirection: "column",
      }}
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      dir="rtl"
    >
      {/* Accent bar */}
      <div
        className="h-[4px] w-full shrink-0 rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${THEME.rust}, ${THEME.orangeGlow}, ${THEME.rust})`,
        }}
        aria-hidden="true"
      />

      <div
        className="relative flex min-h-0 flex-1 flex-col rounded-b-2xl border border-t-0 shadow-2xl backdrop-blur-xl"
        style={{
          backgroundColor: THEME.surface,
          borderColor: THEME.border,
          boxShadow: `0 24px 60px -20px ${THEME.rust}55, 0 8px 24px -8px rgba(0,0,0,0.12)`,
          boxSizing: "border-box",
          // ✅ Clip rounded corners but allow flex layout
          overflow: "hidden",
        }}
      >
        {/* ============ HEADER (fixed height) ============ */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 sm:px-6"
          style={{ borderColor: THEME.border }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${THEME.rust}10`,
                border: `1px solid ${THEME.rust}20`,
              }}
            >
              <svg
                className="h-5 w-5"
                style={{ color: THEME.rust }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={
                  wordIsUrdu
                    ? "font-urdu truncate text-xl font-bold sm:text-2xl"
                    : "font-outfit truncate text-xl font-bold leading-tight sm:text-2xl"
                }
                style={{
                  color: THEME.rust,
                  lineHeight: wordIsUrdu ? 2.4 : 1.2,
                  paddingTop: wordIsUrdu ? "4px" : "0",
                  paddingBottom: wordIsUrdu ? "4px" : "0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                dir={wordIsUrdu ? "rtl" : "ltr"}
              >
                {displayWord}
              </p>
              {meaning?.pronunciation && (
                <p
                  className="font-outfit mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: THEME.mutedText }}
                  dir="ltr"
                >
                  {meaning.pronunciation}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 transition-all hover:scale-110"
            style={{
              color: THEME.mutedText,
              backgroundColor: `${THEME.border}40`,
            }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ============ BODY (scrolls only if needed) ============ */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
          style={{
            boxSizing: "border-box",
            // Custom thin scrollbar matching theme
            scrollbarWidth: "thin",
            scrollbarColor: `${THEME.rust}40 transparent`,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <span className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: THEME.rust }}
                  />
                ))}
              </span>
              <span
                className="font-urdu text-sm"
                style={{ color: THEME.mutedText }}
              >
                معنی تلاش کر رہے ہیں…
              </span>
            </div>
          ) : meaning ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "22px",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              {/* Meaning (Urdu) */}
              {meaning.meaningUrdu && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    width: "100%",
                  }}
                >
                  <p
                    className="font-outfit text-[9px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: THEME.rust, margin: 0 }}
                    dir="ltr"
                  >
                    Meaning
                  </p>
                  <SegmentedText text={meaning.meaningUrdu} variant="body" />
                </div>
              )}

              {/* English translation */}
              {meaning.meaningEnglish && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    width: "100%",
                  }}
                >
                  <p
                    className="font-outfit text-[9px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: THEME.mutedText, opacity: 0.7, margin: 0 }}
                    dir="ltr"
                  >
                    English
                  </p>
                  <SegmentedText
                    text={meaning.meaningEnglish}
                    variant="body"
                  />
                </div>
              )}

              {/* In-context block */}
              {meaning.inContext && (
                <div
                  className="rounded-xl border"
                  style={{
                    borderColor: `${THEME.orangeGlow}40`,
                    backgroundColor: `${THEME.orangeGlow}06`,
                    padding: "16px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <p
                    className="font-outfit mb-4 text-[9px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: THEME.orangeGlow, margin: 0 }}
                    dir="ltr"
                  >
                    In context
                  </p>
                  <SegmentedText
                    text={meaning.inContext}
                    variant="context"
                  />
                </div>
              )}
            </div>
          ) : (
            <p
              className="font-urdu py-2 text-center text-base"
              style={{ color: THEME.mutedText }}
            >
              معنی دستیاب نہیں
            </p>
          )}
        </div>

        {/* ============ FOOTER (fixed height) ============ */}
        <div
          className="flex shrink-0 items-center justify-between border-t px-5 py-2.5 sm:px-6"
          style={{
            borderColor: THEME.border,
            backgroundColor: `${THEME.strawberryWhite}80`,
          }}
        >
          <span
            className="font-outfit text-[9px] uppercase tracking-[0.25em]"
            style={{ color: THEME.mutedText, opacity: 0.6 }}
            dir="ltr"
          >
            Press Esc to close
          </span>
          <span
            className="font-urdu text-[11px]"
            style={{ color: THEME.mutedText }}
          >
            ادبی لغت
          </span>
        </div>
      </div>
    </motion.div>
  );
}


/* =========================================================
   CLICKABLE WORD
========================================================= */
export default function KalamClickableWord({
  word,
  fullLine,
  prefetchDelayMs = 300,
}: Props) {
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState<Meaning | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const idRef = useRef<string>(`w-${Math.random().toString(36).slice(2)}`);
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordIsUrdu = isUrduScript(word);

  const fetchMeaning = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    try {
      const res = await apiClient.post("/api/client/ai/word-meaning", {
        word,
        fullLine,
      });
      if (res.data?.success && res.data?.data) {
        setMeaning(res.data.data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [fetched, loading, word, fullLine]);

  useEffect(() => {
    const unsub = subscribe((openId) => {
      const shouldBeOpen = openId === idRef.current;
      setOpen(shouldBeOpen);
      if (!shouldBeOpen && !fetched) {
        if (prefetchTimer.current) {
          clearTimeout(prefetchTimer.current);
          prefetchTimer.current = null;
        }
      }
    });
    return unsub;
  }, [fetched]);

  useEffect(() => {
    return () => {
      if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      broadcastOpen(null);
      return;
    }
    broadcastOpen(idRef.current);
    if (!meaning && !loading) {
      fetchMeaning();
    }
  };

  const handleMouseEnter = () => {
    if (!fetched && !loading && !prefetchTimer.current) {
      prefetchTimer.current = setTimeout(() => {
        prefetchTimer.current = null;
        fetchMeaning();
      }, prefetchDelayMs);
    }
  };

  const handleMouseLeave = () => {
    if (prefetchTimer.current) {
      clearTimeout(prefetchTimer.current);
      prefetchTimer.current = null;
    }
  };

  return (
    <>
      <span
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={handleClick}
          aria-label={`Meaning of ${word}`}
          aria-expanded={open}
          className={
            wordIsUrdu
              ? "font-urdu cursor-pointer rounded-md px-0.5 transition-all"
              : "font-outfit cursor-pointer rounded-md px-0.5 transition-all"
          }
          style={{
            color: THEME.darkText,
            backgroundColor: open ? `${THEME.rust}15` : "transparent",
            borderBottom: open
              ? `1px solid ${THEME.rust}`
              : fetched
              ? `1px dotted ${THEME.rust}50`
              : "none",
            // ✅ Tall line-height for Nastaliq word itself
            lineHeight: wordIsUrdu ? 2.4 : 1.4,
            display: "inline-block",
            verticalAlign: "middle",
          }}
        >
          {word}
        </button>
      </span>

      <AnimatePresence>
        {open && (
          <MeaningPanel
            word={word}
            meaning={meaning}
            loading={loading}
            onClose={() => broadcastOpen(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}