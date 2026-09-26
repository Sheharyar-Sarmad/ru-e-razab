"use client";

import { motion } from "framer-motion";
import { toast } from "react-toastify";
import KalamShareMenu from "./KalamShareMenu";

const THEME = {
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

interface Props {
  type: KalamType;
  likesCount: number;
  dislikesCount?: number;
  commentsCount: number;
  isLiked: boolean;
  isDisliked?: boolean;
  supportsDislike: boolean;
  likeBusy?: boolean;
  onLike: () => void;
  onDislike?: () => void;
  onCommentClick: () => void;
  onAskAI: () => void;
  shareData: { title: string; text: string; url: string };
  copyText: string;
}

export default function KalamActionBar({
  likesCount,
  dislikesCount = 0,
  commentsCount,
  isLiked,
  isDisliked = false,
  supportsDislike,
  likeBusy,
  onLike,
  onDislike,
  onCommentClick,
  onAskAI,
  shareData,
  copyText,
}: Props) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("Poem copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-wrap items-center gap-2 rounded-2xl border p-3 shadow-sm"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: THEME.border,
      }}
    >
      {/* LIKE */}
      <ActionButton
        active={isLiked}
        activeColor={THEME.deepRed}
        onClick={onLike}
        disabled={likeBusy}
        ariaLabel="Like"
        icon={
          <motion.svg
            animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill={isLiked ? THEME.deepRed : "none"}
            stroke="currentColor"
            strokeWidth={isLiked ? 0 : 1.9}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </motion.svg>
        }
        label={likesCount.toLocaleString()}
      />

      {supportsDislike && onDislike && (
        <ActionButton
          active={isDisliked}
          activeColor={THEME.mutedText}
          onClick={onDislike}
          ariaLabel="Dislike"
          icon={
            <motion.svg
              animate={isDisliked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              className="h-4 w-4 rotate-180"
              viewBox="0 0 24 24"
              fill={isDisliked ? THEME.mutedText : "none"}
              stroke="currentColor"
              strokeWidth={isDisliked ? 0 : 1.9}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </motion.svg>
          }
          label={dislikesCount > 0 ? dislikesCount.toLocaleString() : "Dislike"}
        />
      )}

      <ActionButton
        onClick={onCommentClick}
        ariaLabel="Comments"
        icon={
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        }
        label={commentsCount.toLocaleString()}
      />

      <ActionButton
        onClick={onAskAI}
        ariaLabel="Ask AI"
        accent={THEME.emerald}
        icon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        }
        label="Ask AI"
      />

      <KalamShareMenu
        title={shareData.title}
        text={shareData.text}
        url={shareData.url}
      />

      <ActionButton
        onClick={handleCopy}
        ariaLabel="Copy"
        icon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        }
        label="Copy"
      />
    </motion.div>
  );
}

function ActionButton({
  onClick,
  disabled,
  active,
  activeColor,
  accent,
  icon,
  label,
  ariaLabel,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeColor?: string;
  accent?: string;
  icon: React.ReactNode;
  label: string | number;
  ariaLabel: string;
}) {
  const color = active && activeColor ? activeColor : accent || THEME.darkText;

  return (
    <motion.button
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.04, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-outfit font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderColor: active && activeColor ? activeColor : THEME.border,
        backgroundColor:
          active && activeColor ? `${activeColor}10` : "#FFF",
        color,
      }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}