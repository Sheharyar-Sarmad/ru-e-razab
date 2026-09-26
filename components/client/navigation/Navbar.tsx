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

interface SearchHit {
  _id: string;
  type: "ghazal" | "nazm" | "qata" | "shair";
  typeDisplayUrdu: string;
  title: string;
  slug: string;
  href: string;
  firstLine: string;
  category: string[];
  coverImage: string;
  likesCount: number;
  views: number;
  createdAt: string;
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
   THREE.JS AMBIENT BACKGROUND
========================================================= */

function ThreeBackground({
  className = "",
  opacity = 0.85,
  particleCount = 120,
  zCamera = 7,
}: {
  className?: string;
  opacity?: number;
  particleCount?: number;
  zCamera?: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = mount.clientWidth || mount.offsetWidth || 600;
    let height = mount.clientHeight || mount.offsetHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = zCamera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.darkOrange),
      size: 0.12,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const ringGeo = new THREE.TorusGeometry(2.4, 0.006, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(THEME.darkOrange),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    ring.position.set(3, -1, -2);
    scene.add(ring);

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
      ring.rotation.z += 0.0012;
      renderer.render(scene, camera);
    };

    animate();

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
      geometry.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [particleCount, zCamera]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
      style={{ opacity }}
    />
  );
}

/* =========================================================
   LOGOUT CONFIRM MODAL
========================================================= */

