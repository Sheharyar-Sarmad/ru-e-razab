"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface KalamSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
}

export default function KalamSearchInput({
  value,
  onChange,
  placeholder = "کلام میں تلاش کریں…",
  debounceMs = 350,
  autoFocus = false,
}: KalamSearchInputProps) {
  const [local, setLocal] = useState(value);
  const firstRun = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value → local
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounced propagation
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounceMs]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const clear = () => {
    setLocal("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      <div
        className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-all focus-within:shadow-md"
        style={{
          borderColor: THEME.border,
          backgroundColor: "rgba(255, 255, 255, 0.85)",
        }}
      >
        <svg
          className="h-5 w-5 shrink-0"
          style={{ color: THEME.darkOrange }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder}
          dir="rtl"
          className="font-urdu flex-1 bg-transparent text-base leading-[2] text-right outline-none placeholder:leading-[2] placeholder:text-sm placeholder:opacity-60"
          style={{ color: THEME.darkText }}
        />

        {local && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="shrink-0 rounded-full p-1 transition-opacity hover:opacity-70"
            style={{ color: THEME.mutedText }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}