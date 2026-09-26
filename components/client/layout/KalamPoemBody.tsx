"use client";

import { motion } from "framer-motion";
import KalamClickableWord from "./KalamClickableWord";
import { isUrduScript } from "./KalamFontUtils";

const THEME = {
  darkText: "#3A211B",
  rust: "#9A3412",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

interface Props {
  type: KalamType;
  content: any;
  interactive?: boolean;
}

const coupletVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: Math.min(i, 8) * 0.06,
      ease: [0.22, 1, 0.36, 1] as any,
    },
  }),
};

/* =========================================================
   URDU NUMERALS
========================================================= */
const URDU_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

function toUrduNumeral(n: number): string {
  if (n <= 0) return URDU_DIGITS[0];
  return n
    .toString()
    .split("")
    .map((d) => URDU_DIGITS[parseInt(d, 10)] ?? d)
    .join("");
}

/* =========================================================
   SHER LABEL — small pill above each couplet
========================================================= */
function SherLabel({ index }: { index: number }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-2" dir="rtl">
      <span
        className="h-px w-6 sm:w-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.border})`,
        }}
      />
      <span
        className="font-urdu rounded-full border px-3 py-0.5 text-[11px] font-semibold leading-[1.7] sm:text-xs"
        style={{
          borderColor: THEME.border,
          color: THEME.rust,
          backgroundColor: "#FFF",
        }}
      >
        شعر {toUrduNumeral(index)}
      </span>
      <span
        className="h-px w-6 sm:w-10"
        style={{
          background: `linear-gradient(90deg, ${THEME.border}, transparent)`,
        }}
      />
    </div>
  );
}

/* =========================================================
   RENDER LINE — no wrapping, single line only
========================================================= */
function renderLine(
  text: string,
  fullLine: string,
  interactive: boolean,
  keyPrefix: string
) {
  if (!text) return null;

  const isUrdu = isUrduScript(text);
  const fontClass = isUrdu ? "font-urdu" : "font-outfit";

  if (!interactive) {
    return <span className={fontClass}>{text}</span>;
  }

  const parts = text.split(/(\s+)/);

  return parts.map((part, i) => {
    if (!part.trim()) {
      return (
        <span key={`${keyPrefix}-sp-${i}`} className={fontClass}>
          {part}
        </span>
      );
    }
    return (
      <KalamClickableWord
        key={`${keyPrefix}-w-${i}`}
        word={part}
        fullLine={fullLine}
      />
    );
  });
}

/* =========================================================
   LINE STYLE — sized to fit ONE line, never wraps
========================================================= */
function lineStyle(text: string) {
  const isUrdu = isUrduScript(text);
  return {
    className: isUrdu
      ? // Urdu: Nastaliq script — slightly larger, tall line-height
        "font-urdu whitespace-nowrap text-base leading-[2.2] sm:text-lg sm:leading-[2.3] md:text-xl md:leading-[2.4]"
      : // Roman: Latin script — tighter, more compact
        "font-outfit whitespace-nowrap text-[13px] leading-[1.5] tracking-tight sm:text-sm sm:leading-[1.55] md:text-base md:leading-[1.6] lg:text-lg lg:leading-[1.65]",
    dir: isUrdu ? ("rtl" as const) : ("ltr" as const),
  };
}

/* =========================================================
   COUPLET — wrapper for a single sher (2 lines + label)
========================================================= */
function Couplet({
  index,
  line1,
  line2,
  interactive,
  keyPrefix,
  showLabel = true,
}: {
  index: number;
  line1: string;
  line2: string;
  interactive: boolean;
  keyPrefix: string;
  showLabel?: boolean;
}) {
  const full = `${line1}\n${line2}`;
  const s1 = lineStyle(line1);
  const s2 = lineStyle(line2);

  return (
    <div
      className="text-center"
      dir={s1.dir}
      // Horizontal scroll fallback if the line overflows on tiny screens
      style={{ overflowX: "auto", overflowY: "hidden" }}
    >
      {showLabel && <SherLabel index={index} />}

      <motion.p
        custom={index}
        variants={coupletVariants}
        initial="hidden"
        animate="show"
        className={s1.className}
        style={{ color: THEME.darkText }}
      >
        {renderLine(line1, full, interactive, `${keyPrefix}a`)}
      </motion.p>

      <motion.p
        custom={index}
        variants={coupletVariants}
        initial="hidden"
        animate="show"
        className={`mt-1.5 ${s2.className}`}
        style={{ color: THEME.darkText }}
      >
        {renderLine(line2, full, interactive, `${keyPrefix}b`)}
      </motion.p>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function KalamPoemBody({
  type,
  content,
  interactive = true,
}: Props) {
  if (!content) return null;

  /* ============ SHAIR — single couplet ============ */
  if (type === "shair") {
    const lines = Array.isArray(content) ? content : [];
    const line1 = lines[0] ?? "";
    const line2 = lines[1] ?? "";

    return (
      <Couplet
        index={1}
        line1={line1}
        line2={line2}
        interactive={interactive}
        keyPrefix="s"
        showLabel={false} // single shair — no number needed
      />
    );
  }

  /* ============ NAZM — bands of shairs ============ */
  if (type === "nazm") {
    const bands = Array.isArray(content) ? content : [];
    let sherCounter = 0;

    return (
      <div className="space-y-8 sm:space-y-10">
        {bands.map((band: any, bandIdx: number) => (
          <div key={bandIdx} className="space-y-6">
            {band.shairs?.map((shair: any) => {
              sherCounter++;
              const l1 = shair.lines?.[0] ?? "";
              const l2 = shair.lines?.[1] ?? "";
              return (
                <Couplet
                  key={sherCounter}
                  index={sherCounter}
                  line1={l1}
                  line2={l2}
                  interactive={interactive}
                  keyPrefix={`n${sherCounter}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  /* ============ GHAZAL + QATA — array of couplets ============ */
  const couples = Array.isArray(content) ? content : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {couples.map((couple: any, i: number) => {
        const l1 = couple.lines?.[0] ?? "";
        const l2 = couple.lines?.[1] ?? "";
        return (
          <Couplet
            key={i}
            index={i + 1}
            line1={l1}
            line2={l2}
            interactive={interactive}
            keyPrefix={`g${i}`}
          />
        );
      })}
    </div>
  );
}