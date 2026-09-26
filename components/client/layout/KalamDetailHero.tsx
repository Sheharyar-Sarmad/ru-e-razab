"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { isUrduScript } from "./KalamFontUtils";

const THEME = {
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

const TYPE_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

const TYPE_PLURAL: Record<KalamType, string> = {
  ghazal: "ghazals",
  nazm: "nazms",
  qata: "qatas",
  shair: "shairs",
};

interface Props {
  type: KalamType;
  title?: string;
  category?: string[];
  takhallus?: string;
  publishedAt?: string;
  createdAt?: string;
  featured?: boolean;
  firstLine: string;
}

export default function KalamDetailHero({
  type,
  title,
  category = [],
  takhallus,
  publishedAt,
  createdAt,
  featured = false,
  firstLine,
}: Props) {
  const typeUrdu = TYPE_URDU[type];
  const pluralRoute = TYPE_PLURAL[type];
  const titleIsUrdu = isUrduScript(title);
  const firstLineIsUrdu = isUrduScript(firstLine);

  const date = publishedAt || createdAt;
  const published = date
    ? new Date(date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Breadcrumb */}
      <nav
        className="mb-5 flex flex-wrap items-center gap-2 text-xs font-outfit"
        style={{ color: THEME.mutedText }}
        dir="ltr"
      >
        <Link href="/" className="transition-opacity hover:opacity-70">
          Home
        </Link>
        <span className="opacity-40">/</span>
        <Link
          href={`/${pluralRoute}`}
          className="transition-opacity hover:opacity-70"
        >
          {pluralRoute.charAt(0).toUpperCase() + pluralRoute.slice(1)}
        </Link>
        <span className="opacity-40">/</span>
        <span
          className="max-w-[240px] truncate"
          style={{ color: THEME.darkText }}
        >
          {firstLine.slice(0, 40)}
          {firstLine.length > 40 ? "…" : ""}
        </span>
      </nav>

      {/* Badge row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="font-urdu rounded-full px-3 py-1 text-xs font-bold leading-[1.7] shadow-sm"
          style={{
            backgroundColor: THEME.rust,
            color: "#FFF7F4",
          }}
        >
          {typeUrdu}
        </span>

        {featured && (
          <span
            className="font-outfit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm"
            style={{ backgroundColor: THEME.emerald }}
          >
            Featured
          </span>
        )}

        {category.map((cat) => (
          <span
            key={cat}
            className={`${
              isUrduScript(cat) ? "font-urdu leading-[1.8]" : "font-outfit"
            } rounded-full border px-3 py-1 text-xs font-medium`}
            style={{
              borderColor: THEME.border,
              color: THEME.mutedText,
              backgroundColor: "#FFF",
            }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Nazm title */}
      {type === "nazm" && title && (
        <h1
          className={
            titleIsUrdu
              ? "font-urdu mb-3 text-2xl font-semibold leading-[1.9] sm:text-3xl"
              : "font-outfit mb-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          }
          style={{ color: THEME.darkText }}
          dir={titleIsUrdu ? "rtl" : "ltr"}
        >
          {title}
        </h1>
      )}

      {/* First line preview */}
      {type !== "nazm" && firstLine && (
        <p
          className={
            firstLineIsUrdu
              ? "font-urdu mb-3 line-clamp-1 text-lg font-semibold leading-[2] sm:text-xl"
              : "font-outfit mb-3 line-clamp-1 text-base font-semibold leading-snug tracking-tight sm:text-lg"
          }
          style={{ color: THEME.darkText }}
          dir={firstLineIsUrdu ? "rtl" : "ltr"}
        >
          {firstLine}
        </p>
      )}

      {/* Meta row — NO VIEWS */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-outfit"
        style={{ color: THEME.mutedText }}
        dir="ltr"
      >
        <span>
          By{" "}
          <span style={{ color: THEME.darkText, fontWeight: 600 }}>
            {takhallus || "Razab Tabraiz"}
          </span>
        </span>
        {published && (
          <>
            <span
              className="h-1 w-1 rounded-full"
              style={{ backgroundColor: THEME.rust }}
            />
            <span>{published}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}