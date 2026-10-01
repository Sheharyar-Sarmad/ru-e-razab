"use client";

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import KalamClickableWord from "./KalamClickableWord";
import { isUrduScript } from "./KalamFontUtils";

/* =========================================================
   THEME
========================================================= */
const THEME = {
  darkText: "#3A211B",
  rust: "#9A3412",
  maroon: "#7C2D12",
  mutedText: "#76584F",
  border: "#F2D6CF",
  gold: "#C9A36B",
  goldSoft: "#E8D3B2",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

interface Props {
  type: KalamType;
  content: any;
  interactive?: boolean;
}

interface CoupletData {
  l1: string;
  l2: string;
  band: number;
}

/* =========================================================
   CONSTANTS
========================================================= */

// Every sher uses exactly this width (both misras fill it fully).
const SHER_MAX_WIDTH = 720; // px
// Smallest the text may shrink to (as a fraction of the base size) to fit.
const MIN_FONT_SCALE = 0.5;
// Minimum space between two words on a misra.
const MIN_WORD_GAP = "0.35em";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* =========================================================
   BACKGROUND PATTERN (8-point star, Islamic geometric)
========================================================= */
const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84"><g fill="none" stroke="#9A3412" stroke-opacity="0.075" stroke-width="1"><path d="M42 4 L50 25 L71 17 L63 38 L80 42 L63 46 L71 67 L50 59 L42 80 L34 59 L13 67 L21 46 L4 42 L21 38 L13 17 L34 25 Z"/><circle cx="42" cy="42" r="7"/><circle cx="0" cy="0" r="10"/><circle cx="84" cy="0" r="10"/><circle cx="0" cy="84" r="10"/><circle cx="84" cy="84" r="10"/></g></svg>`;
const PATTERN_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(STAR_SVG)}")`;

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
   CONTENT NORMALISATION
========================================================= */
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function toCouplets(type: KalamType, content: any): CoupletData[] {
  if (!content) return [];

  let result: CoupletData[] = [];

  if (type === "shair") {
    const lines: unknown[] = Array.isArray(content)
      ? content
      : Array.isArray(content?.lines)
      ? content.lines
      : [];
    result = [{ l1: str(lines[0]), l2: str(lines[1]), band: 0 }];
  } else if (type === "nazm") {
    const bands: any[] = Array.isArray(content) ? content : [];
    result = bands.flatMap((band, bandIdx) =>
      (Array.isArray(band?.shairs) ? band.shairs : []).map((shair: any) => ({
        l1: str(shair?.lines?.[0]),
        l2: str(shair?.lines?.[1]),
        band: bandIdx,
      }))
    );
  } else {
    const couples: any[] = Array.isArray(content) ? content : [];
    result = couples.map((couple) => ({
      l1: str(couple?.lines?.[0]),
      l2: str(couple?.lines?.[1]),
      band: 0,
    }));
  }

  return result.filter((c) => c.l1 || c.l2);
}

/* =========================================================
   DECORATIVE PIECES
========================================================= */
function CornerOrnament({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute h-7 w-7 sm:h-9 sm:w-9 ${className}`}
      viewBox="0 0 36 36"
      fill="none"
      stroke={THEME.gold}
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M3 33 V10 Q3 3 10 3 H33" />
      <path d="M9 33 V14 Q9 9 14 9 H33" strokeOpacity="0.55" />
      <path d="M14 14 L18 18 L14 22 L10 18 Z" fill={THEME.gold} fillOpacity="0.5" />
    </svg>
  );
}

function OrnamentDivider({ large = false }: { large?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto flex w-full max-w-[420px] items-center justify-center gap-3 ${
        large ? "my-9 sm:my-12" : "my-5 sm:my-7"
      }`}
    >
      <span
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.gold})`,
        }}
      />
      <span
        className={`rotate-45 ${large ? "h-2.5 w-2.5" : "h-1.5 w-1.5"}`}
        style={{ backgroundColor: THEME.rust }}
      />
      {large && (
        <>
          <span
            className="h-1.5 w-1.5 rotate-45 border"
            style={{ borderColor: THEME.gold }}
          />
          <span
            className="h-2.5 w-2.5 rotate-45"
            style={{ backgroundColor: THEME.rust }}
          />
        </>
      )}
      <span
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, ${THEME.gold}, transparent)`,
        }}
      />
    </div>
  );
}

function SherLabel({ index }: { index: number }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-2" dir="rtl">
      <span
        className="h-px w-6 sm:w-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.gold})`,
        }}
      />
      <span
        className="font-urdu rounded-full border px-3 py-0.5 text-[11px] font-semibold leading-[1.7] sm:text-xs"
        style={{
          borderColor: THEME.goldSoft,
          color: THEME.rust,
          backgroundColor: "rgba(255, 249, 241, 0.9)",
        }}
      >
        شعر {toUrduNumeral(index)}
      </span>
      <span
        className="h-px w-6 sm:w-10"
        style={{
          background: `linear-gradient(90deg, ${THEME.gold}, transparent)`,
        }}
      />
    </div>
  );
}

