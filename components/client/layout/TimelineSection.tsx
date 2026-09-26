"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* =========================================================
   THEME
========================================================= */
const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  gold: "#D4A24E",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

/* =========================================================
   TYPES
========================================================= */
type IconName = "pen" | "heart" | "newspaper" | "radio" | "group" | "star";

interface Milestone {
  year: string;
  titleUrdu: string;
  titleEnglish: string;
  descUrdu: string;
  descEnglish: string;
  accent: string;
  icon: IconName;
}

/* =========================================================
   MILESTONES
========================================================= */
const milestones: Milestone[] = [
  {
    year: "بچپن",
    titleUrdu: "پہلا کلام — نو برس کی عمر میں",
    titleEnglish: "First Verse at Nine",
    descUrdu:
      "جب عمر محض نو برس تھی، قلم نے پہلی بار دل کی بات کاغذ پر اتاری۔ وہ پہلا کلام آج بھی اُس معصوم جذبے کی گواہی دیتا ہے جو بعد میں ایک مکمل ادبی سفر بن گیا۔",
    descEnglish:
      "At the age of just nine, the pen first touched paper — a moment that quietly began a lifelong literary journey.",
    accent: THEME.darkOrange,
    icon: "pen",
  },
  {
    year: "شروعات",
    titleUrdu: "رومانویت کا آغاز",
    titleEnglish: "The Romantic Voice Emerges",
    descUrdu:
      "اُن کے کلام میں رومانویت کی وہ شدت تھی جو صرف چند شعراء کو نصیب ہوتی ہے۔ عشق، حسن، اور دلی کیفیات کو اُن سے زیادہ سلیقے سے بیان کرنا کم لوگوں کے بس کی بات ہے۔",
    descEnglish:
      "An intensity of romance in his verses that few poets have ever achieved — love, beauty, and the ache of the heart, rendered with rare finesse.",
    accent: "#B91C1C",
    icon: "heart",
  },
  {
    year: "الفاظ",
    titleUrdu: "الفاظ کی ندرت و نفاست",
    titleEnglish: "A Rare Command of Words",
    descUrdu:
      "لفظوں کے انتخاب میں وہ ندرت اور نفاست ہے جو اُن کے ہر مصرعے میں جھلکتی ہے۔ کوئی لفظ بے مقصد نہیں، ہر ترکیب ایک نیا معنی بناتی ہے۔",
    descEnglish:
      "A rarity and refinement in word choice that shines through every line — no word wasted, every phrase inventing a new meaning.",
    accent: THEME.orangeGlow,
    icon: "star",
  },
  {
    year: "اخبار",
    titleUrdu: "اخبارات میں پزیرائی",
    titleEnglish: "Featured in Newspapers",
    descUrdu:
      "ملک کے معروف ادبی اخبارات اور رسائل نے اُن کے کلام کو نمایاں کیا۔ اُن کی شاعری پر تبصرے، تعریفی مضامین اور تجزیے شائع ہوئے — یہ ایک شاعر کے لیے سب سے بڑا اعزاز ہے۔",
    descEnglish:
      "Leading literary newspapers and journals featured his verses, published tributes, reviews, and analyses — the highest honour for any poet.",
    accent: THEME.emeraldGreen,
    icon: "newspaper",
  },
  {
    year: "ریڈیو",
    titleUrdu: "ریڈیو پر تلاوت",
    titleEnglish: "Recited on Radio",
    descUrdu:
      "ان کے کلام کو ریڈیو پر پڑھا گیا، اور سننے والوں کے دلوں میں اُتر گیا۔ آواز اور لفظ کا وہ سنگم ایک یادگار تجربہ تھا۔",
    descEnglish:
      "His verses were recited on radio — a marriage of voice and word that left a lasting mark on listeners.",
    accent: "#7C2D12",
    icon: "radio",
  },
  {
    year: "ادبی حلقے",
    titleUrdu: "ادبی حلقوں میں نمایاں مقام",
    titleEnglish: "A Recognised Name in Adbi Circles",
    descUrdu:
      "ادبی حلقوں، محافلِ سخن اور ادبی گروہوں میں اُن کا نام عزت سے لیا جاتا ہے۔ بہت سے اہلِ قلم اُن کے کلام کو ایک معیار مانتے ہیں۔",
    descEnglish:
      "Respected and celebrated across literary circles, gatherings, and adbi groups — a benchmark for many fellow writers.",
    accent: "#0369A1",
    icon: "group",
  },
  {
    year: "آج",
    titleUrdu: "مشاعرے سے کنارہ، شاعری سے وفا",
    titleEnglish: "No Mushaira, Only Poetry",
    descUrdu:
      "دلچسپ بات یہ ہے کہ اُنہوں نے آج تک کسی مشاعرے میں شرکت نہیں کی۔ نہ کوئی فیس بک پر چہرہ دکھایا، نہ سوشل میڈیا پر خود کو نمایاں کیا۔ اُن کی پہچان صرف اُن کا کلام ہے — اور یہی اُن کی اصل عظمت ہے۔",
    descEnglish:
      "Remarkably, he has never attended a mushaira. No face reveal on Facebook. No self-promotion on social media. His identity is his verse — and that is his true greatness.",
    accent: "#7E22CE",
    icon: "star",
  },
];

