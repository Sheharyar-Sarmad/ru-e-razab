"use client";

import React, {
  Fragment,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import * as THREE from "three";
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
// Every sher uses up to this maximum width
const SHER_MAX_WIDTH = 880; // px

// Minimum space between two words on a misra
const MIN_WORD_GAP = "0.2em";

// Auto-fit never shrinks text below this fraction of the base size.
// If a line still doesn't fit, it wraps instead of being clipped.
const MIN_FIT_FACTOR = 0.55;

// Layout effect on the client, plain effect on the server (no SSR warning)
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
   THREE.JS BACKGROUND (Ambient Golden Dust Field)
   - safe if WebGL is unavailable
   - respects reduced motion
   - pauses when tab hidden
   - resizes with its container (ResizeObserver)
========================================================= */
function ThreeBackground({ reduceMotion }: { reduceMotion: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return; // WebGL unavailable: the CSS background still looks fine
    }

    const getSize = () => ({
      w: Math.max(1, container.clientWidth),
      h: Math.max(1, container.clientHeight),
    });

    const { w, h } = getSize();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 350;

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const count = 90;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.gold),
      size: 2.2,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let frameId = 0;
    let running = false;

    const render = () => renderer!.render(scene, camera);

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      particles.rotation.y += 0.0004;
      particles.rotation.x += 0.0002;
      render();
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      frameId = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    if (reduceMotion) render(); // single static frame
    else start();
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      const s = getSize();
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
      renderer!.setSize(s.w, s.h);
      if (!running) render();
    });
    ro.observe(container);

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (renderer!.domElement.parentNode === container) {
        container.removeChild(renderer!.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer!.dispose();
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
      aria-hidden="true"
    />
  );
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
      className={`pointer-events-none absolute h-5 w-5 sm:h-8 sm:w-8 ${className}`}
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
        large ? "my-7 sm:my-10" : "my-3 sm:my-6"
      }`}
    >
      <span
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.gold})`,
        }}
      />
      <span
        className={`shrink-0 rotate-45 ${large ? "h-2.5 w-2.5" : "h-1.5 w-1.5"}`}
        style={{ backgroundColor: THEME.rust }}
      />
      {large && (
        <>
          <span
            className="h-1.5 w-1.5 shrink-0 rotate-45 border"
            style={{ borderColor: THEME.gold }}
          />
          <span
            className="h-2.5 w-2.5 shrink-0 rotate-45"
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
    <div className="mb-1.5 flex items-center justify-center gap-2" dir="rtl">
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
   MISRA — words justified edge to edge on one line
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
      className={`flex w-full min-w-0 flex-nowrap items-baseline ${fontClass}`}
      style={{
        justifyContent: words.length === 1 ? "center" : "space-between",
        columnGap: MIN_WORD_GAP,
        color: THEME.darkText,
      }}
    >
      {words.map((word, i) => (
        <span key={`${keyPrefix}-${i}`} className="shrink-0 whitespace-nowrap">
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
   AUTO-FIT — shrinks the font only as much as needed so no
   misra ever overflows. Both lines of a sher share one size
   so they always look matched. Falls back to wrapping if the
   text would otherwise become unreadably small.
========================================================= */
function fitSher(wrapper: HTMLElement) {
  // Reset to the CSS-defined base size, then measure
  wrapper.style.fontSize = "";
  const misras = Array.from(
    wrapper.querySelectorAll<HTMLElement>("[data-misra]")
  );
  misras.forEach((m) => (m.style.flexWrap = ""));

  const base = parseFloat(getComputedStyle(wrapper).fontSize);
  if (!base || !misras.length) return;

  let factor = 1;
  misras.forEach((m) => {
    const available = m.clientWidth;
    const kids = Array.from(m.children) as HTMLElement[];
    if (!kids.length || !available) return;
    const gap = parseFloat(getComputedStyle(m).columnGap) || 0;
    const needed =
      kids.reduce((sum, k) => sum + k.getBoundingClientRect().width, 0) +
      gap * Math.max(0, kids.length - 1);
    if (needed > available) factor = Math.min(factor, available / needed);
  });

  if (factor >= 1) return;

  if (factor < MIN_FIT_FACTOR) {
    // Too long to fit on one line at a readable size: wrap instead of clip
    wrapper.style.fontSize = `${Math.floor(base * MIN_FIT_FACTOR * 100) / 100}px`;
    misras.forEach((m) => {
      m.style.flexWrap = "wrap";
      m.style.rowGap = "0.1em";
    });
    return;
  }

  wrapper.style.fontSize = `${Math.floor(base * factor * 0.98 * 100) / 100}px`;
}

/* =========================================================
   SHER BLOCK
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
  const fullSher = `${line1}\n${line2}`;
  const urdu = isUrduScript(line1 || line2);
  const textRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    let lastWidth = -1;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      fitSher(el);
    };

    run();

    // Re-fit only when the WIDTH changes (rotation, resize, sidebar toggle).
    // Ignoring height changes prevents a resize -> refit -> resize loop.
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      run();
    });
    ro.observe(el);

    // Re-fit once web fonts finish loading (glyph widths change)
    document.fonts?.ready.then(run).catch(() => {});

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [line1, line2, interactive]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: reduceMotion ? 0 : Math.min(index - 1, 8) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mx-auto w-full min-w-0 px-0.5 sm:px-3"
      style={{ maxWidth: SHER_MAX_WIDTH }}
    >
      {showLabel && <SherLabel index={index} />}
      <div
        ref={textRef}
        className={
          urdu
            ? "w-full min-w-0 space-y-0 text-[15px] font-normal leading-[2] sm:text-[17px] sm:leading-[2.05] md:text-[19px]"
            : "w-full min-w-0 space-y-0.5 text-[11px] font-normal leading-[1.6] tracking-wide sm:text-[13px] md:text-[15px]"
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
   FRAME
========================================================= */
function PoemFrame({
  children,
  reduceMotion,
}: {
  children: React.ReactNode;
  reduceMotion: boolean;
}) {
  return (
    <div
      className="relative mx-auto w-full min-w-0 max-w-full overflow-hidden rounded-[20px] border px-3 py-6 sm:rounded-[24px] sm:px-8 sm:py-10"
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
      {/* Three.js animated background */}
      <ThreeBackground reduceMotion={reduceMotion} />

      {/* Geometric star pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
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
        className="pointer-events-none absolute inset-1.5 z-0 rounded-[15px] border sm:inset-2.5 sm:rounded-[18px]"
        style={{ borderColor: THEME.goldSoft }}
      />

      {/* Corner ornaments */}
      <CornerOrnament className="left-2 top-2 z-0 sm:left-3 sm:top-3" />
      <CornerOrnament className="right-2 top-2 z-0 -scale-x-100 sm:right-3 sm:top-3" />
      <CornerOrnament className="bottom-2 left-2 z-0 -scale-y-100 sm:bottom-3 sm:left-3" />
      <CornerOrnament className="bottom-2 right-2 z-0 -scale-100 sm:bottom-3 sm:right-3" />

      <div className="relative z-10 min-w-0">{children}</div>
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

  // Nazm and shair show no "شعر N" label; ghazal and qata do.
  const showLabel = type !== "nazm" && type !== "shair";

  return (
    <PoemFrame reduceMotion={reduceMotion}>
      {couplets.map((c, i) => (
        <Fragment key={i}>
          {i > 0 &&
            (type === "nazm" && c.band === couplets[i - 1].band ? (
              // Same band in a nazm: plain spacing, no ornament
              <div aria-hidden="true" className="my-3 sm:my-5" />
            ) : (
              <OrnamentDivider large={c.band !== couplets[i - 1].band} />
            ))}
          <SherBlock
            index={i + 1}
            line1={c.l1}
            line2={c.l2}
            interactive={interactive}
            keyPrefix={`${type[0]}${i}`}
            showLabel={showLabel}
            reduceMotion={reduceMotion}
          />
        </Fragment>
      ))}
    </PoemFrame>
  );
}