/* =========================================================
   MISRA — one line, words spread edge to edge.
   Every misra fills 100% of the sher width, so both misras
   (and every sher) have the exact same width.
========================================================= */
function Misra({
  text,
  fullSher,
  interactive,
  keyPrefix,
}: {
  text: string;
  fullSher: string;
  interactive: boolean;
  keyPrefix: string;
}) {
  if (!text) return null;

  const isUrdu = isUrduScript(text);
  const fontClass = isUrdu ? "font-urdu" : "font-outfit";
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <div
      data-misra
      dir={isUrdu ? "rtl" : "ltr"}
      className={`flex w-full flex-nowrap items-baseline ${fontClass}`}
      style={{
        justifyContent: words.length === 1 ? "center" : "space-between",
        columnGap: MIN_WORD_GAP,
        color: THEME.darkText,
      }}
    >
      {words.map((word, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="shrink-0 whitespace-nowrap"
        >
          {interactive ? (
            <KalamClickableWord word={word} fullLine={fullSher} />
          ) : (
            word
          )}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   SHER BLOCK — two misras of identical width.
   Font size is reduced only if a misra is too long to fit,
   so nothing ever wraps or scrolls.
========================================================= */
const SherBlock = memo(function SherBlock({
  index,
  line1,
  line2,
  interactive,
  keyPrefix,
  showLabel,
  reduceMotion,
}: {
  index: number;
  line1: string;
  line2: string;
  interactive: boolean;
  keyPrefix: string;
  showLabel: boolean;
  reduceMotion: boolean;
}) {
  const fitRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(0);

  const fullSher = `${line1}\n${line2}`;
  const urdu = isUrduScript(line1 || line2);

  const fit = useCallback(() => {
    const el = fitRef.current;
    if (!el) return;

    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-misra]"));
    if (rows.length === 0) return;

    el.style.fontSize = "";
    const base = parseFloat(getComputedStyle(el).fontSize);
    if (!base || Number.isNaN(base)) return;

    const min = base * MIN_FONT_SCALE;
    let size = base;
    const overflows = () => rows.some((r) => r.scrollWidth > r.clientWidth + 1);

    while (size > min && overflows()) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }, []);

  useIsoLayoutEffect(() => {
    fit();
  }, [fit, line1, line2]);

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;

    // Re-fit on width changes (resize / orientation change)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        if (w !== lastWidthRef.current) {
          lastWidthRef.current = w;
          fit();
        }
      });
      ro.observe(el);
    }

    // Re-fit once web fonts (Nastaliq) finish loading, widths change then
    let cancelled = false;
    if (typeof document !== "undefined" && "fonts" in document) {
      (document as any).fonts.ready.then(() => {
        if (!cancelled) fit();
      });
    }

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [fit]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: reduceMotion ? 0 : Math.min(index - 1, 8) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mx-auto w-full"
      style={{ maxWidth: SHER_MAX_WIDTH }}
    >
      {showLabel && <SherLabel index={index} />}

      <div
        ref={fitRef}
        className={
          urdu
            ? "space-y-0.5 text-lg leading-[2.2] sm:text-xl sm:leading-[2.3] md:text-2xl md:leading-[2.4]"
            : "space-y-1 text-[13px] leading-[1.6] tracking-tight sm:text-sm md:text-base lg:text-lg"
        }
      >
        <Misra
          text={line1}
          fullSher={fullSher}
          interactive={interactive}
          keyPrefix={`${keyPrefix}a`}
        />
        <Misra
          text={line2}
          fullSher={fullSher}
          interactive={interactive}
          keyPrefix={`${keyPrefix}b`}
        />
      </div>
    </motion.div>
  );
});

/* =========================================================
   FRAME — classy parchment background with Urdu ornamentation
========================================================= */
function PoemFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-[28px] border px-4 py-9 sm:px-10 sm:py-12"
      style={{
        borderColor: THEME.goldSoft,
        background: [
          "radial-gradient(110% 80% at 50% 0%, #FFFAF3 0%, rgba(255,250,243,0) 70%)",
          "radial-gradient(70% 60% at 0% 100%, rgba(154,52,18,0.10) 0%, rgba(154,52,18,0) 70%)",
          "radial-gradient(70% 60% at 100% 100%, rgba(201,163,107,0.18) 0%, rgba(201,163,107,0) 70%)",
          "linear-gradient(180deg, #FCF1E4 0%, #F8E6D2 100%)",
        ].join(", "),
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.8) inset, 0 18px 40px -22px rgba(124,45,18,0.35)",
      }}
    >
      {/* Geometric star pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: PATTERN_URL,
          backgroundSize: "84px 84px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,1) 100%)",
        }}
      />

      {/* Inner gold frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2.5 rounded-[20px] border sm:inset-3.5"
        style={{ borderColor: THEME.goldSoft }}
      />

      {/* Corner ornaments */}
      <CornerOrnament className="left-3 top-3 sm:left-4 sm:top-4" />
      <CornerOrnament className="right-3 top-3 -scale-x-100 sm:right-4 sm:top-4" />
      <CornerOrnament className="bottom-3 left-3 -scale-y-100 sm:bottom-4 sm:left-4" />
      <CornerOrnament className="bottom-3 right-3 -scale-100 sm:bottom-4 sm:right-4" />

      <div className="relative">{children}</div>
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
  const reduceMotion = useReducedMotion() ?? false;
  const couplets = useMemo(() => toCouplets(type, content), [type, content]);

  if (couplets.length === 0) return null;

  const isSingle = type === "shair";

  return (
    <PoemFrame>
      {couplets.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <OrnamentDivider large={c.band !== couplets[i - 1].band} />
          )}
          <SherBlock
            index={i + 1}
            line1={c.l1}
            line2={c.l2}
            interactive={interactive}
            keyPrefix={`${type[0]}${i}`}
            showLabel={!isSingle}
            reduceMotion={reduceMotion}
          />
        </Fragment>
      ))}
    </PoemFrame>
  );
}