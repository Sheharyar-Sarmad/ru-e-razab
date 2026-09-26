"use client";

import { motion } from "framer-motion";
import KalamSearchInput from "./KalamSearchInput";
import KalamTypeChips, { type KalamFilterType } from "./KalamTypeChips";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  type: KalamFilterType;
  onTypeChange: (v: KalamFilterType) => void;
  counts?: Partial<Record<KalamFilterType, number>>;
  total: number;
  showing: string;
  loading?: boolean;
}

export default function KulliyatPanel({
  search,
  onSearchChange,
  type,
  onTypeChange,
  counts,
  total,
  showing,
  loading,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border shadow-lg backdrop-blur-md"
      style={{
        backgroundColor: "rgba(255, 252, 250, 0.92)",
        borderColor: THEME.border,
        boxShadow: `0 20px 60px -30px ${THEME.darkOrange}40, inset 0 1px 0 rgba(255,255,255,0.6)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, ${THEME.orangeGlow}, ${THEME.darkOrange}, transparent)`,
        }}
        aria-hidden="true"
      />

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        {/* ============ HEADER ============ */}
        <div className="mb-8 text-center" dir="rtl">
          <p
            className="font-outfit mb-2 text-[10px] font-semibold uppercase tracking-[0.35em]"
            style={{ color: THEME.darkOrange }}
            dir="ltr"
          >
            The Complete Collection
          </p>
          <h1
            className="font-urdu text-3xl font-normal leading-[1.9] sm:text-4xl md:text-5xl"
            style={{ color: THEME.darkText }}
          >
            کلیاتِ رزب
          </h1>

          {/* Thin divider */}
          <div
            className="mx-auto mt-4 h-[2px] w-14 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, transparent)`,
            }}
          />

          {/* Inline stats */}
          {!loading && total > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-outfit mt-4 text-xs"
              style={{ color: THEME.mutedText }}
              dir="ltr"
            >
              <span className="font-semibold" style={{ color: THEME.darkText }}>
                {total.toLocaleString()}
              </span>{" "}
              pieces · showing {showing}
            </motion.p>
          )}
        </div>

        {/* ============ SEARCH ============ */}
        <div className="mb-5">
          <KalamSearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="کلام میں تلاش کریں…"
          />
        </div>

        {/* ============ TYPE CHIPS ============ */}
        <KalamTypeChips value={type} onChange={onTypeChange} counts={counts} />
      </div>
    </motion.div>
  );
}