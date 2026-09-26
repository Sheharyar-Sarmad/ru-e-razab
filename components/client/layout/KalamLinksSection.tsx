// components/client/layout/KalamLinksSection.tsx
"use client";

import { motion } from "framer-motion";

const THEME = {
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export interface KalamLink {
  title: string;
  url: string;
  type?: string;
}

interface Props {
  links?: KalamLink[];
}

/* =========================================================
   SCRIPT DETECTION
========================================================= */
function isUrduScript(text: string | undefined | null): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/* =========================================================
   LINK ICON — picks an icon based on type
========================================================= */
function LinkIcon({ type }: { type?: string }) {
  const t = (type || "").toLowerCase();

  if (t === "youtube") {
    return (
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  if (t === "spotify") {
    return (
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    );
  }

  if (t === "wikipedia") {
    return (
      <svg
        className="h-4 w-4"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12.09 2.91C10.08.66 7.14.15 4.56 1.02c-2.72.9-3.94 4.13-2.72 6.42.66 1.24 2.28 2.24 3.94 2.24 1.66 0 3.28-1 3.94-2.24.66-1.24.66-2.72 0-3.96-.9-1.66-1.1-3.34-.53-4.57.9-2.02 2.73-2.02 3.63 0 .57 1.23.37 2.91-.53 4.57-.66 1.24-.66 2.72 0 3.96.66 1.24 2.28 2.24 3.94 2.24 1.66 0 3.28-1 3.94-2.24 1.22-2.29 0-5.52-2.72-6.42-2.58-.87-5.52-.36-7.53 1.89z" />
      </svg>
    );
  }

  if (t === "social") {
    return (
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    );
  }

  // Default: generic link icon
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

/* =========================================================
   LINK TYPE LABEL
========================================================= */
function typeLabel(type?: string): string {
  const t = (type || "").toLowerCase();
  if (t === "youtube") return "YouTube";
  if (t === "spotify") return "Spotify";
  if (t === "wikipedia") return "Wikipedia";
  if (t === "social") return "Social";
  if (t === "website") return "Website";
  if (t === "other") return "Link";
  return "External link";
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function KalamLinksSection({ links = [] }: Props) {
  const hasLinks = Array.isArray(links) && links.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="mt-6 rounded-2xl border p-5 sm:p-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        borderColor: THEME.border,
      }}
      dir="rtl"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${THEME.rust}10` }}
        >
          <svg
            className="h-4 w-4"
            style={{ color: THEME.rust }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
        </div>
        <span
          className="font-urdu text-base font-bold leading-[1.8]"
          style={{ color: THEME.darkText }}
        >
          متعلقہ روابط
        </span>
        <span
          className="font-outfit text-[10px] font-bold uppercase tracking-[0.25em] opacity-60"
          style={{ color: THEME.mutedText }}
          dir="ltr"
        >
          Related Links
        </span>
        {hasLinks && (
          <span
            className="font-outfit rounded-full px-2.5 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: `${THEME.rust}12`,
              color: THEME.rust,
            }}
            dir="ltr"
          >
            {links.length}
          </span>
        )}
        <span
          className="h-[2px] flex-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${THEME.border}, transparent)`,
          }}
        />
      </div>

      {/* Body — either links or fallback */}
      {hasLinks ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {links.map((link, i) => {
            const titleIsUrdu = isUrduScript(link.title);
            return (
              <motion.a
                key={`${link.url}-${i}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all hover:shadow-md"
                style={{
                  borderColor: THEME.border,
                  backgroundColor: "#FFF",
                }}
                dir={titleIsUrdu ? "rtl" : "ltr"}
              >
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: `${THEME.rust}10`,
                    color: THEME.rust,
                  }}
                >
                  <LinkIcon type={link.type} />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`${
                      titleIsUrdu
                        ? "font-urdu text-sm leading-[2]"
                        : "font-outfit text-sm font-semibold"
                    } truncate`}
                    style={{ color: THEME.darkText }}
                  >
                    {link.title}
                  </p>
                  <p
                    className="font-outfit truncate text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: THEME.mutedText, opacity: 0.7 }}
                    dir="ltr"
                  >
                    {typeLabel(link.type)}
                  </p>
                </div>

                {/* Arrow */}
                <svg
                  className="h-4 w-4 shrink-0 opacity-40 transition-all group-hover:translate-x-[-2px] group-hover:opacity-100"
                  style={{ color: THEME.rust }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 5l-7 7 7 7"
                  />
                </svg>
              </motion.a>
            );
          })}
        </div>
      ) : (
        <div
          className="flex items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-5"
          style={{
            borderColor: THEME.border,
            backgroundColor: `${THEME.border}10`,
          }}
        >
          <svg
            className="h-5 w-5 shrink-0"
            style={{ color: THEME.mutedText, opacity: 0.5 }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
          <div className="text-center">
            <p
              className="font-urdu text-sm leading-[2]"
              style={{ color: THEME.darkText }}
            >
              کوئی لنک دستیاب نہیں
            </p>
            <p
              className="font-outfit mt-0.5 text-[11px] opacity-70"
              style={{ color: THEME.mutedText }}
              dir="ltr"
            >
              No related links available
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}