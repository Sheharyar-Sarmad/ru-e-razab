"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import * as THREE from "three";
import apiClient from "@/lib/api";
import AuthModal from "../models/AuthModal";

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

type KalamType = "nazm" | "ghazal" | "qata" | "shair";

interface FeaturedItem {
  _id: string;
  type: KalamType;
  typeDisplay: string;
  title: string;
  slug: string;
  firstLine: string;
  category: string[];
  coverImage: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
  isDisliked?: boolean;
}

interface CommentUser {
  _id: string;
  firstname: string;
  lastname: string;
  accountname: string;
}

interface Comment {
  _id: string;
  user: CommentUser | null;
  content: string;
  createdAt: string;
}

const TYPE_ROUTES: Record<KalamType, string> = {
  nazm: "/nazm",
  ghazal: "/ghazal",
  qata: "/qata",
  shair: "/shair",
};

const TYPE_URDU: Record<KalamType, string> = {
  nazm: "نظم",
  ghazal: "غزل",
  qata: "قطعہ",
  shair: "شعر",
};

const API_ROUTES: Record<
  KalamType,
  {
    likes: (slug: string) => string;
    comments: (slug: string) => string;
    supportsDislike: boolean;
  }
> = {
  ghazal: {
    likes: (slug) => `/api/client/dashboard/deewan/ghazal/${slug}/likes`,
    comments: (slug) => `/api/client/dashboard/deewan/ghazal/${slug}/comments`,
    supportsDislike: true,
  },
  nazm: {
    likes: (slug) => `/api/client/dashboard/deewan/nazm/${slug}/likes`,
    comments: (slug) => `/api/client/dashboard/deewan/nazm/${slug}/comments`,
    supportsDislike: false,
  },
  qata: {
    likes: (slug) => `/api/client/dashboard/deewan/qata/${slug}/likes`,
    comments: (slug) => `/api/client/dashboard/deewan/qata/${slug}/comments`,
    supportsDislike: true,
  },
  shair: {
    likes: (slug) => `/api/client/dashboard/deewan/shair/${slug}/likes`,
    comments: (slug) => `/api/client/dashboard/deewan/shair/${slug}/comments`,
    supportsDislike: true,
  },
};

interface ReactionState {
  likesCount: number;
  dislikesCount: number;
  isLiked: boolean;
  isDisliked: boolean;
}

/* =========================================================
   AUTH DETECTION HELPERS
   Handles both axios-thrown 401s AND 200-with-err:UNAUTHORIZED
========================================================= */

function isUnauthorizedError(err: any): boolean {
  if (!err) return false;
  const status = err?.response?.status;
  const errCode = err?.response?.data?.err;
  return status === 401 || errCode === "UNAUTHORIZED";
}

function isUnauthorizedResponse(data: any): boolean {
  if (!data) return false;
  return data.success === false && data.err === "UNAUTHORIZED";
}

/* =========================================================
   TIMESTAMP FORMATTER
========================================================= */