function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  userName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  userName?: string;
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, loading, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="logout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !loading && onClose()}
            className="fixed inset-0 z-[80] bg-[#3A211B]/70 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="logout-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="fixed left-1/2 top-1/2 z-[81] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              backgroundColor: THEME.strawberryWhite,
              borderColor: THEME.border,
            }}
            dir="rtl"
          >
            {/* Ambient background inside the modal */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <ThreeBackground opacity={0.55} particleCount={70} zCamera={6} />
            </div>

            {/* Soft veil for readability */}
            <div
              className="absolute inset-0 z-[1] pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${THEME.darkOrange}10, transparent 60%)`,
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 p-7 sm:p-8 text-center">
              {/* Icon circle */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: `${THEME.darkOrange}40`,
                  backgroundColor: `${THEME.darkOrange}12`,
                  boxShadow: `0 8px 24px -8px ${THEME.darkOrange}50`,
                }}
              >
                <svg
                  className="h-7 w-7"
                  style={{ color: THEME.darkOrange }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </motion.div>

              {/* Urdu Heading */}
              <h3
                id="logout-title"
                className="font-urdu text-2xl font-bold leading-[1.9] sm:text-3xl"
                style={{ color: THEME.darkText }}
              >
                لاگ آؤٹ کی تصدیق
              </h3>

              {/* Urdu Body */}
              <p
                className="font-urdu mt-3 text-base leading-[2.2]"
                style={{ color: THEME.mutedText }}
              >
                {userName ? (
                  <>
                    <span className="font-outfit" style={{ color: THEME.darkText, fontWeight: 600 }}>
                      {userName}
                    </span>
                    ، کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟
                  </>
                ) : (
                  "کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟"
                )}
              </p>

              {/* English subline */}
              <p
                className="mt-2 text-xs font-outfit opacity-70"
                style={{ color: THEME.mutedText }}
                dir="ltr"
              >
                You&apos;ll need to sign in again to access your account.
              </p>

              {/* Actions */}
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                {/* Cancel (Secondary) */}
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.03 }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  onClick={onClose}
                  disabled={loading}
                  className="font-urdu w-full rounded-xl border px-6 py-3 text-base font-bold leading-[1.8] transition-all disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
                  style={{
                    borderColor: THEME.border,
                    color: THEME.darkText,
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                  }}
                >
                  رہنے دیں
                </motion.button>

                {/* Confirm (Primary — Rust) */}
                <motion.button
                  whileHover={{
                    scale: loading ? 1 : 1.03,
                    y: loading ? 0 : -2,
                    boxShadow: loading
                      ? "0 4px 12px -4px rgba(154, 52, 18, 0.4)"
                      : "0 12px 32px -8px rgba(234, 88, 12, 0.55)",
                  }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  onClick={onConfirm}
                  disabled={loading}
                  className="font-urdu relative w-full overflow-hidden rounded-xl px-6 py-3 text-base font-bold leading-[1.8] text-white shadow-md transition-all disabled:opacity-60 sm:w-auto sm:min-w-[140px]"
                  style={{
                    background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      <span>لاگ آؤٹ ہو رہا ہے…</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      ہاں، لاگ آؤٹ کریں
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>
                  )}
                </motion.button>
              </div>

              {/* Security note */}
              <p
                className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-outfit"
                style={{ color: THEME.mutedText }}
                dir="ltr"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  style={{ color: THEME.emeraldGreen }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Your session will be securely ended
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* =========================================================
   NAVBAR
========================================================= */

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isKalamDropdownOpen, setIsKalamDropdownOpen] = useState<boolean>(false);
  const [isMobileKalamOpen, setIsMobileKalamOpen] = useState<boolean>(false);
  const [isNavVisible, setIsNavVisible] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Logout confirmation
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Search
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    document.body.style.overflow =
      isMobileMenuOpen || isSearchOpen || isLogoutConfirmOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isSearchOpen, isLogoutConfirmOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsKalamDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(
          `/api/client/deewan/search-kulliyat?q=${encodeURIComponent(
            trimmed
          )}&limit=8`
        );
        if (res.data?.success) {
          setSearchResults(res.data.data.results || []);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isSearchOpen]);

  // ---- Logout flow ----
  const requestLogout = () => {
    setIsLogoutConfirmOpen(true);
    setIsMobileMenuOpen(false);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await apiClient.post("/api/client/auth/logout");
      if (res.status === 200) {
        setUser(null);
        setIsLogoutConfirmOpen(false);
        // Smooth handoff — reload so all server state resets
        window.location.reload();
      } else {
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const openSearch = () => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(true);
  };

  const kalamLinks = [
    { title: "کلیات", href: "/kulliyat" },
    { title: "غزلیں", href: "/ghazals" },
    { title: "نظمیں", href: "/nazms" },
    { title: "قطعات", href: "/qatas" },
    { title: "اشعار", href: "/shairs" },
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
        <ThreeBackground opacity={0.7} particleCount={140} zCamera={8} />

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

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center gap-8 lg:gap-10 font-urdu"
              dir="rtl"
            >
              <Link
                href="/"
                style={{ color: THEME.darkText }}
                className="text-lg font-semibold hover:text-[#C2410C] transition-colors whitespace-nowrap leading-[1.8]"
              >
                دہلیز
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsKalamDropdownOpen((prev) => !prev)}
                  style={{ color: THEME.darkText }}
                  className="flex items-center gap-2 text-lg font-semibold hover:text-[#C2410C] focus:outline-none transition-colors py-2 whitespace-nowrap leading-[1.8]"
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
                          className="block px-4 py-2 text-base font-semibold hover:bg-[#F2D6CF]/40 transition-colors leading-[1.8]"
                        >
                          {link.title}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/ai/chat"
                style={{ color: THEME.darkText }}
                className="text-lg font-semibold hover:text-[#C2410C] transition-colors whitespace-nowrap leading-[1.8]"
              >
                ادبی دوست
              </Link>
            </nav>

            {/* Desktop Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search kulliyat"
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all hover:bg-[#F2D6CF]/40 shrink-0"
              style={{
                borderColor: THEME.border,
                color: THEME.mutedText,
                backgroundColor: THEME.strawberryWhite,
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0z"
                />
              </svg>
              <span className="hidden lg:inline font-urdu text-base leading-[1.8]">
                تلاش
              </span>
              <kbd
                className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border font-outfit"
                style={{
                  borderColor: THEME.border,
                  color: THEME.mutedText,
                }}
              >
                ⌘K
              </kbd>
            </button>

            {/* Desktop Auth */}
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
                    className="flex items-center gap-2.5 text-sm font-semibold px-3.5 py-1.5 rounded-full border transition-all hover:bg-[#F2D6CF]/30"
                  >
                    <span
                      style={{
                        backgroundColor: THEME.darkOrange,
                        color: "#FFFFFF",
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs uppercase font-bold font-outfit"
                    >
                      {user.firstname?.[0] || "U"}
                    </span>
                    <span>{user.firstname}</span>
                  </Link>
                  <button
                    onClick={requestLogout}
                    style={{ color: THEME.deepRed }}
                    className="text-sm font-urdu font-semibold hover:underline px-2 py-1 leading-[1.8] transition-opacity hover:opacity-80"
                  >
                    لاگ آؤٹ
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openAuthModal("login")}
                    style={{ color: THEME.darkText }}
                    className="text-base font-urdu font-semibold hover:text-[#C2410C] transition-colors px-3 py-2 leading-[1.8]"
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
                    className="text-base font-urdu font-bold px-4 py-2 rounded-xl shadow-md transition-all hover:bg-[#EA580C] leading-[1.8]"
                  >
                    اکاؤنٹ بنائیں
                  </motion.button>
                </div>
              )}
            </div>

            {/* Mobile controls */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={openSearch}
                style={{ color: THEME.darkText }}
                className="p-2 rounded-lg hover:bg-[#F2D6CF]/40 focus:outline-none"
                aria-label="Open search"
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
                    d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0z"
                  />
                </svg>
              </button>
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
                  className="block text-lg font-semibold py-2.5 leading-[1.8]"
                >
                  دہلیز
                </Link>

                <button
                  onClick={openSearch}
                  style={{ color: THEME.darkText }}
                  className="w-full flex items-center justify-between text-lg font-semibold py-2.5 leading-[1.8]"
                >
                  <span>تلاش</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0z"
                    />
                  </svg>
                </button>

                <Link
                  href="/ai/chat"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ color: THEME.darkText }}
                  className="block text-lg font-semibold py-2.5 leading-[1.8]"
                >
                  ادبی دوست
                </Link>

                <div>
                  <button
                    onClick={() => setIsMobileKalamOpen((prev) => !prev)}
                    style={{ color: THEME.darkText }}
                    className="w-full flex items-center justify-between text-lg font-semibold py-2.5 leading-[1.8]"
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
                            className="block text-base font-semibold py-1.5 leading-[1.8]"
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
                      className="flex items-center gap-2 text-base font-bold py-1 leading-[1.8]"
                    >
                      <span>اکاؤنٹ کی ترتیبات ({user.firstname})</span>
                    </Link>
                    <button
                      onClick={requestLogout}
                      style={{ color: THEME.deepRed }}
                      className="w-full text-right text-base font-semibold py-1 leading-[1.8]"
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
                      className="w-full text-center py-2.5 text-base font-bold border rounded-xl leading-[1.8]"
                    >
                      داخل ہوں
                    </button>
                    <button
                      onClick={() => openAuthModal("signup")}
                      style={{
                        backgroundColor: THEME.darkOrange,
                        color: "#FFFFFF",
                      }}
                      className="w-full text-center py-2.5 text-base font-bold rounded-xl shadow-md leading-[1.8]"
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
                  className="text-xs font-semibold uppercase tracking-wider mb-3 font-outfit"
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

      {/* ============================
          SEARCH MODAL
      ============================= */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 z-[60] bg-[#3A211B]/65 backdrop-blur-md"
              aria-hidden="true"
            />

            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-label="Search kulliyat"
              className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-[61] w-[92%] max-w-2xl rounded-2xl shadow-2xl overflow-hidden border"
              style={{
                backgroundColor: THEME.strawberryWhite,
                borderColor: THEME.border,
              }}
            >
              <div className="absolute inset-0 z-0 pointer-events-none">
                <ThreeBackground
                  opacity={0.9}
                  particleCount={120}
                  zCamera={7}
                />
              </div>

              <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                  background: `linear-gradient(
                    180deg,
                    rgba(255, 247, 244, 0.30) 0%,
                    rgba(255, 247, 244, 0.10) 40%,
                    rgba(255, 247, 244, 0.30) 100%
                  )`,
                }}
                aria-hidden="true"
              />

              <div
                className="relative z-10 flex items-center gap-3 px-4 py-3 border-b"
                style={{ borderColor: THEME.border }}
              >
                <button
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                  className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full border transition-all hover:bg-[#F2D6CF]/60 focus:outline-none"
                  style={{
                    borderColor: THEME.border,
                    color: THEME.mutedText,
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                  }}
                >
                  <svg
                    className="w-4 h-4"
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

                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="یہاں تلاش کریں"
                  dir="rtl"
                  className="
                    flex-1
                    bg-transparent
                    outline-none
                    font-urdu
                    text-lg
                    leading-[2.4]
                    py-2
                    text-right
                    placeholder:leading-[2.4]
                    placeholder:text-base
                    placeholder:opacity-60
                  "
                  style={{ color: THEME.darkText }}
                  aria-label="Search query"
                />

                {isSearching ? (
                  <div
                    className="w-5 h-5 rounded-full border-2 animate-spin shrink-0"
                    style={{
                      borderColor: THEME.darkOrange,
                      borderTopColor: "transparent",
                    }}
                    aria-label="Searching"
                  />
                ) : (
                  <svg
                    className="w-5 h-5 shrink-0"
                    style={{ color: THEME.darkOrange }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0z"
                    />
                  </svg>
                )}
              </div>

              <div className="relative z-10 max-h-[60vh] overflow-y-auto">
                {searchQuery.trim().length < 2 ? (
                  <div
                    className="p-10 text-center font-urdu"
                    style={{ color: THEME.mutedText }}
                  >
                    <p className="mb-2 text-lg leading-[2.2]">
                      کم از کم دو حروف لکھیں
                    </p>
                    <p
                      className="text-xs opacity-70 font-outfit leading-normal"
                      dir="ltr"
                    >
                      Type at least 2 characters to search
                    </p>
                  </div>
                ) : searchResults.length === 0 && !isSearching ? (
                  <div
                    className="p-10 text-center font-urdu"
                    style={{ color: THEME.mutedText }}
                  >
                    <p className="mb-2 text-lg leading-[2.2]">
                      کوئی نتیجہ نہیں ملا
                    </p>
                    <p
                      className="text-xs opacity-70 font-outfit leading-normal"
                      dir="ltr"
                    >
                      No results found for &ldquo;{searchQuery}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div dir="rtl">
                    {searchResults.map((hit) => (
                      <Link
                        key={`${hit.type}-${hit._id}`}
                        href={hit.href}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="group flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-[#F2D6CF]/30 transition-colors"
                        style={{ borderColor: THEME.border }}
                      >
                        <div
                          className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border"
                          style={{ borderColor: THEME.border }}
                        >
                          {hit.coverImage ? (
                            <Image
                              src={hit.coverImage}
                              alt={hit.title}
                              fill
                              sizes="80px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-urdu text-2xl leading-[1.8]"
                              style={{
                                background: `linear-gradient(135deg, ${THEME.darkOrange}15, ${THEME.orangeGlow}15)`,
                                color: THEME.darkOrange,
                              }}
                            >
                              {hit.typeDisplayUrdu.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full font-urdu leading-[1.8]"
                              style={{
                                backgroundColor: `${THEME.darkOrange}15`,
                                color: THEME.darkOrange,
                              }}
                            >
                              {hit.typeDisplayUrdu}
                            </span>
                            {hit.category?.[0] && (
                              <span
                                className="text-xs font-urdu truncate leading-[1.8]"
                                style={{ color: THEME.mutedText }}
                              >
                                {hit.category[0]}
                              </span>
                            )}
                          </div>
                          <p
                            className="font-urdu text-base leading-[2.2] line-clamp-2"
                            style={{ color: THEME.darkText }}
                          >
                            {hit.firstLine || hit.title}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="relative z-10 px-4 py-2.5 border-t flex items-center justify-between text-[11px] font-outfit"
                style={{
                  borderColor: THEME.border,
                  color: THEME.mutedText,
                  backgroundColor: "rgba(255, 247, 244, 0.85)",
                  backdropFilter: "blur(8px)",
                }}
                dir="ltr"
              >
                <span className="flex items-center gap-1.5">
                  <kbd
                    className="px-1.5 py-0.5 rounded border"
                    style={{ borderColor: THEME.border }}
                  >
                    ↵
                  </kbd>
                  Open
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd
                    className="px-1.5 py-0.5 rounded border"
                    style={{ borderColor: THEME.border }}
                  >
                    ESC
                  </kbd>
                  Close
                </span>
                <span>
                  Powered by{" "}
                  <span style={{ color: THEME.darkOrange, fontWeight: 600 }}>
                    Ru-e-Razab
                  </span>
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================
          LOGOUT CONFIRMATION MODAL
      ============================= */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => !isLoggingOut && setIsLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
        loading={isLoggingOut}
        userName={user?.firstname}
      />

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