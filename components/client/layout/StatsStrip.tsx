"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import apiClient from "@/lib/api";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface StatsResponse {
  totalKalam: number;
  byType: { ghazal: number; nazm: number; qata: number; shair: number };
  totalComments: number;
  totalLikes: number;
  totalViews: number;
}

/* =========================================================
   THREE.JS AMBIENT BACKGROUND
========================================================= */

function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth || mount.offsetWidth || 1200;
    let height = mount.clientHeight || mount.offsetHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 14;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    /* LAYER 1 — particle field */
    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.darkOrange),
      size: 0.11,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    /* LAYER 2 — rotating rings */
    const ring1Geo = new THREE.TorusGeometry(6.2, 0.005, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.darkOrange),
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.6;
    ring1.rotation.z = Math.PI / 8;
    ring1.position.set(-3, 1, -3);
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(4.4, 0.006, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.emeraldGreen),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.y = Math.PI / 5;
    ring2.position.set(4, -1.5, -2);
    scene.add(ring2);

    /* LAYER 3 — soft glow disc */
    const glowGeo = new THREE.CircleGeometry(9, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.orangeGlow),
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -6);
    scene.add(glow);

    /* LOOP */
    let animationId = 0;
    let isVisible = true;
    let elapsed = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animationId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      if (!isVisible || prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      points.rotation.y += dt * 0.05;
      points.rotation.x += dt * 0.012;
      points.position.y = Math.sin(elapsed * 0.35) * 0.22;

      ring1.rotation.z += dt * 0.10;
      ring2.rotation.x += dt * 0.13;
      ring2.rotation.z -= dt * 0.07;

      glowMat.opacity = 0.05 + Math.sin(elapsed * 0.6) * 0.02;

      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(animate);

    /* RESIZE */
    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === "visible";
    };

    const remeasureTimer = setTimeout(handleResize, 300);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(remeasureTimer);
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      geo.dispose();
      mat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ opacity: 0.9 }}
    />
  );
}

/* =========================================================
   COUNT-UP HOOK  — FIXED
   Uses a ref for onComplete so useEffect deps stay stable.
========================================================= */

function useCountUp(
  target: number,
  duration = 1.6,
  shouldStart = false,
  onComplete?: () => void
) {
  const [value, setValue] = useState(0);

  // Store latest callbacks / targets in refs so they never trigger effect re-runs
  const onCompleteRef = useRef(onComplete);
  const hasCompletedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // Keep onComplete ref fresh without re-running the effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Cancel any previous RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // If we shouldn't animate, just jump to the final value
    if (!shouldStart) {
      setValue(0);
      hasCompletedRef.current = false;
      return;
    }

    if (target === 0) {
      setValue(0);
      hasCompletedRef.current = true;
      onCompleteRef.current?.();
      return;
    }

    hasCompletedRef.current = false;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const next = Math.max(0, Math.floor(eased * target));
      setValue(next);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        rafIdRef.current = null;
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, shouldStart]);

  return value;
}

/* =========================================================
   SPARKLE BURST
========================================================= */

