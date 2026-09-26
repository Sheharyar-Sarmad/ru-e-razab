"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
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
  media: MediaFile[];
}

export default function KalamMediaGallery({ media }: Props) {
  const [lightbox, setLightbox] = useState<MediaFile | null>(null);

  if (!media || media.length === 0) return null;

  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");
  const audios = media.filter((m) => m.type === "audio");
  const docs = media.filter((m) => m.type === "document");

  return (
    <div className="mt-12 space-y-8">
      {/* ============ IMAGES ============ */}
      {images.length > 0 && (
        <section>
          <SectionLabel urdu="تصاویر" english="Images" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((m, i) => (
              <motion.button
                key={i}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLightbox(m)}
                className="relative aspect-square overflow-hidden rounded-2xl border shadow-sm"
                style={{ borderColor: THEME.border }}
              >
                <Image
                  src={m.thumbnail || m.url}
                  alt={m.alt || ""}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  quality={95}
                  className="object-cover"
                />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* ============ VIDEOS ============ */}
      {videos.length > 0 && (
        <section>
          <SectionLabel urdu="ویڈیوز" english="Videos" />
          <div className="space-y-4">
            {videos.map((m, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border shadow-sm"
                style={{ borderColor: THEME.border }}
              >
                <video
                  src={m.url}
                  controls
                  preload="metadata"
                  poster={m.thumbnail}
                  className="h-auto w-full"
                />
                {m.filename && (
                  <p
                    className="px-4 py-2 font-outfit text-xs"
                    style={{ color: THEME.mutedText }}
                  >
                    {m.filename}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ AUDIOS ============ */}
      {audios.length > 0 && (
        <section>
          <SectionLabel urdu="آڈیو" english="Audio" />
          <div className="space-y-3">
            {audios.map((m, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4 shadow-sm"
                style={{
                  borderColor: THEME.border,
                  backgroundColor: "rgba(255,255,255,0.7)",
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="font-outfit text-sm font-semibold"
                    style={{ color: THEME.darkText }}
                  >
                    {m.filename || `Audio ${i + 1}`}
                  </span>
                  {m.duration && (
                    <span
                      className="font-outfit text-xs"
                      style={{ color: THEME.mutedText }}
                    >
                      {Math.floor(m.duration / 60)}:
                      {String(Math.floor(m.duration % 60)).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <audio src={m.url} controls preload="metadata" className="w-full" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ DOCUMENTS ============ */}
      {docs.length > 0 && (
        <section>
          <SectionLabel urdu="دستاویزات" english="Documents" />
          <div className="space-y-2">
            {docs.map((m, i) => (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:scale-[1.01]"
                style={{
                  borderColor: THEME.border,
                  backgroundColor: "rgba(255,255,255,0.7)",
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${THEME.darkOrange}15` }}
                >
                  <svg
                    className="h-5 w-5"
                    style={{ color: THEME.darkOrange }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-outfit text-sm font-semibold"
                    style={{ color: THEME.darkText }}
                  >
                    {m.filename || "Document"}
                  </p>
                  <p
                    className="truncate font-outfit text-xs"
                    style={{ color: THEME.mutedText }}
                  >
                    {m.mimeType || "Click to open"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ============ LIGHTBOX ============ */}
      <AnimatePresence>
        {lightbox && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[81] flex items-center justify-center p-4"
              onClick={() => setLightbox(null)}
            >
              <div
                className="relative max-h-[90vh] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={lightbox.url}
                  alt={lightbox.alt || ""}
                  className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                />
              </div>
              <button
                onClick={() => setLightbox(null)}
                aria-label="Close"
                className="absolute right-6 top-6 rounded-full bg-white/10 p-3 backdrop-blur-md transition-opacity hover:opacity-80"
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ urdu, english }: { urdu: string; english: string }) {
  return (
    <div className="mb-4 flex items-center gap-3" dir="rtl">
      <span
        className="font-urdu text-lg font-semibold leading-[1.8]"
        style={{ color: THEME.darkText }}
      >
        {urdu}
      </span>
      <span
        className="font-outfit text-[10px] font-bold uppercase tracking-[0.25em] opacity-60"
        style={{ color: THEME.mutedText }}
        dir="ltr"
      >
        {english}
      </span>
      <span
        className="h-[2px] flex-1 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${THEME.border}, transparent)`,
        }}
      />
    </div>
  );
}