/* =========================================================
   ICONS
========================================================= */
function MilestoneIcon({ icon, color }: { icon: IconName; color: string }) {
  const baseProps = {
    className: "h-6 w-6",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (icon) {
    case "pen":
      return (
        <svg {...baseProps}>
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      );
    case "heart":
      return (
        <svg {...baseProps}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "newspaper":
      return (
        <svg {...baseProps}>
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
          <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
        </svg>
      );
    case "radio":
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="2" />
          <path d="M4.93 19.07a10 10 0 0 1 0-14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 16.24a6 6 0 0 1 0-8.49M16.24 7.76a6 6 0 0 1 0 8.49" />
        </svg>
      );
    case "group":
      return (
        <svg {...baseProps}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "star":
    default:
      return (
        <svg {...baseProps}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
  }
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
    let height = mount.clientHeight || mount.offsetHeight || 800;

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

    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cGold = new THREE.Color(THEME.gold);
    const cOrange = new THREE.Color(THEME.darkOrange);
    const cEmerald = new THREE.Color(THEME.emeraldGreen);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;

      const pick = Math.random();
      const c = pick < 0.55 ? cGold : pick < 0.85 ? cOrange : cEmerald;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const ring1Geo = new THREE.TorusGeometry(7.5, 0.005, 16, 140);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.darkOrange),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.7;
    ring1.rotation.z = Math.PI / 9;
    ring1.position.set(-4, 1, -4);
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(5.2, 0.006, 16, 140);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.emeraldGreen),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 2;
    ring2.rotation.y = Math.PI / 5;
    ring2.position.set(5, -2, -3);
    scene.add(ring2);

    const glowGeo = new THREE.CircleGeometry(11, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.orangeGlow),
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -7);
    scene.add(glow);

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

      points.rotation.y += dt * 0.045;
      points.rotation.x += dt * 0.01;
      points.position.y = Math.sin(elapsed * 0.3) * 0.25;

      ring1.rotation.z += dt * 0.09;
      ring2.rotation.x += dt * 0.12;
      ring2.rotation.z -= dt * 0.06;

      glowMat.opacity = 0.04 + Math.sin(elapsed * 0.5) * 0.02;

      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(animate);

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

    const remeasureTimer = setTimeout(handleResize, 350);

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
      style={{ opacity: 0.85 }}
    />
  );
}

