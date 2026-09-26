"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const THEME = {
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export interface MediaFile {
  _id?: string;
  url: string;
  type: "image" | "video" | "audio" | "document";
  mimeType?: string;
  filename?: string;
  thumbnail?: string;
  duration?: number;
  alt?: string;
}

interface Props {
  media?: MediaFile[];
}

export default function KalamMediaSection({ media }: Props) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<MediaFile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => media ?? [], [media]);
  const total = items.length;

  const goPrev = () => setCurrent((c) => (c - 1 + total) % total);
  const goNext = () => setCurrent((c) => (c + 1) % total);

  /* ---------- Empty state ---------- */
  if (total === 0) {
    return (
      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: THEME.border,
        }}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: THEME.border }} dir="rtl">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${THEME.rust}10` }}
          >
            <svg className="h-4 w-4" style={{ color: THEME.rust }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span className="font-urdu text-sm font-bold leading-[1.8]" style={{ color: THEME.darkText }}>
            ذرائع ابلاغ
          </span>
        </div>
        <div className="px-4 py-10 text-center" dir="rtl">
          <p className="font-urdu text-sm leading-[2]" style={{ color: THEME.mutedText }}>
            اس کلام کے لیے کوئی میڈیا دستیاب نہیں
          </p>
        </div>
      </div>
    );
  }

  const active = items[current];

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: THEME.border,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: THEME.border }}
        dir="rtl"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `${THEME.rust}10` }}
          >
            <svg className="h-4 w-4" style={{ color: THEME.rust }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span className="font-urdu text-sm font-bold leading-[1.8]" style={{ color: THEME.darkText }}>
            ذرائع ابلاغ
          </span>
        </div>

        <span
          className="font-outfit rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums"
          style={{
            backgroundColor: `${THEME.orangeGlow}12`,
            color: THEME.orangeGlow,
          }}
          dir="ltr"
        >
          {current + 1} / {total}
        </span>
      </div>

      {/* Active media viewer */}
      <div
        className="relative w-full"
        style={{ backgroundColor: "#FAF3EE" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-video w-full"
          >
            {active.type === "image" && (
              <Image
                src={active.url}
                alt={active.alt || ""}
                fill
                sizes="(max-width: 1024px) 100vw, 800px"
                quality={90}
                className="object-contain"
              />
            )}

            {active.type === "video" && (
              <video
                key={active.url}
                src={active.url}
                controls
                preload="metadata"
                poster={active.thumbnail}
                className="h-full w-full object-contain"
              />
            )}

            {active.type === "audio" && (
              <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
                {/* Animated audio icon */}
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${THEME.rust}15, ${THEME.orangeGlow}15)`,
                    border: `2px solid ${THEME.rust}30`,
                  }}
                >
                  <svg
                    className="h-9 w-9"
                    style={{ color: THEME.rust }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                    />
                  </svg>
                </motion.div>

                <div className="w-full max-w-md text-center" dir="rtl">
                  <p
                    className="font-urdu truncate text-sm font-semibold leading-[1.8]"
                    style={{ color: THEME.darkText }}
                  >
                    {active.filename || "آڈیو ریکارڈنگ"}
                  </p>
                  {active.duration && (
                    <p
                      className="font-outfit mt-1 text-xs"
                      style={{ color: THEME.mutedText }}
                      dir="ltr"
                    >
                      {Math.floor(active.duration / 60)}:
                      {String(Math.floor(active.duration % 60)).padStart(2, "0")}
                    </p>
                  )}
                </div>

                <audio
                  key={active.url}
                  src={active.url}
                  controls
                  preload="metadata"
                  className="w-full max-w-md"
                />
              </div>
            )}

            {active.type === "document" && (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${THEME.rust}10` }}
                >
                  <svg
                    className="h-7 w-7"
                    style={{ color: THEME.rust }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </div>
                <p
                  className="font-outfit text-sm font-semibold"
                  style={{ color: THEME.darkText }}
                >
                  {active.filename || "Document"}
                </p>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-outfit rounded-full px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:scale-105"
                  style={{ backgroundColor: THEME.rust }}
                >
                  Open Document
                </a>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next buttons */}
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Previous media"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2.5 shadow-lg backdrop-blur-md transition-all hover:scale-105"
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                color: THEME.rust,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goNext}
              aria-label="Next media"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2.5 shadow-lg backdrop-blur-md transition-all hover:scale-105"
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                color: THEME.rust,
                border: `1px solid ${THEME.border}`,
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnails strip */}
      {total > 1 && (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto border-t p-3"
          style={{ borderColor: THEME.border }}
        >
          {items.map((m, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Show media ${i + 1}`}
              className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all"
              style={{
                borderColor: current === i ? THEME.rust : "transparent",
                boxShadow: current === i ? `0 4px 12px -4px ${THEME.rust}60` : "none",
              }}
            >
              {m.type === "image" && (
                <Image
                  src={m.thumbnail || m.url}
                  alt=""
                  fill
                  sizes="96px"
                  quality={75}
                  className="object-cover"
                />
              )}
              {m.type === "video" && (
                <>
                  {m.thumbnail ? (
                    <Image
                      src={m.thumbnail}
                      alt=""
                      fill
                      sizes="96px"
                      quality={75}
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ backgroundColor: `${THEME.rust}15` }}
                    >
                      <svg className="h-6 w-6" style={{ color: THEME.rust }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </>
              )}
              {m.type === "audio" && (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: `${THEME.emerald}15` }}
                >
                  <svg className="h-6 w-6" style={{ color: THEME.emerald }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M9 19V6l12-3v13" />
                  </svg>
                </div>
              )}
              {m.type === "document" && (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: `${THEME.rust}10` }}
                >
                  <svg className="h-6 w-6" style={{ color: THEME.rust }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  </svg>
                </div>
              )}

              {/* Type indicator */}
              <span
                className="absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase text-white"
                style={{
                  backgroundColor:
                    m.type === "video"
                      ? THEME.rust
                      : m.type === "audio"
                      ? THEME.emerald
                      : THEME.orangeGlow,
                }}
              >
                {m.type.slice(0, 3)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}