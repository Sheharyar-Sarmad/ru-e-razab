"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

export interface KalamCardItem {
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
  views?: number;
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
  item: KalamCardItem;
  index?: number;
  priority?: boolean;
}

export default function KalamCard({ item, index = 0, priority = false }: Props) {
  const href = `/${TYPE_ROUTE[item.type]}/${item.slug}`;
  const typeUrdu = TYPE_URDU[item.type];
  const likes = item.likesCount ?? 0;
  const comments = item.commentsCount ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index, 8) * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -5 }}
      className="group h-full"
    >
      <Link
        href={href}
        className="flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-xl"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: THEME.border,
        }}
      >
        {/* ============ COVER ============ */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {item.coverImage ? (
            <Image
              src={item.coverImage}
              alt=""
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
              quality={95}
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, #FDF6F3, #F7E6DE)`,
              }}
            >
              <span
                className="font-urdu text-3xl leading-[1.6]"
                style={{ color: THEME.darkOrange, opacity: 0.35 }}
              >
                {typeUrdu}
              </span>
            </div>
          )}

          {/* Minimal bottom fade just for the type badge */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{
              background: `linear-gradient(180deg, transparent, rgba(0,0,0,0.25))`,
            }}
            aria-hidden="true"
          />

          {/* Type badge — small, subtle */}
          <span
            className="font-urdu absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold leading-[1.6] shadow-sm backdrop-blur-sm"
            style={{ color: THEME.darkOrange }}
            dir="rtl"
          >
            {typeUrdu}
          </span>
        </div>

        {/* ============ BODY ============ */}
        <div className="flex flex-1 flex-col p-5" dir="rtl">
          {item.type === "nazm" && item.title && (
            <h3
              className="font-urdu mb-2 text-lg font-semibold leading-[1.8] line-clamp-1"
              style={{ color: THEME.darkText }}
            >
              {item.title}
            </h3>
          )}

          <p
            className="font-urdu flex-1 text-[15px] leading-[2.1] line-clamp-3"
            style={{ color: THEME.darkText }}
          >
            {item.firstLine || "…"}
          </p>

          {/* Meta row */}
          <div
            className="mt-4 flex items-center justify-between border-t pt-3"
            style={{ borderColor: THEME.border }}
          >
            <div
              className="flex items-center gap-3 text-xs font-outfit"
              style={{ color: THEME.mutedText }}
              dir="ltr"
            >
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {likes}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                {comments}
              </span>
            </div>

            <span
              className="font-outfit flex items-center gap-1 text-xs font-medium transition-transform duration-300 group-hover:translate-x-[-2px]"
              style={{ color: THEME.darkOrange }}
              dir="ltr"
            >
              Read
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}