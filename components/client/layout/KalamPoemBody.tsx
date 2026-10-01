"use client";

import React, {
  Fragment,
  memo,
  useEffect,
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
const SHER_MAX_WIDTH = 760; // px

// Minimum space between two words on a misra
const MIN_WORD_GAP = "0.2em";

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
   THREE.JS BACKGROUND (Classy Ambient Golden Dust Field)
========================================================= */
function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 350;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      particles.rotation.y += 0.0004;
      particles.rotation.x += 0.0002;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[24px]"
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
      className={`pointer-events-none absolute h-6 w-6 sm:h-8 sm:w-8 ${className}`}
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
        large ? "my-8 sm:my-10" : "my-4 sm:my-6"
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
   MISRA — Justified words spreading edge to edge
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
   SHER BLOCK — Compact Font Sizing & Fixed Weight
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

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: reduceMotion ? 0 : Math.min(index - 1, 8) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mx-auto w-full px-2 sm:px-4"
      style={{ maxWidth: SHER_MAX_WIDTH }}
    >
      {showLabel && <SherLabel index={index} />}
      <div
        className={
          urdu
            ? "space-y-0.5 text-base sm:text-lg md:text-xl font-normal leading-[2.1] sm:leading-[2.2]"
            : "space-y-0.5 text-xs sm:text-sm md:text-base font-normal leading-[1.6] tracking-wide"
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
   FRAME — Maximized width container with outer margin removed
========================================================= */
function PoemFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-[24px] border px-2 py-7 sm:px-5 sm:py-10"
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
      <ThreeBackground />

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
        className="pointer-events-none absolute inset-1.5 z-0 rounded-[18px] border sm:inset-2.5"
        style={{ borderColor: THEME.goldSoft }}
      />

      {/* Corner ornaments */}
      <CornerOrnament className="left-2 top-2 z-0 sm:left-3 sm:top-3" />
      <CornerOrnament className="right-2 top-2 z-0 -scale-x-100 sm:right-3 sm:top-3" />
      <CornerOrnament className="bottom-2 left-2 z-0 -scale-y-100 sm:bottom-3 sm:left-3" />
      <CornerOrnament className="bottom-2 right-2 z-0 -scale-100 sm:bottom-3 sm:right-3" />

      <div className="relative z-10">{children}</div>
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
    <PoemFrame>
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