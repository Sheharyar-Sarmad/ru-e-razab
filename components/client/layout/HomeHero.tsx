"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import gsap from "gsap";
import * as THREE from "three";

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#9A3412", // deepened for CTA — less orange, more burnt/classy
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export default function HomeHero() {
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const glowOuterRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------
  // THREE.js — ambient bloom / ember particle field
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const palette = [
      new THREE.Color(THEME.orangeGlow),
      new THREE.Color(THEME.deepRed),
      new THREE.Color(THEME.strawberryWhite),
    ];

    const count = 260;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 9;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      speeds[i] = 0.15 + Math.random() * 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const clock = new THREE.Clock();
    let frameId: number;

    const animate = () => {
      const t = clock.getElapsedTime();
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < count; i++) {
        const y = posAttr.getY(i);
        posAttr.setY(i, y + Math.sin(t * speeds[i] + i) * 0.0009);
      }
      posAttr.needsUpdate = true;

      particles.rotation.y += 0.0009;
      particles.rotation.x = Math.sin(t * 0.05) * 0.05;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // ---------------------------------------------------------------------
  // GSAP — entrance choreography + double-layer breathing bloom
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!heroRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-bg", {
        scale: 1.14,
        opacity: 0,
        duration: 1.8,
        ease: "power2.out",
      })
        .from(".hero-eyebrow", { y: 18, opacity: 0, duration: 0.7 }, "-=1.1")
        .from(
          ".hero-name",
          { y: 46, opacity: 0, scale: 0.96, duration: 1.1, ease: "power4.out" },
          "-=0.5",
        )
        .from(".hero-desc", { y: 20, opacity: 0, duration: 0.7 }, "-=0.3")
        .from(".hero-cta", { y: 16, opacity: 0, duration: 0.6 }, "-=0.3");

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.9,
          scale: 1.2,
          duration: 3.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      if (glowOuterRef.current) {
        gsap.to(glowOuterRef.current, {
          opacity: 0.5,
          scale: 1.3,
          duration: 5.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 0.5,
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      aria-label="Introduction to the shayar Razab Tabraiz"
      className="relative min-h-[100svh] w-full overflow-hidden"
      style={{ backgroundColor: THEME.strawberryWhite }}
    >
      {/* Background image */}
      <div className="hero-bg absolute inset-0">
        <Image
          src="/hero_home_bg.png"
          alt=""
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* Three.js ember/bloom particle layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-70"
      />

      {/* Readability overlay — radial, centered */}
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at center, rgba(26,14,8,0.35) 0%, rgba(26,14,8,0.55) 55%, rgba(26,14,8,0.75) 100%)",
        }}
      />

      {/* Outer wide halo */}
      <div
        ref={glowOuterRef}
        className="pointer-events-none absolute left-1/2 top-1/2 z-[3] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[140px] sm:h-[820px] sm:w-[820px]"
        style={{
          background: `radial-gradient(circle, ${THEME.orangeGlow}80 0%, transparent 70%)`,
        }}
      />

      {/* Inner tight bloom behind name */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute left-1/2 top-1/2 z-[3] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[100px] sm:h-[520px] sm:w-[520px]"
        style={{
          background: `radial-gradient(circle, ${THEME.strawberryWhite}CC 0%, ${THEME.orangeGlow}99 45%, transparent 75%)`,
        }}
      />

      {/* Content — fully centered */}
      <div className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-4 py-24 text-center sm:px-6 md:px-10 lg:px-16">
        <div className="flex max-w-3xl flex-col items-center">
          <p
            className="hero-eyebrow mb-4 text-xs font-urdu font-medium uppercase tracking-[0.3em] sm:text-sm"
            style={{ color: THEME.strawberryWhite, opacity: 0.85 }}
          >
            روئے رزب — شاعر کا تعارف
          </p>

          <h1
            dir="rtl"
            className="hero-name font-urdu text-6xl leading-[1.35] sm:text-7xl md:text-8xl lg:text-9xl"
            style={{
              color: THEME.strawberryWhite,
              textShadow: `0 0 60px ${THEME.orangeGlow}66, 0 0 120px ${THEME.orangeGlow}33`,
            }}
          >
            رزب تبریز
          </h1>

          <p
            dir="rtl"
            className="hero-desc font-urdu mt-12 max-w-lg text-sm leading-loose sm:mt-14 sm:text-base md:max-w-xl"
            style={{ color: THEME.strawberryWhite, opacity: 0.85 }}
          >
            جدید اردو ادب میں ایک منفرد آواز، جس کا کلام احساسات کی گہرائی اور
            زبان کی نزاکت کا حسین امتزاج ہے۔
          </p>

          <div className="hero-cta mt-9 sm:mt-11">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Link
                href="/kulliyat"
                dir="rtl"
                className="mt-[-2vw] inline-flex min-w-[160px] items-center justify-center rounded-sm px-8 py-3 text-center shadow-[0_8px_30px_rgba(154,52,18,0.45)] transition-all duration-300 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: THEME.darkOrange,
                  color: THEME.strawberryWhite,
                  height: "58px",
                }}
              >
                <span
                  className="block"
                  style={{
                    fontFamily: "var(--font-urdu), 'Noto Nastaliq Urdu', serif",
                    fontSize: "18px",
                    fontWeight: 400,
                    lineHeight: "1",
                    direction: "rtl",
                    textAlign: "center",
                    width: "100%",
                    transform: "translateY(-5px)",
                    whiteSpace: "nowrap",
                  }}
                >
                  کلام پڑھیں
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
