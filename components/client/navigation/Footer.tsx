"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import gsap from "gsap";
import * as THREE from "three";

export default function Footer() {
  const footerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ---------------------------------------------------------------------------
  // Footer Theme
  // Primary: Strawberry White
  // Secondary: Dark Orange / Emerald Green / Deep Red
  // ---------------------------------------------------------------------------
  const FOOTER_COLORS = {
    strawberryWhite: "#FFF7F4",
    darkOrange: "#C2410C",
    orangeGlow: "#EA580C",
    emeraldGreen: "#047857",
    deepRed: "#B91C1C",
    darkText: "#3A211B",
    mutedText: "#76584F",
    border: "#F2D6CF",
  };

  // ---------------------------------------------------------------------------
  // Real Social Media Brand Colors
  // ---------------------------------------------------------------------------
  const SOCIAL_COLORS = {
    youtube: "#FF0000",
    facebook: "#1877F2",
    instagramPurple: "#833AB4",
    instagramPink: "#E1306C",
    instagramRed: "#FD1D1D",
    instagramOrange: "#F77737",
    instagramYellow: "#FCAF45",
  };

  // ---------------------------------------------------------------------------
  // THREE.JS Ambient 3D Particle Scene
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Footer sub-theme particles
    const palette = [
      new THREE.Color(FOOTER_COLORS.darkOrange),
      new THREE.Color(FOOTER_COLORS.emeraldGreen),
      new THREE.Color(FOOTER_COLORS.deepRed),
      new THREE.Color(FOOTER_COLORS.orangeGlow),
    ];

    const count = 150;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const randomColor = palette[
        Math.floor(Math.random() * palette.length)
      ];

      colors[i * 3] = randomColor.r;
      colors[i * 3 + 1] = randomColor.g;
      colors[i * 3 + 2] = randomColor.b;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
    });

    const particles = new THREE.Points(geometry, material);

    scene.add(particles);

    camera.position.z = 5;

    let animationFrameId: number;

    const animate = () => {
      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.00035;

      renderer.render(scene, camera);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // -------------------------------------------------------------------------
    // Resize Handler
    // -------------------------------------------------------------------------
    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // GSAP Animations
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!footerRef.current) return;

    const ctx = gsap.context(() => {
      // Footer column reveal
      gsap.from(".footer-column", {
        y: 35,
        opacity: 0,
        duration: 0.85,
        stagger: 0.15,
        ease: "power3.out",
      });

      // Animated top gradient line
      gsap.to(".glowing-line", {
        backgroundPosition: "200% center",
        duration: 6,
        repeat: -1,
        ease: "linear",
      });
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      style={{
        backgroundColor: FOOTER_COLORS.strawberryWhite,
        color: FOOTER_COLORS.darkText,
      }}
      className="relative overflow-hidden border-t mt-auto z-10"
    >
      {/* ------------------------------------------------------------------ */}
      {/* 3D Particle Background                                            */}
      {/* ------------------------------------------------------------------ */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-50"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Animated Top Border                                                */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="glowing-line h-1 w-full relative z-10"
        style={{
          backgroundImage: `linear-gradient(
            90deg,
            ${FOOTER_COLORS.darkOrange},
            ${FOOTER_COLORS.deepRed},
            ${FOOTER_COLORS.emeraldGreen},
            ${FOOTER_COLORS.orangeGlow},
            ${FOOTER_COLORS.darkOrange}
          )`,
          backgroundSize: "200% auto",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* ---------------------------------------------------------------- */}
          {/* Brand Column                                                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="footer-column space-y-4 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-3 group"
            >
              <motion.div
                whileHover={{
                  rotate: 360,
                  scale: 1.1,
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/logo.png"
                  alt="روئے رزب"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
              </motion.div>

              <span
                style={{
                  color: FOOTER_COLORS.darkOrange,
                }}
                className="font-bold text-2xl tracking-wide font-urdu"
              >
                روئے رزب
              </span>
            </Link>

            <p
              style={{
                color: FOOTER_COLORS.mutedText,
              }}
              className="font-urdu text-sm leading-relaxed dir-rtl"
            >
              اردو ادب، غزل، نظم اور کلاسیکی کلام کا ایک منفرد
              اور خوبصورت ڈیجیٹل مرکز۔
            </p>

            <p
              style={{
                color: FOOTER_COLORS.mutedText,
              }}
              className="text-xs leading-relaxed"
            >
              A modern digital sanctuary for classical Urdu poetry,
              ghazals, nazms, and literary works.
            </p>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Quick Links                                                      */}
          {/* ---------------------------------------------------------------- */}
          <div className="footer-column">
            <h3
              style={{
                color: FOOTER_COLORS.darkOrange,
              }}
              className="text-sm font-bold tracking-wider uppercase mb-4 flex items-center justify-between"
            >
              <span>Quick Links</span>

              <span
                style={{
                  color: FOOTER_COLORS.deepRed,
                }}
                className="font-urdu text-xs font-normal"
              >
                (اہم لنکس)
              </span>
            </h3>

            <ul className="space-y-2.5 text-sm">
              {[
                {
                  name: "Home",
                  urdu: "صفحہ اول",
                  href: "/",
                },
                {
                  name: "Ghazals",
                  urdu: "غزلیں",
                  href: "/ghazals",
                },
                {
                  name: "Nazms",
                  urdu: "نظمیں",
                  href: "/nazms",
                },
                {
                  name: "Kulliyat",
                  urdu: "کلیات",
                  href: "/kulliyat",
                },
              ].map((link, i) => (
                <motion.li
                  key={i}
                  whileHover={{
                    x: 6,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <Link
                    href={link.href}
                    className="flex items-center justify-between transition-colors group"
                    style={{
                      color: FOOTER_COLORS.darkText,
                    }}
                  >
                    <span className="group-hover:text-[#C2410C] transition-colors">
                      {link.name}
                    </span>

                    <span
                      style={{
                        color: FOOTER_COLORS.mutedText,
                      }}
                      className="font-urdu text-xs opacity-75 group-hover:text-[#047857] transition-colors"
                    >
                      {link.urdu}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Kalam Categories                                                 */}
          {/* ---------------------------------------------------------------- */}
          <div className="footer-column">
            <h3
              style={{
                color: FOOTER_COLORS.darkOrange,
              }}
              className="text-sm font-bold tracking-wider uppercase mb-4 flex items-center justify-between"
            >
              <span>Kalam Categories</span>

              <span
                style={{
                  color: FOOTER_COLORS.deepRed,
                }}
                className="font-urdu text-xs font-normal"
              >
                (کلام کی اقسام)
              </span>
            </h3>

            <ul className="space-y-2.5 text-sm">
              {[
                {
                  name: "Qata",
                  urdu: "قطعات",
                  href: "/qata",
                },
                {
                  name: "Shair",
                  urdu: "اشعار",
                  href: "/shair",
                },
                {
                  name: "Account Settings",
                  urdu: "ترتیبات",
                  href: "/account/settings",
                },
              ].map((link, i) => (
                <motion.li
                  key={i}
                  whileHover={{
                    x: 6,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <Link
                    href={link.href}
                    className="flex items-center justify-between transition-colors group"
                    style={{
                      color: FOOTER_COLORS.darkText,
                    }}
                  >
                    <span className="group-hover:text-[#C2410C] transition-colors">
                      {link.name}
                    </span>

                    <span
                      style={{
                        color: FOOTER_COLORS.mutedText,
                      }}
                      className="font-urdu text-xs opacity-75 group-hover:text-[#B91C1C] transition-colors"
                    >
                      {link.urdu}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Social Links                                                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="footer-column">
            <h3
              style={{
                color: FOOTER_COLORS.darkOrange,
              }}
              className="text-sm font-bold tracking-wider uppercase mb-4 flex items-center justify-between"
            >
              <span>Follow Us</span>

              <span
                style={{
                  color: FOOTER_COLORS.deepRed,
                }}
                className="font-urdu text-xs font-normal"
              >
                (ہم سے جڑیے)
              </span>
            </h3>

            <p
              style={{
                color: FOOTER_COLORS.mutedText,
              }}
              className="text-xs mb-4"
            >
              Connect with us on our official social media platforms.
            </p>

            <div className="flex items-center space-x-3.5">

              {/* YouTube - Real Red */}
              <motion.a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                whileHover={{
                  scale: 1.15,
                  rotate: 6,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                style={{
                  backgroundColor: SOCIAL_COLORS.youtube,
                  color: "#FFFFFF",
                  borderColor: SOCIAL_COLORS.youtube,
                }}
                className="p-2.5 rounded-full shadow-sm border"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </motion.a>

              {/* Facebook - Real Blue */}
              <motion.a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                whileHover={{
                  scale: 1.15,
                  rotate: -6,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                style={{
                  backgroundColor: SOCIAL_COLORS.facebook,
                  color: "#FFFFFF",
                  borderColor: SOCIAL_COLORS.facebook,
                }}
                className="p-2.5 rounded-full shadow-sm border"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </motion.a>

              {/* Instagram - Real Gradient */}
              <motion.a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                whileHover={{
                  scale: 1.15,
                  rotate: 6,
                }}
                whileTap={{
                  scale: 0.9,
                }}
                style={{
                  background: `linear-gradient(
                    135deg,
                    ${SOCIAL_COLORS.instagramPurple} 0%,
                    ${SOCIAL_COLORS.instagramPink} 35%,
                    ${SOCIAL_COLORS.instagramRed} 55%,
                    ${SOCIAL_COLORS.instagramOrange} 78%,
                    ${SOCIAL_COLORS.instagramYellow} 100%
                  )`,
                  color: "#FFFFFF",
                  borderColor: "transparent",
                }}
                className="p-2.5 rounded-full shadow-sm border"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.28-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.204-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.79 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </motion.a>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Bottom Bar                                                         */}
        {/* ------------------------------------------------------------------ */}
        <div
          style={{
            borderColor: FOOTER_COLORS.border,
          }}
          className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs gap-3"
        >
          <p
            style={{
              color: FOOTER_COLORS.mutedText,
            }}
          >
            &copy; {new Date().getFullYear()} Ru-e-Razab. All rights reserved.
          </p>

          <p
            style={{
              color: FOOTER_COLORS.deepRed,
            }}
            className="font-urdu text-sm"
          >
            روئے رزب - تمام حقوق محفوظ ہیں۔
          </p>
        </div>
      </div>
    </footer>
  );
}