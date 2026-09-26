"use client";

import { motion } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface KalamPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  siblingCount?: number;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function getPages(
  page: number,
  total: number,
  siblings: number
): (number | "…")[] {
  const totalNumbers = siblings * 2 + 5;
  if (total <= totalNumbers) return range(1, total);

  const leftSibling = Math.max(page - siblings, 1);
  const rightSibling = Math.min(page + siblings, total);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = range(1, 3 + siblings * 2);
    return [...leftRange, "…", total];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = range(total - (2 + siblings * 2), total);
    return [1, "…", ...rightRange];
  }
  const middle = range(leftSibling, rightSibling);
  return [1, "…", ...middle, "…", total];
}

export default function KalamPagination({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
}: KalamPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPages(page, totalPages, siblingCount);

  const go = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    onChange(p);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-center gap-2"
      dir="ltr"
    >
      <motion.button
        whileHover={{ scale: page === 1 ? 1 : 1.06 }}
        whileTap={{ scale: page === 1 ? 1 : 0.94 }}
        disabled={page === 1}
        onClick={() => go(page - 1)}
        aria-label="Previous page"
        className="flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-outfit font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: THEME.border,
          color: THEME.darkText,
          backgroundColor: "rgba(255,255,255,0.7)",
        }}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </motion.button>

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`e-${i}`}
              className="px-2 text-sm font-outfit"
              style={{ color: THEME.mutedText }}
            >
              …
            </span>
          ) : (
            <motion.button
              key={p}
              whileHover={{ scale: p === page ? 1 : 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => go(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-outfit font-semibold transition-all"
              style={{
                borderColor: p === page ? THEME.darkOrange : THEME.border,
                backgroundColor:
                  p === page ? THEME.darkOrange : "rgba(255,255,255,0.7)",
                color: p === page ? "#FFFFFF" : THEME.darkText,
                boxShadow:
                  p === page ? `0 8px 20px -8px ${THEME.orangeGlow}AA` : "none",
              }}
            >
              {p}
            </motion.button>
          )
        )}
      </div>

      <motion.button
        whileHover={{ scale: page === totalPages ? 1 : 1.06 }}
        whileTap={{ scale: page === totalPages ? 1 : 0.94 }}
        disabled={page === totalPages}
        onClick={() => go(page + 1)}
        aria-label="Next page"
        className="flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-outfit font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: THEME.border,
          color: THEME.darkText,
          backgroundColor: "rgba(255,255,255,0.7)",
        }}
      >
        Next
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>
    </nav>
  );
}