"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

export interface KalamScrollItemData {
  _id: string;
  type: KalamType;
  typeDisplayUrdu?: string;
  title?: string;
  slug: string;
  firstLine: string;
  category?: string[];
  coverImage?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: string;
}

const TYPE_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

const TYPE_ROUTE: Record<KalamType, string> = {
  ghazal: "ghazal",
  nazm: "nazm",
  qata: "qata",
  shair: "shair",
};

interface Props {
  item: KalamScrollItemData;
  index: number;
  priority?: boolean;
  onLike?: (item: KalamScrollItemData) => void;
  onComment?: (item: KalamScrollItemData) => void;
  isLiked?: boolean;
}

export default function KalamScrollItem({
  item,
  index,
  priority = false,
  onLike,
  onComment,
  isLiked = false,
}: Props) {
  const href = `/${TYPE_ROUTE[item.type]}/${item.slug}`;
  const typeUrdu = TYPE_URDU[item.type] || "کلام";
  const likes = item.likesCount ?? 0;
  const comments = item.commentsCount ?? 0;
  const hasCover = !!item.coverImage;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <div
        className="flex flex-col overflow-hidden rounded-3xl border transition-all duration-500 hover:shadow-xl md:flex-row md:items-stretch"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: THEME.border,
          boxShadow: "0 4px 20px -12px rgba(154, 52, 18, 0.15)",
        }}
      >
        {/* =========================================================
            IMAGE — ALWAYS ON THE LEFT
        ========================================================= */}
        <Link
          href={href}
          className="relative h-56 w-full shrink-0 overflow-hidden md:h-auto md:w-[36%] md:min-h-[260px]"
          aria-label={`Open ${typeUrdu}`}
        >
          {hasCover ? (
            <Image
              src={item.coverImage!}
              alt=""
              fill
              priority={priority}
              sizes="(max-width: 768px) 100vw, 480px"
              quality={95}
              className="object-cover object-center transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FDF6F3, #F7E6DE)",
              }}
            >
              <span
                className="font-urdu text-4xl leading-[1.6]"
                style={{ color: THEME.darkOrange, opacity: 0.35 }}
              >
                {typeUrdu}
              </span>
            </div>
          )}

          {/* Type badge */}
          <span
            className="font-urdu absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold leading-[1.6] shadow-sm backdrop-blur-sm"
            style={{ color: THEME.darkOrange }}
            dir="rtl"
          >
            {typeUrdu}
          </span>
        </Link>

        {/* =========================================================
            CONTENT
        ========================================================= */}
        <div className="flex flex-1 flex-col p-6 sm:p-8 md:p-10" dir="rtl">
          {/* Title for nazm */}
          {item.type === "nazm" && item.title && (
            <h3
              className="font-urdu mb-3 text-xl font-semibold leading-[1.8] sm:text-2xl"
              style={{ color: THEME.darkText }}
            >
              {item.title}
            </h3>
          )}

          {/* First line */}
          <Link href={href} className="block">
            <p
              className="font-urdu text-xl leading-[2.2] line-clamp-3 transition-opacity duration-300 group-hover:opacity-80 sm:text-2xl sm:leading-[2.3] md:text-[26px] md:leading-[2.4]"
              style={{ color: THEME.darkText }}
            >
              {item.firstLine || "اس کلام کو پڑھنے کے لیے کلک کریں"}
            </p>
          </Link>

          {/* =========================================================
              ACTION PANEL — likes, comments, read full
          ========================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border pt-5"
            style={{ borderColor: THEME.border }}
          >
            {/* LEFT SIDE: Like + Comment buttons */}
            <div className="flex items-center gap-2" dir="ltr">
              {/* LIKE */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLike?.(item);
                }}
                aria-label="Like"
                aria-pressed={isLiked}
                className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-outfit font-semibold transition-all"
                style={{
                  borderColor: isLiked ? THEME.deepRed : THEME.border,
                  backgroundColor: isLiked
                    ? `${THEME.deepRed}10`
                    : "rgba(255, 255, 255, 0.85)",
                  color: isLiked ? THEME.deepRed : THEME.mutedText,
                }}
              >
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
                <span>{likes}</span>
              </motion.button>

              {/* COMMENT */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onComment?.(item);
                }}
                aria-label="Comments"
                className="flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-outfit font-semibold transition-all"
                style={{
                  borderColor: THEME.border,
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  color: THEME.mutedText,
                }}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                <span>{comments}</span>
              </motion.button>

              {/* Category chip if present */}
              {item.category?.[0] && (
                <span
                  className="font-urdu hidden rounded-full border px-3 py-2 text-xs leading-[1.6] sm:inline-block"
                  style={{
                    borderColor: THEME.border,
                    color: THEME.mutedText,
                  }}
                >
                  {item.category[0]}
                </span>
              )}
            </div>

            {/* RIGHT SIDE: Read Full button */}
            <Link
              href={href}
              className="font-urdu inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.04] hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
                boxShadow: `0 8px 20px -10px ${THEME.orangeGlow}CC`,
              }}
              aria-label={`Read full ${typeUrdu}`}
            >
              مکمل پڑھیں
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
}