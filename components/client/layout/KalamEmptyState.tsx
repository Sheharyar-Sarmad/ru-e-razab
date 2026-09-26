"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface KalamEmptyStateProps {
  titleUrdu?: string;
  titleEnglish?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: React.ReactNode;
}

export default function KalamEmptyState({
  titleUrdu = "کوئی کلام نہیں ملا",
  titleEnglish = "Nothing here yet",
  description = "Try a different search or clear your filters.",
  actionHref,
  actionLabel,
  icon,
}: KalamEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex max-w-2xl flex-col items-center rounded-3xl border border-dashed px-8 py-16 text-center backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        borderColor: THEME.darkOrange,
      }}
      dir="rtl"
    >
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2"
        style={{
          borderColor: `${THEME.darkOrange}40`,
          backgroundColor: `${THEME.darkOrange}12`,
        }}
      >
        {icon ?? (
          <svg
            className="h-7 w-7"
            style={{ color: THEME.darkOrange }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}
      </div>

      <p
        className="font-urdu text-2xl leading-[2]"
        style={{ color: THEME.darkText }}
      >
        {titleUrdu}
      </p>

      <p
        className="font-outfit mt-2 text-sm"
        style={{ color: THEME.mutedText }}
        dir="ltr"
      >
        {titleEnglish}
      </p>

      {description && (
        <p
          className="font-outfit mt-3 max-w-md text-xs leading-relaxed"
          style={{ color: THEME.mutedText }}
          dir="ltr"
        >
          {description}
        </p>
      )}

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="font-urdu mt-7 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
          style={{ backgroundColor: THEME.darkOrange }}
        >
          {actionLabel}
        </Link>
      )}
    </motion.div>
  );
}