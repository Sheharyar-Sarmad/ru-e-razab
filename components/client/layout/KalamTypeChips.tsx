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

export type KalamFilterType = "all" | "ghazal" | "nazm" | "qata" | "shair";

interface Chip {
  key: KalamFilterType;
  labelUrdu: string;
  count?: number;
}

interface KalamTypeChipsProps {
  value: KalamFilterType;
  onChange: (value: KalamFilterType) => void;
  counts?: Partial<Record<KalamFilterType, number>>;
  showAll?: boolean;
}

const CHIP_LABELS: Record<KalamFilterType, string> = {
  all: "سب",
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

export default function KalamTypeChips({
  value,
  onChange,
  counts,
  showAll = true,
}: KalamTypeChipsProps) {
  const keys: KalamFilterType[] = showAll
    ? ["all", "ghazal", "nazm", "qata", "shair"]
    : ["ghazal", "nazm", "qata", "shair"];

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      dir="rtl"
      role="tablist"
    >
      {keys.map((k) => {
        const isActive = value === k;
        const count = counts?.[k];

        return (
          <motion.button
            key={k}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(k)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            className="font-urdu relative flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold leading-[1.8] transition-all"
            style={{
              borderColor: isActive ? THEME.darkOrange : THEME.border,
              backgroundColor: isActive
                ? THEME.darkOrange
                : "rgba(255, 255, 255, 0.7)",
              color: isActive ? "#FFFFFF" : THEME.darkText,
              boxShadow: isActive
                ? `0 8px 20px -8px ${THEME.orangeGlow}AA`
                : "none",
            }}
          >
            <span>{CHIP_LABELS[k]}</span>
            {typeof count === "number" && count > 0 && (
              <span
                className="font-outfit rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.25)"
                    : `${THEME.darkOrange}15`,
                  color: isActive ? "#FFFFFF" : THEME.darkOrange,
                }}
              >
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}