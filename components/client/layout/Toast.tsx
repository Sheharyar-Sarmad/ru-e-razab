"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export interface ToastData {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

function iconFor(kind: ToastKind) {
  const size = 18;
  switch (kind) {
    case "success":
      return <CheckCircle2 size={size} style={{ color: THEME.emeraldGreen }} />;
    case "error":
      return <AlertTriangle size={size} style={{ color: THEME.deepRed }} />;
    default:
      return <Info size={size} style={{ color: THEME.darkOrange }} />;
  }
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md"
      style={{
        backgroundColor: "rgba(255, 247, 244, 0.95)",
        borderColor: THEME.border,
        boxShadow: `0 20px 40px -20px ${THEME.darkOrange}55`,
      }}
      role="status"
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor:
            toast.kind === "success"
              ? `${THEME.emeraldGreen}18`
              : toast.kind === "error"
              ? `${THEME.deepRed}18`
              : `${THEME.darkOrange}18`,
        }}
      >
        {iconFor(toast.kind)}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="font-outfit text-sm font-semibold"
          style={{ color: THEME.darkText }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p
            className="font-outfit mt-0.5 text-xs leading-relaxed"
            style={{ color: THEME.mutedText }}
          >
            {toast.description}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-full p-1 transition-opacity hover:opacity-70"
        style={{ color: THEME.mutedText }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}