function formatCommentTimestamp(dateInput: string | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const datePart = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${datePart} • ${timePart}`;
}

/* =========================================================
   MOTION VARIANTS
========================================================= */

const eyebrowVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
  },
};

const underlineVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  show: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.6, ease: "easeInOut", delay: 0.35 },
  },
};

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 16,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const commentVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: "easeOut" },
  }),
};

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

    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const PARTICLE_COUNT = 260;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.deepRed),
      size: 0.14,
      transparent: true,
      opacity: 0.6,
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
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "#1a0e08", opacity: 0.08 }}
      />
    </div>
  );
}

/* =========================================================
   AUTH TOAST — slides in when user needs to sign in
========================================================= */

function AuthToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      role="status"
      className="fixed right-4 top-20 z-[80] w-[92%] max-w-sm rounded-2xl border p-4 shadow-2xl backdrop-blur-xl sm:right-6 sm:top-24"
      style={{
        backgroundColor: "rgba(255, 247, 244, 0.96)",
        borderColor: THEME.border,
        boxShadow: `0 20px 50px -20px ${THEME.darkOrange}66`,
      }}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
          style={{
            backgroundColor: `${THEME.darkOrange}15`,
            borderColor: `${THEME.darkOrange}40`,
          }}
        >
          <svg
            className="h-5 w-5"
            style={{ color: THEME.darkOrange }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="font-urdu text-base font-bold leading-[1.8]"
            style={{ color: THEME.darkText }}
          >
            لاگ ان ضروری ہے
          </p>
          <p
            className="font-urdu mt-1 text-sm leading-[2]"
            style={{ color: THEME.mutedText }}
          >
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-full p-1.5 transition-opacity hover:opacity-70"
          style={{ color: THEME.mutedText }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/* =========================================================
   FEATURED KALAM — MAIN COMPONENT
========================================================= */

export default function FeaturedKalam() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({});
  const [activeItem, setActiveItem] = useState<FeaturedItem | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  /* ---------- AUTH STATE ---------- */
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authToast, setAuthToast] = useState<string | null>(null);

  const requireAuth = useCallback(
    (message: string, mode: "login" | "signup" = "login") => {
      setAuthToast(message);
      setAuthMode(mode);
      setIsAuthOpen(true);
    },
    []
  );

  /* ---------- FETCH FEATURED ---------- */
  const fetchFeatured = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/client/deewan/numaya", {
        params: { limit: 8 },
      });
      if (res.data?.success && res.data?.data?.featured) {
        const featured: FeaturedItem[] = res.data.data.featured;
        setItems(featured);

        const initialReactions: Record<string, ReactionState> = {};
        featured.forEach((item) => {
          initialReactions[item._id] = {
            likesCount: item.likesCount,
            dislikesCount: 0,
            isLiked: item.isLiked ?? false,
            isDisliked: item.isDisliked ?? false,
          };
        });
        setReactions(initialReactions);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  /* ---------- LIKE / DISLIKE ---------- */
  const handleReaction = useCallback(
    async (
      item: FeaturedItem,
      reaction: "like" | "dislike",
      e?: React.MouseEvent
    ) => {
      e?.preventDefault();
      e?.stopPropagation();

      const config = API_ROUTES[item.type];
      if (reaction === "dislike" && !config.supportsDislike) return;

      const prevState = reactions[item._id];
      if (!prevState) return;

      const nextIsLiked = reaction === "like" ? !prevState.isLiked : false;
      const nextIsDisliked =
        reaction === "dislike" ? !prevState.isDisliked : false;

      const optimistic: ReactionState = {
        likesCount:
          prevState.likesCount +
          (nextIsLiked ? 1 : 0) -
          (prevState.isLiked ? 1 : 0),
        dislikesCount:
          prevState.dislikesCount +
          (nextIsDisliked ? 1 : 0) -
          (prevState.isDisliked ? 1 : 0),
        isLiked: nextIsLiked,
        isDisliked: nextIsDisliked,
      };

      // Optimistic update
      setReactions((prev) => ({ ...prev, [item._id]: optimistic }));

      try {
        const res = await apiClient.post(config.likes(item.slug), { reaction });

        // Handles both the axios success path AND 200-with-err:UNAUTHORIZED
        if (res.data?.success) {
          const { likesCount, dislikesCount, isLiked, isDisliked } =
            res.data.data || {};
          setReactions((prev) => ({
            ...prev,
            [item._id]: {
              likesCount: likesCount ?? optimistic.likesCount,
              dislikesCount: dislikesCount ?? optimistic.dislikesCount,
              isLiked: isLiked ?? false,
              isDisliked: isDisliked ?? false,
            },
          }));
        } else if (isUnauthorizedResponse(res.data)) {
          // Rollback + prompt auth
          setReactions((prev) => ({ ...prev, [item._id]: prevState }));
          requireAuth(
            "پسند کرنے کے لیے لاگ ان کریں یا نیا اکاؤنٹ بنائیں۔"
          );
        } else {
          setReactions((prev) => ({ ...prev, [item._id]: prevState }));
        }
      } catch (error: any) {
        // Rollback
        setReactions((prev) => ({ ...prev, [item._id]: prevState }));

        if (isUnauthorizedError(error)) {
          requireAuth("پسند کرنے کے لیے لاگ ان کریں یا نیا اکاؤنٹ بنائیں۔");
        }
      }
    },
    [reactions, requireAuth]
  );

  if (!loading && items.length === 0) return null;

  return (
    <>
      <section
        ref={sectionRef}
        aria-label="Numaya Kalam"
        style={{ backgroundColor: THEME.strawberryWhite }}
        className="relative w-full overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:px-10 lg:px-16 xl:px-24"
      >
        <ThreeBackground />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col items-center text-center sm:mb-14">
            <motion.p
              variants={eyebrowVariants}
              initial="hidden"
              animate="show"
              style={{ color: THEME.darkOrange }}
              className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] sm:text-sm"
            >
              Featured
            </motion.p>
            <motion.h2
              variants={headingVariants}
              initial="hidden"
              animate="show"
              dir="rtl"
              style={{ color: THEME.darkText }}
              className="font-urdu text-4xl leading-relaxed sm:text-5xl md:text-6xl"
            >
              نمایاں کلام
            </motion.h2>
            <motion.span
              variants={underlineVariants}
              initial="hidden"
              animate="show"
              style={{
                backgroundColor: THEME.orangeGlow,
                transformOrigin: "center",
              }}
              className="mt-4 h-[3px] w-16 rounded-full sm:w-20"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: THEME.border }}
                  className="h-80 w-full animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : (
            <motion.div
              variants={gridVariants}
              initial="hidden"
              animate="show"
              className="featured-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {items.map((item, index) => {
                const reaction = reactions[item._id];
                const config = API_ROUTES[item.type];

                return (
                  <motion.div
                    key={item._id}
                    variants={cardVariants}
                    className="featured-card group"
                  >
                    <motion.div
                      whileHover={{ y: -8 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="relative cursor-pointer overflow-hidden rounded-2xl shadow-md transition-shadow duration-300 hover:shadow-xl"
                      onClick={() => setActiveItem(item)}
                    >
                      <div className="relative h-72 w-full overflow-hidden sm:h-80">
                        <motion.div
                          className="absolute inset-0"
                          whileHover={{ scale: 1.08 }}
                          transition={{
                            duration: 0.7,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <Image
                            src={item.coverImage}
                            alt=""
                            fill
                            priority={index < 3}
                            loading={index < 3 ? "eager" : "lazy"}
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            quality={80}
                          />
                        </motion.div>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a0e08]/85 via-[#1a0e08]/25 to-transparent" />

                        <motion.span
                          dir="rtl"
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: 0.15 + index * 0.03,
                            duration: 0.35,
                          }}
                          style={{
                            backgroundColor: THEME.darkOrange,
                            color: THEME.strawberryWhite,
                          }}
                          className="font-urdu absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                        >
                          {TYPE_URDU[item.type]}
                        </motion.span>

                        <div className="absolute inset-x-0 bottom-0 p-5">
                          {item.type === "nazm" && (
                            <h3
                              dir="rtl"
                              style={{ color: THEME.strawberryWhite }}
                              className="font-urdu mb-1.5 text-xl leading-snug sm:text-2xl"
                            >
                              {item.title}
                            </h3>
                          )}

                          {item.firstLine && (
                            <p
                              dir="rtl"
                              style={{
                                color: THEME.strawberryWhite,
                                opacity: 0.9,
                              }}
                              className="font-urdu line-clamp-2 text-sm leading-relaxed sm:text-base"
                            >
                              {item.firstLine}
                            </p>
                          )}

                          <div
                            className="mt-3 flex items-center gap-4 text-xs"
                            style={{ color: THEME.strawberryWhite }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={(e) => handleReaction(item, "like", e)}
                              className="flex cursor-pointer items-center gap-1"
                              aria-label="Like"
                            >
                              <motion.svg
                                animate={
                                  reaction?.isLiked
                                    ? { scale: [1, 1.35, 1] }
                                    : { scale: 1 }
                                }
                                transition={{
                                  duration: 0.35,
                                  ease: "easeOut",
                                }}
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill={
                                  reaction?.isLiked ? THEME.deepRed : "none"
                                }
                                stroke="currentColor"
                                strokeWidth={reaction?.isLiked ? 0 : 1.8}
                              >
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </motion.svg>
                              <span style={{ opacity: 0.85 }}>
                                {reaction?.likesCount ?? item.likesCount}
                              </span>
                            </motion.button>

                            {config.supportsDislike && (
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={(e) =>
                                  handleReaction(item, "dislike", e)
                                }
                                className="flex cursor-pointer items-center gap-1"
                                aria-label="Dislike"
                              >
                                <motion.svg
                                  animate={
                                    reaction?.isDisliked
                                      ? { scale: [1, 1.35, 1] }
                                      : { scale: 1 }
                                  }
                                  transition={{
                                    duration: 0.35,
                                    ease: "easeOut",
                                  }}
                                  className="h-4 w-4 rotate-180"
                                  viewBox="0 0 24 24"
                                  fill={
                                    reaction?.isDisliked
                                      ? THEME.mutedText
                                      : "none"
                                  }
                                  stroke="currentColor"
                                  strokeWidth={
                                    reaction?.isDisliked ? 0 : 1.8
                                  }
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </motion.svg>
                                <span style={{ opacity: 0.85 }}>
                                  {reaction?.dislikesCount ?? 0}
                                </span>
                              </motion.button>
                            )}

                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setActiveItem(item)}
                              className="flex cursor-pointer items-center gap-1"
                              aria-label="Comments"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                              </svg>
                              <span style={{ opacity: 0.85 }}>
                                {item.commentsCount}
                              </span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        <KalamPanel
          item={activeItem}
          onClose={() => setActiveItem(null)}
          reactions={reactions}
          onAuthRequired={requireAuth}
        />
      </section>

      {/* =========================================================
          AUTH TOAST — appears above everything when user needs auth
      ========================================================= */}
      <AnimatePresence>
        {authToast && (
          <AuthToast
            message={authToast}
            onClose={() => setAuthToast(null)}
          />
        )}
      </AnimatePresence>

      {/* =========================================================
          AUTH MODAL — same one used in Navbar
      ========================================================= */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setIsAuthOpen(false);
          setAuthToast(null);
          // Re-sync featured so the just-authed user's like state is correct
          fetchFeatured();
        }}
      />
    </>
  );
}

/* =========================================================
   KALAM PANEL — modal with details + comments
========================================================= */

function KalamPanel({
  item,
  onClose,
  reactions,
  onAuthRequired,
}: {
  item: FeaturedItem | null;
  onClose: () => void;
  reactions: Record<string, ReactionState>;
  onAuthRequired: (message: string, mode?: "login" | "signup") => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [newComment, setNewComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = "hidden";

    const fetchComments = async () => {
      setCommentsLoading(true);
      try {
        const config = API_ROUTES[item.type];
        const res = await apiClient.get(config.comments(item.slug), {
          params: { page: 1, limit: 20 },
        });
        if (res.data?.success && res.data?.data?.comments) {
          setComments(res.data.data.comments);
        }
      } catch {
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchComments();

    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  const handleSubmitComment = async () => {
    if (!item || !newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const config = API_ROUTES[item.type];
      const res = await apiClient.post(config.comments(item.slug), {
        content: newComment.trim(),
      });

      if (res.data?.success && res.data?.data?.comment) {
        setComments((prev) => [res.data.data.comment, ...prev]);
        setNewComment("");
      } else if (isUnauthorizedResponse(res.data)) {
        onAuthRequired(
          "تبصرہ کرنے کے لیے لاگ ان کریں یا نیا اکاؤنٹ بنائیں۔"
        );
      }
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        onAuthRequired(
          "تبصرہ کرنے کے لیے لاگ ان کریں یا نیا اکاؤنٹ بنائیں۔"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reaction = item ? reactions[item._id] : undefined;
  const gallery = useMemo(() => (item ? [item.coverImage] : []), [item]);

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-[60] cursor-pointer bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-[61] w-[94%] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl"
            style={{
              backgroundColor: THEME.strawberryWhite,
              maxHeight: "88vh",
            }}
          >
            <motion.button
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
              aria-label="Close"
              style={{
                backgroundColor: THEME.strawberryWhite,
                color: THEME.darkText,
              }}
              className="absolute right-4 top-4 z-10 cursor-pointer rounded-full p-2 shadow-md"
            >
              <svg
                className="h-5 w-5"
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
            </motion.button>

            <div className="flex max-h-[88vh] flex-col overflow-y-auto md:flex-row">
              <div className="relative h-64 w-full flex-shrink-0 md:h-auto md:w-1/2">
                {gallery.map((src, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative h-64 w-full md:h-full md:min-h-[420px]"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      quality={90}
                    />
                  </motion.div>
                ))}
                <span
                  dir="rtl"
                  style={{
                    backgroundColor: THEME.darkOrange,
                    color: THEME.strawberryWhite,
                  }}
                  className="font-urdu absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                >
                  {TYPE_URDU[item.type]}
                </span>
              </div>

              <div className="flex w-full flex-col md:w-1/2">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="border-b p-6"
                  style={{ borderColor: THEME.border }}
                >
                  {item.type === "nazm" && (
                    <h2
                      dir="rtl"
                      style={{ color: THEME.darkText }}
                      className="font-urdu mb-2 text-2xl leading-snug sm:text-3xl"
                    >
                      {item.title}
                    </h2>
                  )}
                  {item.firstLine && (
                    <p
                      dir="rtl"
                      style={{ color: THEME.mutedText }}
                      className="font-urdu text-base leading-loose"
                    >
                      {item.firstLine}
                    </p>
                  )}

                  <p
                    style={{ color: THEME.mutedText }}
                    className="mt-2 text-xs"
                  >
                    Published {formatCommentTimestamp(item.createdAt)}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link
                        href={`${TYPE_ROUTES[item.type]}/${item.slug}`}
                        style={{
                          backgroundColor: THEME.darkOrange,
                          color: THEME.strawberryWhite,
                        }}
                        className="font-urdu inline-flex h-10 cursor-pointer items-center justify-center rounded-sm px-5 text-sm shadow-md transition-opacity hover:opacity-90"
                      >
                        مکمل پڑھیں
                      </Link>
                    </motion.div>

                    <div
                      className="flex items-center gap-3 text-sm"
                      style={{ color: THEME.mutedText }}
                    >
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {reaction?.likesCount ?? item.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                        {comments.length || item.commentsCount}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto p-6">
                  <p
                    style={{ color: THEME.darkText }}
                    className="mb-4 text-sm font-semibold uppercase tracking-wide"
                  >
                    Comments
                  </p>

                  {commentsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          style={{ backgroundColor: THEME.border }}
                          className="h-12 w-full animate-pulse rounded-xl"
                        />
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <p
                      style={{ color: THEME.mutedText }}
                      className="text-sm"
                    >
                      No comments yet — be the first to share your thoughts.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {comments.map((comment, i) => (
                          <motion.div
                            key={comment._id}
                            custom={i}
                            variants={commentVariants}
                            initial="hidden"
                            animate="show"
                            exit={{
                              opacity: 0,
                              x: 12,
                              transition: { duration: 0.2 },
                            }}
                            layout
                            className="flex gap-3"
                          >
                            <div
                              style={{
                                backgroundColor: THEME.darkOrange,
                                color: THEME.strawberryWhite,
                              }}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase"
                            >
                              {comment.user?.firstname?.[0] || "U"}
                            </div>
                            <div>
                              <div className="flex items-baseline gap-2">
                                <p
                                  style={{ color: THEME.darkText }}
                                  className="text-sm font-semibold"
                                >
                                  {comment.user
                                    ? `${comment.user.firstname} ${comment.user.lastname}`
                                    : "Anonymous"}
                                </p>
                                <span
                                  style={{ color: THEME.mutedText }}
                                  className="text-xs"
                                >
                                  {formatCommentTimestamp(comment.createdAt)}
                                </span>
                              </div>
                              <p
                                style={{ color: THEME.mutedText }}
                                className="mt-0.5 text-sm leading-relaxed"
                              >
                                {comment.content}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Add comment */}
                <div
                  className="border-t p-4"
                  style={{ borderColor: THEME.border }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitComment();
                      }}
                      placeholder="Write a comment..."
                      maxLength={500}
                      style={{
                        borderColor: THEME.border,
                        color: THEME.darkText,
                      }}
                      className="h-11 flex-1 rounded-full border bg-transparent px-4 text-sm outline-none transition-colors focus:border-[#9A3412]"
                    />
                    <motion.button
                      whileHover={{
                        scale:
                          submitting || !newComment.trim() ? 1 : 1.04,
                      }}
                      whileTap={{
                        scale:
                          submitting || !newComment.trim() ? 1 : 0.94,
                      }}
                      onClick={handleSubmitComment}
                      disabled={submitting || !newComment.trim()}
                      style={{
                        backgroundColor: THEME.darkOrange,
                        color: THEME.strawberryWhite,
                      }}
                      className="flex h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                        />
                      ) : (
                        "Post"
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}