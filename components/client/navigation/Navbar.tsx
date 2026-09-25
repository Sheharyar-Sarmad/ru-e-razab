"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import * as THREE from "three";
import AuthModal from "../models/AuthModal";
import apiClient from "@/lib/api";

interface User {
  id: string;
  accountname: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber?: string;
}

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

const SOCIAL_COLORS = {
  youtube: "#FF0000",
  facebook: "#1877F2",
  instagramPurple: "#833AB4",
  instagramPink: "#E1306C",
  instagramRed: "#FD1D1D",
  instagramOrange: "#F77737",
  instagramYellow: "#FCAF45",
};

const SOCIAL_LINKS = {
  youtube: "https://youtube.com/@ru-e-razab",
  facebook: "https://facebook.com/ru.e.razab",
  instagram: "https://instagram.com/ru.e.razab",
};

/* =========================================================
   THREE.JS AMBIENT BACKGROUND FOR NAVBAR
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
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    const particleCount = 140;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.darkOrange),
      size: 0.09,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let animationId: number;
    let isVisible = true;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (!isVisible || prefersReducedMotion) {
        renderer.render(scene, camera);
        return;
      }
      points.rotation.y += 0.0006;
      points.rotation.x += 0.0002;
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
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-70"
    />
  );
}

/* =========================================================
   MAIN NAVBAR COMPONENT
========================================================= */

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isKalamDropdownOpen, setIsKalamDropdownOpen] =
    useState<boolean>(false);
  const [isMobileKalamOpen, setIsMobileKalamOpen] = useState<boolean>(false);
  const [isNavVisible, setIsNavVisible] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef<number>(0);

  const fetchUserDetails = async () => {
    try {
      const res = await apiClient.get("/api/client/dashboard/details/account");
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, {
        y: -24,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    }, navRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (isMobileMenuOpen) {
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY <= 64) {
        setIsNavVisible(true);
      } else if (scrollDelta > 4) {
        setIsNavVisible(false);
      } else if (scrollDelta < -4) {
        setIsNavVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsKalamDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const res = await apiClient.post("/api/client/auth/logout");
      if (res.status === 200) {
        setUser(null);
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const kalamLinks = [
    { title: "غزلیں", href: "/ghazals" },
    { title: "نظمیں", href: "/nazms" },
    { title: "کلیات", href: "/kulliyat" },
    { title: "قطعات", href: "/qata" },
    { title: "اشعار", href: "/shair" },
  ];

  const socialItems = [
    {
      key: "youtube",
      label: "YouTube",
      href: SOCIAL_LINKS.youtube,
      bg: SOCIAL_COLORS.youtube,
      icon: (
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      ),
    },
    {
      key: "facebook",
      label: "Facebook",
      href: SOCIAL_LINKS.facebook,
      bg: SOCIAL_COLORS.facebook,
      icon: (
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      ),
    },
    {
      key: "instagram",
      label: "Instagram",
      href: SOCIAL_LINKS.instagram,
      bg: `linear-gradient(135deg, ${SOCIAL_COLORS.instagramPurple} 0%, ${SOCIAL_COLORS.instagramPink} 35%, ${SOCIAL_COLORS.instagramRed} 55%, ${SOCIAL_COLORS.instagramOrange} 78%, ${SOCIAL_COLORS.instagramYellow} 100%)`,
      icon: (
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.28-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.204-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.79 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      ),
    },
  ];

  return (
    <>
      <motion.header
        ref={navRef}
        animate={{ y: isNavVisible ? 0 : "-100%" }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        style={{
          backgroundColor: THEME.strawberryWhite,
          borderColor: THEME.border,
        }}
        className="fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-md bg-opacity-95 text-[#3A211B]"
      >
        <ThreeBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src="/logo.png"
                  alt="Ru-e-Razab Logo"
                  width={38}
                  height={38}
                  className="w-9 h-9 object-contain"
                  priority
                />
              </motion.div>
              <span
                style={{ color: THEME.darkOrange }}
                className="font-bold text-2xl tracking-wide font-urdu"
              >
                روئے رزب
              </span>
            </Link>

            {/* Desktop Navigation with Proper Flex Gap */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10 font-urdu" dir="rtl">
              <Link
                href="/"
                style={{ color: THEME.darkText }}
                className="text-lg font-semibold hover:text-[#C2410C] transition-colors whitespace-nowrap"
              >
                دہلیز
              </Link>

              {/* Kalam Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsKalamDropdownOpen((prev) => !prev)}
                  style={{ color: THEME.darkText }}
                  className="flex items-center gap-2 text-lg font-semibold hover:text-[#C2410C] focus:outline-none transition-colors py-2 whitespace-nowrap"
                  aria-expanded={isKalamDropdownOpen}
                >
                  <span>کلام</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isKalamDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <AnimatePresence>
                  {isKalamDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        backgroundColor: THEME.strawberryWhite,
                        borderColor: THEME.border,
                      }}
                      className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl border py-2 z-50 text-right"
                    >
                      {kalamLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsKalamDropdownOpen(false)}
                          style={{ color: THEME.darkText }}
                          className="block px-4 py-2 text-base font-semibold hover:bg-[#F2D6CF]/40 transition-colors"
                        >
                          {link.title}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ADBI DOST (AI Chat) Link */}
              <Link
                href="/ai/chat"
                style={{ color: THEME.darkText }}
                className="text-lg font-semibold hover:text-[#C2410C] transition-colors whitespace-nowrap"
              >
                ادبی دوست
              </Link>
            </nav>

            {/* Desktop Auth Controls */}
            <div className="hidden md:flex items-center gap-4 shrink-0">
              {loading ? (
                <div
                  style={{ backgroundColor: THEME.border }}
                  className="w-24 h-9 animate-pulse rounded-xl"
                />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/account/settings"
                    style={{
                      backgroundColor: THEME.strawberryWhite,
                      borderColor: THEME.border,
                      color: THEME.darkText,
                    }}
                    className="flex items-center gap-2.5 text-sm font-semibold px-3.5 py-1.5 rounded-full border transition-all hover:bg-[#F2D6CF]/30 font-urdu"
                  >
                    <span
                      style={{
                        backgroundColor: THEME.darkOrange,
                        color: "#FFFFFF",
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs uppercase font-bold"
                    >
                      {user.firstname?.[0] || "U"}
                    </span>
                    <span>{user.firstname}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{ color: THEME.deepRed }}
                    className="text-sm font-urdu font-semibold hover:underline px-2 py-1"
                  >
                    لاگ آؤٹ
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openAuthModal("login")}
                    style={{ color: THEME.darkText }}
                    className="text-base font-urdu font-semibold hover:text-[#C2410C] transition-colors px-3 py-2"
                  >
                    داخل ہوں
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openAuthModal("signup")}
                    style={{
                      backgroundColor: THEME.darkOrange,
                      color: "#FFFFFF",
                    }}
                    className="text-base font-urdu font-bold px-4 py-2 rounded-xl shadow-md transition-all hover:bg-[#EA580C]"
                  >
                    اکاؤنٹ بنائیں
                  </motion.button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                style={{ color: THEME.darkText }}
                className="p-2 rounded-lg hover:bg-[#F2D6CF]/40 focus:outline-none"
                aria-label="Open navigation menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 md:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              style={{ backgroundColor: THEME.strawberryWhite }}
              className="fixed top-0 left-0 z-50 h-full w-[82%] max-w-sm overflow-y-auto shadow-2xl md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div
                className="flex items-center justify-between px-5 h-16 border-b"
                style={{ borderColor: THEME.border }}
              >
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <Image
                    src="/logo.png"
                    alt="Ru-e-Razab Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                  <span
                    style={{ color: THEME.darkOrange }}
                    className="font-bold text-xl tracking-wide font-urdu"
                  >
                    روئے رزب
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ color: THEME.darkText }}
                  className="p-2 rounded-lg hover:bg-[#F2D6CF]/40 focus:outline-none"
                  aria-label="Close navigation menu"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-5 space-y-1 text-right font-urdu" dir="rtl">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ color: THEME.darkText }}
                  className="block text-lg font-semibold py-2.5"
                >
                  دہلیز
                </Link>

                <Link
                  href="/ai/chat"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ color: THEME.darkText }}
                  className="block text-lg font-semibold py-2.5"
                >
                  ادبی دوست
                </Link>

                <div>
                  <button
                    onClick={() => setIsMobileKalamOpen((prev) => !prev)}
                    style={{ color: THEME.darkText }}
                    className="w-full flex items-center justify-between text-lg font-semibold py-2.5"
                  >
                    <span>کلام</span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isMobileKalamOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {isMobileKalamOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ borderColor: THEME.darkOrange }}
                        className="pr-4 space-y-2 border-r-2 overflow-hidden text-right"
                      >
                        {kalamLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block text-base font-semibold py-1.5"
                            style={{ color: THEME.mutedText }}
                          >
                            {link.title}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div
                style={{ borderColor: THEME.border }}
                className="px-5 pt-4 pb-6 border-t"
              >
                {user ? (
                  <div className="space-y-3 font-urdu text-right" dir="rtl">
                    <Link
                      href="/account/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      style={{ color: THEME.darkOrange }}
                      className="flex items-center gap-2 text-base font-bold py-1"
                    >
                      <span>اکاؤنٹ کی ترتیبات ({user.firstname})</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      style={{ color: THEME.deepRed }}
                      className="w-full text-right text-base font-semibold py-1"
                    >
                      لاگ آؤٹ
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 font-urdu">
                    <button
                      onClick={() => openAuthModal("login")}
                      style={{
                        borderColor: THEME.border,
                        color: THEME.darkText,
                      }}
                      className="w-full text-center py-2.5 text-base font-bold border rounded-xl"
                    >
                      داخل ہوں
                    </button>
                    <button
                      onClick={() => openAuthModal("signup")}
                      style={{
                        backgroundColor: THEME.darkOrange,
                        color: "#FFFFFF",
                      }}
                      className="w-full text-center py-2.5 text-base font-bold rounded-xl shadow-md"
                    >
                      اکاؤنٹ بنائیں
                    </button>
                  </div>
                )}
              </div>

              <div
                style={{ borderColor: THEME.border }}
                className="px-5 py-5 border-t"
              >
                <p
                  style={{ color: THEME.mutedText }}
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                >
                  Follow Us
                </p>
                <div className="flex items-center gap-3">
                  {socialItems.map((social) => (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      style={{
                        background: social.bg,
                        color: "#FFFFFF",
                      }}
                      className="p-2.5 rounded-full shadow-sm transition-transform hover:scale-110"
                    >
                      <svg
                        className="w-5 h-5 fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        {social.icon}
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="h-16" aria-hidden="true" />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          fetchUserDetails();
        }}
      />
    </>
  );
}