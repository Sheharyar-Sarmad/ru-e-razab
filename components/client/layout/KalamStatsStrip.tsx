"use client";

import { motion } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface KalamStatsStripProps {
  total: number;
  byType?: { ghazal?: number; nazm?: number; qata?: number; shair?: number };
}

export default function KalamStatsStrip({ total, byType }: KalamStatsStripProps) {
  const items = [
    { urdu: "کل کلام", label: "Total", value: total, accent: THEME.darkOrange },
    { urdu: "غزلیں", label: "Ghazals", value: byType?.ghazal ?? 0, accent: THEME.darkOrange },
    { urdu: "نظمیں", label: "Nazms", value: byType?.nazm ?? 0, accent: THEME.emeraldGreen },
    { urdu: "قطعات", label: "Qatas", value: byType?.qata ?? 0, accent: "#B45309" },
  ].filter((i) => i.value > 0);

  if (!items.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border px-6 py-4 backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(255,255,255,0.65)",
        borderColor: THEME.border,
      }}
      dir="rtl"
    >
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-2">
          <span
            className="font-outfit text-2xl font-bold tabular-nums"
            style={{ color: it.accent }}
            dir="ltr"
          >
            {it.value.toLocaleString()}
          </span>
          <div className="flex flex-col items-start">
            <span
              className="font-urdu text-xs leading-[1.7]"
              style={{ color: THEME.darkText }}
            >
              {it.urdu}
            </span>
            <span
              className="font-outfit text-[10px] font-semibold uppercase tracking-widest opacity-60"
              style={{ color: THEME.mutedText }}
            >
              {it.label}
            </span>
          </div>
          {i < items.length - 1 && (
            <span
              className="mx-2 hidden h-6 w-px sm:block"
              style={{ backgroundColor: THEME.border }}
            />
          )}
        </div>
      ))}
    </motion.div>
  );
}