function SparkleBurst({ trigger, accent }: { trigger: boolean; accent: string }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        angle: (i / 6) * Math.PI * 2 + Math.random() * 0.5,
        distance: 24 + Math.random() * 16,
        delay: Math.random() * 0.15,
      })),
    []
  );

  return (
    <AnimatePresence>
      {trigger && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {sparks.map((s) => (
            <motion.span
              key={s.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(s.angle) * s.distance,
                y: Math.sin(s.angle) * s.distance,
                opacity: 0,
                scale: 0.3,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.85,
                delay: s.delay,
                ease: "easeOut",
              }}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

/* =========================================================
   SINGLE STAT CARD
========================================================= */

function StatCard({
  label,
  urduLabel,
  value,
  index,
  shouldAnimate,
  accent,
}: {
  label: string;
  urduLabel: string;
  value: number;
  index: number;
  shouldAnimate: boolean;
  accent: string;
}) {
  const [completed, setCompleted] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Memoized callback — stable across renders
  const handleComplete = useCallback(() => {
    setCompleted(true);
    const t = setTimeout(() => setCompleted(false), 1400);
    return () => clearTimeout(t);
  }, []);

  const count = useCountUp(value, 1.6 + index * 0.15, shouldAnimate, handleComplete);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -12 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.75,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col items-center text-center"
      style={{ perspective: "800px" }}
    >
      {/* Orbiting ring behind number */}
      <motion.div
        animate={shouldAnimate ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute top-2 h-24 w-24 sm:h-28 sm:w-28"
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id={`ring-grad-${index}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
              <stop offset="50%" stopColor={accent} stopOpacity="0.1" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`url(#ring-grad-${index})`}
            strokeWidth="0.7"
            strokeDasharray="4 6"
          />
        </svg>
      </motion.div>

      {/* Number + sparkle */}
      <div className="relative">
        <motion.div
          animate={
            completed
              ? {
                  scale: [1, 1.18, 1],
                  textShadow: [
                    `0 0 0px ${accent}00`,
                    `0 0 24px ${accent}90`,
                    `0 0 0px ${accent}00`,
                  ],
                }
              : { scale: 1 }
          }
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="font-outfit text-4xl font-bold tracking-tight transition-all duration-300 sm:text-5xl md:text-6xl"
          style={{
            color: THEME.darkText,
            textShadow: hovered ? `0 0 20px ${accent}40` : "none",
          }}
          dir="ltr"
        >
          {count.toLocaleString("en-US")}
        </motion.div>

        <SparkleBurst trigger={completed} accent={accent} />
      </div>

      {/* Urdu label */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: index * 0.12 + 0.3 }}
        className="font-urdu mt-3 text-base leading-[1.8] sm:text-lg"
        style={{ color: THEME.mutedText }}
        dir="rtl"
      >
        {urduLabel}
      </motion.div>

      {/* English label */}
      <div
        className="font-outfit mt-1 text-[11px] font-medium uppercase tracking-widest opacity-60"
        style={{ color: THEME.mutedText }}
        dir="ltr"
      >
        {label}
      </div>

      {/* Growing underline */}
      <motion.span
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.9,
          delay: index * 0.12 + 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mt-4 h-[2px] w-14 origin-center rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
    </motion.div>
  );
}

/* =========================================================
   STATS STRIP
========================================================= */

export default function StatsStrip() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);
  const shimmerRef = useRef<HTMLDivElement | null>(null);

  /* FETCH */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/api/client/deewan/stats");
        if (cancelled) return;
        if (res.data?.success && res.data?.data) {
          setStats(res.data.data);
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* REVEAL via IntersectionObserver — works even if already in view */
  useEffect(() => {
    if (!sectionRef.current || loading || !stats) return;
    const el = sectionRef.current;

    // If element is already fully in view on mount, trigger immediately
    const rect = el.getBoundingClientRect();
    const alreadyInView =
      rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    if (alreadyInView) {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEntered(true);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, stats]);

  /* GSAP: parallax + heading */
  useEffect(() => {
    if (!sectionRef.current || loading || !stats) return;

    const ctx = gsap.context(() => {
      if (bgLayerRef.current) {
        gsap.to(bgLayerRef.current, {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }

      gsap.from(".stats-heading", {
        y: 25,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 78%",
        },
      });

      gsap.from(".stats-subline", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        delay: 0.3,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".stats-subline",
          start: "top 92%",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, stats]);

  /* Shimmer sweep */
  useEffect(() => {
    if (!shimmerRef.current) return;
    const el = shimmerRef.current;
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 5.5 });
    tl.fromTo(
      el,
      { x: "-120%", opacity: 0 },
      { x: "120%", opacity: 1, duration: 1.6, ease: "power2.inOut" }
    ).to(el, { opacity: 0, duration: 0.3 });
    return () => {
      tl.kill();
    };
  }, []);

  /* Loading skeleton */
  if (loading || !stats) {
    return (
      <section
        style={{ backgroundColor: THEME.strawberryWhite }}
        className="relative w-full overflow-hidden border-t py-16"
      >
        <div className="mx-auto flex max-w-6xl animate-pulse items-center justify-around gap-8 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div
                className="h-12 w-24 rounded-lg"
                style={{ backgroundColor: `${THEME.border}80` }}
              />
              <div
                className="h-4 w-20 rounded"
                style={{ backgroundColor: `${THEME.border}80` }}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const items = [
    {
      label: "Ghazals",
      urduLabel: "غزلیں",
      value: stats.byType.ghazal,
      accent: THEME.darkOrange,
    },
    {
      label: "Nazms",
      urduLabel: "نظمیں",
      value: stats.byType.nazm,
      accent: THEME.emeraldGreen,
    },
    {
      label: "Qatas",
      urduLabel: "قطعات",
      value: stats.byType.qata,
      accent: "#B45309",
    },
    {
      label: "Ashaar",
      urduLabel: "اشعار",
      value: stats.byType.shair,
      accent: THEME.orangeGlow,
    },
  ];

  return (
    <section
      ref={sectionRef}
      aria-label="Poetry Statistics"
      style={{ backgroundColor: THEME.strawberryWhite }}
      className="relative w-full overflow-hidden border-t py-16 sm:py-20"
    >
      {/* Three.js BG (parallax) */}
      <div
        ref={bgLayerRef}
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <ThreeBackground />
      </div>

      {/* CSS micro-sparkles */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 3 === 0 ? 4 : 2,
              height: i % 3 === 0 ? 4 : 2,
              backgroundColor: i % 2 === 0 ? THEME.darkOrange : THEME.emeraldGreen,
              opacity: 0.35,
              left: `${(i * 7.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
            }}
            animate={{ y: [0, -22, 0], opacity: [0.15, 0.45, 0.15] }}
            transition={{
              duration: 4 + (i % 4),
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.25,
            }}
          />
        ))}
      </div>

      {/* Radial glows */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-70"
        style={{
          background: `
            radial-gradient(circle at 15% 50%, ${THEME.darkOrange}10, transparent 45%),
            radial-gradient(circle at 85% 50%, ${THEME.emeraldGreen}10, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Top gradient line */}
      <div
        className="absolute inset-x-0 top-0 z-[2] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}80, transparent)`,
        }}
        aria-hidden="true"
      />

      {/* Shimmer */}
      <div
        ref={shimmerRef}
        className="pointer-events-none absolute inset-y-0 z-[2] w-1/3 opacity-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.orangeGlow}12, transparent)`,
          filter: "blur(40px)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="stats-heading mb-10 text-center sm:mb-14" dir="rtl">
          <p
            className="font-outfit mb-2 text-xs font-semibold uppercase tracking-[0.3em]"
            style={{ color: THEME.darkOrange }}
            dir="ltr"
          >
            The Numbers
          </p>
          <h2
            className="font-urdu text-3xl font-normal leading-[1.9] sm:text-4xl md:text-5xl"
            style={{ color: THEME.darkText }}
          >
            اعداد و شمار میں رزب
          </h2>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-5 h-[2px] w-20 origin-center rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, transparent)`,
            }}
          />
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
          {items.map((item, index) => (
            <StatCard
              key={item.label}
              label={item.label}
              urduLabel={item.urduLabel}
              value={item.value}
              index={index}
              shouldAnimate={hasEntered}
              accent={item.accent}
            />
          ))}
        </div>

        {/* Sub-line */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="stats-subline mt-12 flex flex-col items-center gap-3 text-center sm:mt-16"
          dir="rtl"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <span className="font-urdu text-sm sm:text-base" style={{ color: THEME.mutedText }}>
              کل کلام:{" "}
              <span className="font-outfit font-bold" style={{ color: THEME.darkText }} dir="ltr">
                {stats.totalKalam.toLocaleString("en-US")}
              </span>
            </span>
            <span
              className="hidden h-1 w-1 rounded-full sm:inline-block"
              style={{ backgroundColor: THEME.darkOrange }}
            />
            <span className="font-urdu text-sm sm:text-base" style={{ color: THEME.mutedText }}>
              کل تبصرے:{" "}
              <span className="font-outfit font-bold" style={{ color: THEME.darkText }} dir="ltr">
                {stats.totalComments.toLocaleString("en-US")}
              </span>
            </span>
            <span
              className="hidden h-1 w-1 rounded-full sm:inline-block"
              style={{ backgroundColor: THEME.darkOrange }}
            />
            <span className="font-urdu text-sm sm:text-base" style={{ color: THEME.mutedText }}>
              کل پسندیدگی:{" "}
              <span className="font-outfit font-bold" style={{ color: THEME.darkText }} dir="ltr">
                {stats.totalLikes.toLocaleString("en-US")}
              </span>
            </span>
          </div>
          <p
            className="font-urdu text-xs leading-[2] sm:text-sm"
            style={{ color: THEME.mutedText }}
          >
            ہر شعر ایک جذبہ، ہر غزل ایک کہانی
          </p>
        </motion.div>
      </div>
    </section>
  );
}