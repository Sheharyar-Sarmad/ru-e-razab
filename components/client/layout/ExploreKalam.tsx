"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* =========================================================
   THEME PALETTE - STRAWBERRY WHITE ELEGANCE
========================================================= */

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
  orangeGlow: "#EA580C",
  darkOrange: "#9A3412",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  cardBg: "rgba(255, 255, 255, 0.82)",
};

/* =========================================================
   CATEGORIES DATA
========================================================= */

interface Category {
  key: string;
  urdu: string;
  english: string;
  description: string;
  href: string;
  symbol: string;
  accent: string;
  bgGlow: string;
}

const categories: Category[] = [
  {
    key: "ghazal",
    urdu: "غزل",
    english: "Ghazal",
    description: "حسن و عشق اور جذبات کی دلکش عکاسی",
    href: "/kulliyat/ghazal",
    symbol: "غ",
    accent: THEME.darkOrange,
    bgGlow: "rgba(154, 52, 18, 0.08)",
  },
  {
    key: "nazm",
    urdu: "نظم",
    english: "Nazm",
    description: "تسلسلِ فکر اور جدید اصنافِ سخن",
    href: "/kulliyat/nazm",
    symbol: "ن",
    accent: THEME.deepRed,
    bgGlow: "rgba(185, 28, 28, 0.08)",
  },
  {
    key: "qata",
    urdu: "قطعہ",
    english: "Qata",
    description: "چار مصرعوں میں بندھا گہرا مضمون",
    href: "/kulliyat/qata",
    symbol: "ق",
    accent: THEME.emeraldGreen,
    bgGlow: "rgba(4, 120, 87, 0.08)",
  },
  {
    key: "shair",
    urdu: "اشعار",
    english: "Ashaar",
    description: "مطلب و معانی سے لبریز منتخب اشعار",
    href: "/kulliyat/shair",
    symbol: "ش",
    accent: THEME.orangeGlow,
    bgGlow: "rgba(234, 88, 12, 0.08)",
  },
];

/* =========================================================
   THREE.JS AMBIENT BACKGROUND COMPONENT
========================================================= */

function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    const particleCount = 280;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.darkOrange),
      size: 0.11,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const ringGeo = new THREE.TorusGeometry(3.2, 0.006, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.darkOrange),
      transparent: true,
      opacity: 0.15,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    ring.position.set(4, -1, -2);
    scene.add(ring);

    let animationId: number;
    let isVisible = true;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (!isVisible || prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      points.rotation.y += 0.0008;
      points.rotation.x += 0.0003;
      ring.rotation.z += 0.0015;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === "visible";
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      geometry.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
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
    />
  );
}

/* =========================================================
   MAIN EXPLORE KALAM SECTION
========================================================= */

