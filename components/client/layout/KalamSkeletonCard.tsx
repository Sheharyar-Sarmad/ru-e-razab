"use client";

import { motion } from "framer-motion";

const THEME = {
  border: "#F2D6CF",
};

export default function KalamSkeletonCard({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.55)",
        borderColor: THEME.border,
      }}
    >
      <div
        className="h-56 w-full animate-pulse sm:h-60"
        style={{ backgroundColor: `${THEME.border}80` }}
      />
      <div className="p-5">
        <div
          className="h-4 w-3/4 animate-pulse rounded"
          style={{ backgroundColor: `${THEME.border}80` }}
        />
        <div
          className="mt-3 h-4 w-1/2 animate-pulse rounded"
          style={{ backgroundColor: `${THEME.border}80` }}
        />
        <div
          className="mt-4 h-3 w-1/3 animate-pulse rounded"
          style={{ backgroundColor: `${THEME.border}80` }}
        />
      </div>
    </motion.div>
  );
}