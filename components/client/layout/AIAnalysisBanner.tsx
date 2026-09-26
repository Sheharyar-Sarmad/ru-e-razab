"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* =========================================================
   DARK THEME PALETTE
========================================================= */
const THEME = {
  darkBg: "#0F0A09",       // Deep espresso/charcoal
  creamText: "#FDFBF7",    // Soft cream for headings
  mutedText: "#A89B96",    // Muted warm gray for descriptions
  border: "#2A1E1A",       // Subtle dark border
  orangeGlow: "#EA580C",   // Bright orange for accents
  particleColor: "#F59E0B",// Amber/Gold for Three.js particles
  rustBase: "#9A3412",     // Dark orange rust
  rustDark: "#7C2D12",     // Even darker rust for gradient
};

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

    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.particleColor),
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const ringGeo = new THREE.TorusGeometry(3.2, 0.006, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.particleColor),
      transparent: true,
      opacity: 0.25,
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
   AI FEATURES DATA (URDU)
========================================================= */
const aiFeatures = [
  {
    title: "الفاظ کا تجزیہ",
    desc: "اے آئی مشکل الفاظ کے معانی اور ان کے سیاق و سباق کو سمجھنے میں مدد کرتا ہے۔",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l3-9 5 18 3-9h5"/>
      </svg>
    ),
  },
  {
    title: "موضوع کی نشاندہی",
    desc: "اے آئی خودکار طور پر غزل یا نظم کے مرکزی موضوعات جیسے عشق، حسن اور تصوف کی نشاندہی کرتا ہے۔",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    title: "بحر اور وزن",
    desc: "شاعری کی بحر، وزن اور ردیف و قافیہ کا فنی تجزیہ جدید اے آئی ٹیکنالوجی کے ذریعے۔",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
];

export default function AIAnalysisBanner() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.from(".ai-eyebrow", {
        y: 18, opacity: 0, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 80%" },
      });

      gsap.from(".ai-heading", {
        y: 30, opacity: 0, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 78%" },
      });

      gsap.from(".ai-subheading", {
        y: 20, opacity: 0, duration: 0.7, delay: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 75%" },
      });

      gsap.from(".ai-feature", {
        y: 45, opacity: 0, duration: 0.85, stagger: 0.15, ease: "power3.out",
        scrollTrigger: { trigger: ".ai-grid", start: "top 82%" },
      });

      gsap.from(".ai-cta", {
        y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: "power3.out",
        scrollTrigger: { trigger: ".ai-cta", start: "top 90%" },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative w-full overflow-hidden py-24 px-4 sm:px-6 lg:px-8 border-t"
      style={{ 
        backgroundColor: THEME.darkBg,
        borderColor: THEME.border 
      }}
    >
      {/* Three.js Ambient Background */}
      <ThreeBackground />

      {/* Subtle Gradient Overlay for Dark Mode */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
        style={{
          background: `
            radial-gradient(circle at 50% 100%, rgba(234, 88, 12, 0.15), transparent 60%),
            radial-gradient(circle at 0% 0%, rgba(4, 120, 87, 0.05), transparent 50%)
          `
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center flex flex-col items-center" dir="rtl">
        
        {/* Decorative Urdu Divider */}
        <div className="ai-eyebrow mb-6 flex items-center justify-center gap-4">
          <span className="h-px w-12 sm:w-16" style={{ backgroundColor: THEME.orangeGlow }} />
          <span className="font-urdu text-2xl" style={{ color: THEME.orangeGlow }}>✦</span>
          <span className="h-px w-12 sm:w-16" style={{ backgroundColor: THEME.orangeGlow }} />
        </div>

        {/* Urdu Heading */}
        <h2 
          className="ai-heading font-urdu m-0 text-4xl font-normal leading-[1.8] sm:text-5xl md:text-6xl md:leading-[1.9]"
          style={{ color: THEME.creamText }}
        >
          اے آئی کے ساتھ کلام کا تجزیہ
        </h2>

        {/* Urdu Subheading */}
        <p 
          className="ai-subheading font-urdu mx-auto mt-4 max-w-2xl text-center text-base leading-[2.2] sm:text-lg sm:leading-[2.4]"
          style={{ color: THEME.mutedText }}
        >
          کلاسیکی اردو ادب اور جدید مصنوعی ذہانت کا سنگم۔ ہمارا اے آئی انجن الفاظ، موضوعات اور جذباتی گہرائی کا تجزیہ کرتا ہے تاکہ آپ شاعری کو بہتر طور پر سمجھ سکیں۔
        </p>

        {/* AI Features - Clean Banner Layout (No Cards) */}
        <div className="ai-grid mt-14 grid w-full grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {aiFeatures.map((feature, index) => (
            <div
              key={index}
              className="ai-feature flex flex-col items-center text-center"
            >
              <div 
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border"
                style={{ 
                  borderColor: `${THEME.orangeGlow}50`, 
                  color: THEME.orangeGlow,
                  backgroundColor: `${THEME.orangeGlow}15`
                }}
              >
                {feature.icon}
              </div>
              
              <h3 
                className="font-urdu text-2xl font-semibold sm:text-3xl"
                style={{ color: THEME.creamText }}
              >
                {feature.title}
              </h3>
              
              <div 
                className="my-3 h-[2px] w-12 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${THEME.orangeGlow}, transparent)` }}
              />
              
              <p 
                className="font-urdu mt-2 text-sm leading-[2.2] sm:text-base sm:leading-[2.4]"
                style={{ color: THEME.mutedText }}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="ai-cta mt-16 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Primary CTA - AI Chat - EXTREMELY CLASSY HOVER */}
          <Link
            href="/ai/chat"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[#B45309]/30 bg-gradient-to-br from-[#9A3412] to-[#7C2D12] px-10 py-4 text-center font-urdu text-lg font-semibold text-[#FFF7F4] shadow-[0_4px_20px_-5px_rgba(154,52,18,0.5)] transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-[#B45309]/60 hover:shadow-[0_10px_40px_-10px_rgba(234,88,12,0.6)] active:translate-y-0 active:scale-95"
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full" />
            
            {/* Text and Icon */}
            <span className="relative z-10 flex items-center gap-3">
              اے آئی سے گفتگو کریں
              <svg 
                className="h-5 w-5 transition-transform duration-500 ease-out group-hover:translate-x-1 group-hover:scale-110" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
          </Link>
        </div>

      </div>
    </section>
  );
}