/* =========================================================
   MAIN
========================================================= */
export default function TimelineSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const desktopLineRef = useRef<HTMLDivElement | null>(null);
  const mobileLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const raf = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    const fontReady = (document as any).fonts?.ready;
    if (fontReady?.then) {
      fontReady.then(() => ScrollTrigger.refresh());
    }

    const ctx = gsap.context(() => {
      /* -------- 1) Vertical progress line -------- */
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
              end: "bottom 80%",
              scrub: 0.4,
            },
          }
        );
      }

      /* -------- 2) Heading -------- */
      gsap.from(".timeline-heading", {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      });

      /* -------- 3) Cards — slide from LEFT or RIGHT based on visual position --------
         - Card physically on the LEFT of the center line → slides in FROM the left
         - Card physically on the RIGHT of the center line → slides in FROM the right
         - Mobile (stacked) → always slides from the right (natural reading order)
         - Opacity starts at 0.15 (not 0) → always faintly visible, fades to 1
         - scrub ties progress to scroll → no time-based gap, ever
      ---------------------------------------------------------- */
      const items = gsap.utils.toArray<HTMLElement>(".timeline-item");

      items.forEach((item, index) => {
        if (prefersReducedMotion) {
          gsap.set(item, { opacity: 1, x: 0 });
          return;
        }

        // Visual position: even index = LEFT of center, odd = RIGHT
        const isLeft = index % 2 === 0;
        const fromX = isLeft ? -50 : 50;

        gsap.fromTo(
          item,
          {
            opacity: 0.15,
            x: fromX,
          },
          {
            opacity: 1,
            x: 0,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top bottom",
              end: "top 55%",
              scrub: 0.4,
              invalidateOnRefresh: true,
            },
          }
        );
      });

      /* -------- 4) Closing note -------- */
      gsap.from(".timeline-closing", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".timeline-closing",
          start: "top 92%",
        },
      });
    }, sectionRef);

    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Literary Journey Timeline"
      style={{ backgroundColor: THEME.strawberryWhite }}
      className="relative w-full overflow-hidden border-t py-24 sm:py-32"
    >
      <ThreeBackground />

      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `
            radial-gradient(circle at 18% 8%, ${THEME.darkOrange}10, transparent 40%),
            radial-gradient(circle at 82% 92%, ${THEME.emeraldGreen}0F, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-x-0 top-0 z-[2] h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}70, transparent)`,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
        {/* Heading */}
        <div className="timeline-heading mb-16 text-center" dir="rtl">
          <p
            className="font-outfit mb-3 text-xs font-semibold uppercase tracking-[0.3em]"
            style={{ color: THEME.darkOrange }}
            dir="ltr"
          >
            The Journey
          </p>
          <h2
            className="font-urdu text-3xl font-normal leading-[1.9] sm:text-4xl md:text-5xl"
            style={{ color: THEME.darkText }}
          >
            ایک شاعر کا سفر
          </h2>
          <p
            className="font-urdu mx-auto mt-4 max-w-2xl text-sm leading-[2.2] sm:text-base sm:leading-[2.3]"
            style={{ color: THEME.mutedText }}
          >
            نو برس کی عمر سے آج تک — لفظوں، جذبوں اور خاموش عظمت کی داستان
          </p>
          <div
            className="mx-auto mt-6 h-[2px] w-20 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, transparent)`,
            }}
          />
        </div>

        {/* Timeline list */}
        <div className="timeline-list relative" dir="rtl">
          {/* Desktop center line */}
          <div
            ref={desktopLineRef}
            className="absolute top-0 bottom-0 hidden md:block"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              width: "2px",
              backgroundColor: THEME.border,
            }}
            aria-hidden="true"
          >
            <div
              ref={lineRef}
              className="h-full w-full origin-top"
              style={{
                background: `linear-gradient(180deg, ${THEME.darkOrange}, ${THEME.orangeGlow}, ${THEME.emeraldGreen})`,
              }}
            />
          </div>

          {/* Mobile right-side line */}
          <div
            ref={mobileLineRef}
            className="absolute top-0 bottom-0 md:hidden"
            style={{
              right: "20px",
              width: "2px",
              backgroundColor: THEME.border,
            }}
            aria-hidden="true"
          >
            <div
              className="h-full w-full origin-top"
              style={{
                background: `linear-gradient(180deg, ${THEME.darkOrange}, ${THEME.orangeGlow}, ${THEME.emeraldGreen})`,
              }}
            />
          </div>

          <ul className="space-y-16 md:space-y-24">
            {milestones.map((m, index) => {
              const isLeft = index % 2 === 0;

              return (
                <li
                  key={index}
                  className="timeline-item relative md:grid md:grid-cols-2 md:gap-12"
                >
                  {/* Node dot */}
                  <span
                    className="absolute z-10 flex items-center justify-center rounded-full border-2 shadow-md md:left-1/2 md:-translate-x-1/2"
                    style={{
                      top: "8px",
                      right: "8px",
                      width: "28px",
                      height: "28px",
                      backgroundColor: THEME.strawberryWhite,
                      borderColor: m.accent,
                      boxShadow: `0 4px 14px -4px ${m.accent}80`,
                    }}
                    aria-hidden="true"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: m.accent }}
                    />
                  </span>

                  {/* Card */}
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                    className={`
                      relative
                      ml-0 mr-12 md:mr-0
                      ${
                        isLeft
                          ? "md:col-start-1 md:pl-0 md:pr-10"
                          : "md:col-start-2 md:pl-10"
                      }
                    `}
                  >
                    <div
                      className="group relative rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg sm:p-7"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.82)",
                        borderColor: THEME.border,
                      }}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <span
                          className="font-urdu rounded-full px-3 py-1 text-sm font-semibold leading-[1.6]"
                          style={{
                            backgroundColor: `${m.accent}15`,
                            color: m.accent,
                          }}
                        >
                          {m.year}
                        </span>

                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full border transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"
                          style={{
                            borderColor: `${m.accent}50`,
                            backgroundColor: `${m.accent}10`,
                          }}
                        >
                          <MilestoneIcon icon={m.icon} color={m.accent} />
                        </span>
                      </div>

                      <h3
                        className="font-urdu text-xl font-semibold leading-[1.9] sm:text-2xl"
                        style={{ color: THEME.darkText }}
                      >
                        {m.titleUrdu}
                      </h3>

                      <p
                        className="font-outfit mt-1 text-[11px] font-bold uppercase tracking-widest opacity-60"
                        style={{ color: THEME.mutedText }}
                        dir="ltr"
                      >
                        {m.titleEnglish}
                      </p>

                      <p
                        className="font-urdu mt-4 text-sm leading-[2.2] sm:text-base sm:leading-[2.3]"
                        style={{ color: THEME.mutedText }}
                      >
                        {m.descUrdu}
                      </p>

                      <p
                        className="font-outfit mt-3 text-xs leading-relaxed opacity-70"
                        style={{ color: THEME.mutedText }}
                        dir="ltr"
                      >
                        {m.descEnglish}
                      </p>

                      <span
                        className="absolute bottom-0 left-6 right-6 h-[2px] origin-right scale-x-0 rounded-full transition-transform duration-500 group-hover:scale-x-100"
                        style={{ backgroundColor: m.accent }}
                        aria-hidden="true"
                      />
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Closing note */}
        <div className="timeline-closing mt-20 text-center" dir="rtl">
          <div
            className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border"
            style={{
              borderColor: `${THEME.darkOrange}40`,
              backgroundColor: `${THEME.darkOrange}10`,
            }}
          >
            <svg
              className="h-5 w-5"
              style={{ color: THEME.darkOrange }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z"
              />
            </svg>
          </div>
          <p
            className="font-urdu mx-auto max-w-2xl text-base leading-[2.2] sm:text-lg sm:leading-[2.3]"
            style={{ color: THEME.darkText }}
          >
            اُن کی شاعری اُن کی پہچان ہے — چہرے کی نہیں، لفظوں کی۔
          </p>
          <p
            className="font-outfit mt-3 text-xs italic opacity-60"
            style={{ color: THEME.mutedText }}
            dir="ltr"
          >
            His poetry is his identity — not his face, but his words.
          </p>
        </div>
      </div>
    </section>
  );
}