export default function ExploreKalam() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.from(".explore-eyebrow", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
        },
      });

      gsap.from(".explore-heading", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
        },
      });

      gsap.from(".explore-description", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        delay: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
        },
      });

      gsap.from(".explore-divider", {
        scaleX: 0,
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: section,
          start: "top 73%",
        },
      });

      gsap.from(".explore-card", {
        y: 45,
        opacity: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".explore-grid",
          start: "top 82%",
        },
      });

      gsap.from(".explore-footnote", {
        y: 15,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".explore-footnote",
          start: "top 90%",
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Explore Kalam Categories"
      style={{ backgroundColor: THEME.strawberryWhite }}
      className="relative flex min-h-[85vh] w-full flex-col justify-center overflow-hidden px-4 py-20 sm:px-6 sm:py-24 md:px-10 lg:px-16 xl:px-24"
    >
      <ThreeBackground />

      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          background: `
            radial-gradient(circle at 85% 30%, rgba(154, 52, 18, 0.05), transparent 45%),
            radial-gradient(circle at 15% 75%, rgba(4, 120, 87, 0.04), transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        {/* SECTION HEADER */}
        <header className="mx-auto w-full max-w-3xl text-center" dir="rtl">
          <div className="explore-eyebrow mb-3 flex items-center justify-center gap-3 sm:mb-4">
            <span
              className="h-px w-8 sm:w-12"
              style={{ backgroundColor: THEME.darkOrange }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-[0.25em] sm:text-sm"
              style={{ color: THEME.darkOrange }}
            >
              The Collection
            </span>
            <span
              className="h-px w-8 sm:w-12"
              style={{ backgroundColor: THEME.darkOrange }}
            />
          </div>

          <h2
            className="explore-heading font-urdu m-0 text-center text-4xl font-normal leading-[1.8] sm:text-5xl md:text-6xl md:leading-[1.9]"
            style={{ color: THEME.darkText }}
          >
            کلام کی دنیا
          </h2>

          <p
            className="explore-description font-urdu mx-auto mt-2 max-w-xl text-center text-base leading-[2] sm:mt-3 sm:text-lg sm:leading-[2.1] md:text-xl md:leading-[2.2]"
            style={{ color: THEME.mutedText }}
          >
            مختلف اصنافِ سخن میں بکھرے ہوئے منتخب کلام کو دریافت کیجیے
          </p>

          <div
            className="explore-divider mx-auto mt-6 h-[2px] w-20 rounded-full sm:mt-8 sm:w-28"
            style={{
              background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, transparent)`,
            }}
          />
        </header>

        {/* CATEGORY CARDS GRID */}
        <div
          className="explore-grid mx-auto mt-12 grid w-full max-w-5xl grid-cols-1 gap-6 auto-rows-fr sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:gap-8"
          dir="rtl"
        >
          {categories.map((category, index) => (
            <div key={category.key} className="explore-card h-full">
              <Link href={category.href} className="group block h-full">
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-md transition-all duration-500 hover:shadow-xl sm:p-8"
                  style={{
                    backgroundColor: THEME.cardBg,
                    borderColor: THEME.border,
                  }}
                >
                  {/* Subtle Background Accent Glow */}
                  <div
                    className="pointer-events-none absolute -inset-10 z-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 30%, ${category.bgGlow}, transparent 70%)`,
                    }}
                    aria-hidden="true"
                  />

                  {/* Serial Number Positioned Top-Right */}
                  <span
                    className="absolute right-6 top-5 text-xs font-bold tracking-widest"
                    style={{ color: THEME.mutedText, opacity: 0.5 }}
                  >
                    0{index + 1}
                  </span>

                  {/* CENTERED & ENLARGED HAROOF-E-TAHAJI DIV */}
                  <div className="relative z-10 flex shrink-0 justify-center pt-2">
                    <span
                      className="font-urdu flex h-20 w-20 items-center justify-center rounded-full border-2 pt-1 text-4xl font-bold leading-none shadow-md transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 sm:h-24 sm:w-24 sm:text-5xl"
                      style={{
                        borderColor: `${category.accent}50`,
                        backgroundColor: THEME.strawberryWhite,
                        color: category.accent,
                        boxShadow: `0 8px 24px -6px ${category.accent}25`,
                      }}
                    >
                      {category.symbol}
                    </span>
                  </div>

                  {/* Urdu Title & Description - Centered Vertically & Horizontally */}
                  <div className="relative z-10 mt-6 flex w-full flex-grow flex-col items-center justify-center pb-4 text-center">
                    <h3
                      className="font-urdu m-0 w-full text-3xl font-semibold leading-[1.8] transition-transform duration-500 group-hover:scale-105 sm:text-4xl"
                      style={{ color: THEME.darkText }}
                    >
                      {category.urdu}
                    </h3>

                    <p
                      className="font-urdu m-0 mt-2 max-w-[95%] text-sm leading-[2.2] sm:text-base"
                      style={{ color: THEME.mutedText }}
                    >
                      {category.description}
                    </p>
                  </div>

                  {/* Card Footer - Pushed to bottom with mt-auto */}
                  <div
                    className="relative z-10 mt-auto flex w-full items-center justify-between border-t pt-4"
                    style={{ borderColor: THEME.border }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: category.accent }}
                    >
                      {category.english}
                    </span>

                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-all duration-500 group-hover:-translate-x-2"
                      style={{
                        borderColor: `${category.accent}50`,
                        color: category.accent,
                        backgroundColor: THEME.strawberryWhite,
                      }}
                      aria-hidden="true"
                    >
                      ←
                    </span>
                  </div>

                  {/* Bottom Accent Line on Hover */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[3px] origin-right scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ backgroundColor: category.accent }}
                    aria-hidden="true"
                  />
                </motion.div>
              </Link>
            </div>
          ))}
        </div>

        {/* SECTION FOOTNOTE */}
        <div
          className="explore-footnote mt-12 flex items-center justify-center gap-3 text-center sm:mt-16"
          dir="rtl"
        >
          <span
            className="font-urdu text-sm sm:text-base"
            style={{ color: THEME.mutedText }}
          >
            لفظ سے معنی تک، ایک مکمل شاعری کا سفر
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: THEME.darkOrange }}
          />
        </div>
      </div>
    </section>
  );
}