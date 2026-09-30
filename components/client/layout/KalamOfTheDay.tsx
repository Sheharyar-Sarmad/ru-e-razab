"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import apiClient from "@/lib/api";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

const KALAM_BG_IMAGE = "/kalam-of-the-day-bg.png";

type KalamType = "nazm" | "ghazal" | "qata" | "shair";

interface KalamOfTheDayItem {
  _id: string;
  type: KalamType;
  typeDisplay: string;
  typeDisplayUrdu: string;
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

interface ReactionState {
  likesCount: number;
  dislikesCount: number;
  isLiked: boolean;
  isDisliked: boolean;
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
    transition: {
      duration: 0.35,
      delay: Math.min(i, 8) * 0.04,
      ease: "easeOut",
    },
  }),
};

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

    const PARTICLE_COUNT = 180;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(THEME.emeraldGreen),
      size: 0.12,
      transparent: true,
      opacity: 0.5,
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
      points.rotation.y -= 0.0005;
      points.rotation.x += 0.00018;
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
    />
  );
}

export default function KalamOfTheDay() {
  const [item, setItem] = useState<KalamOfTheDayItem | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    "loading",
  );
  const [reaction, setReaction] = useState<ReactionState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const underlineRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchKalam = async () => {
      try {
        const res = await apiClient.get("/api/client/deewan/kalam-of-the-day");
        if (cancelled) return;

        if (res.data?.success && res.data?.data) {
          const data: KalamOfTheDayItem = res.data.data;
          setItem(data);
          setReaction({
            likesCount: data.likesCount || 0,
            dislikesCount: 0,
            isLiked: data.isLiked ?? false,
            isDisliked: data.isDisliked ?? false,
          });
          setStatus("ready");
        } else if (res.data?.success && !res.data?.data) {
          setStatus("empty");
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    fetchKalam();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          once: true,
        },
      });

      tl.from(".kotd-eyebrow", {
        y: 14,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
      })
        .from(
          ".kotd-heading",
          { y: 26, opacity: 0, duration: 0.7, ease: "power3.out" },
          "-=0.3",
        )
        .fromTo(
          underlineRef.current,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.6, ease: "power2.inOut" },
          "-=0.25",
        )
        .from(
          cardRef.current,
          { y: 50, opacity: 0, duration: 0.85, ease: "expo.out" },
          "-=0.2",
        );
    }, sectionRef);

    return () => ctx.revert();
  }, [status]);

  const handleReaction = useCallback(
    async (reactionType: "like" | "dislike", e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!item || !reaction) return;

      const config = API_ROUTES[item.type];
      if (reactionType === "dislike" && !config.supportsDislike) return;

      const prevState = reaction;
      const nextIsLiked = reactionType === "like" ? !prevState.isLiked : false;
      const nextIsDisliked =
        reactionType === "dislike" ? !prevState.isDisliked : false;

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

      setReaction(optimistic);

      try {
        const res = await apiClient.post(config.likes(item.slug), {
          reaction: reactionType,
        });
        if (res.data?.success) {
          const { likesCount, dislikesCount, isLiked, isDisliked } =
            res.data.data;
          setReaction({
            likesCount: likesCount ?? optimistic.likesCount,
            dislikesCount: dislikesCount ?? optimistic.dislikesCount,
            isLiked: isLiked ?? false,
            isDisliked: isDisliked ?? false,
          });
        } else {
          setReaction(prevState);
        }
      } catch {
        setReaction(prevState);
      }
    },
    [item, reaction],
  );

  if (status === "error") return null;

  return (
    <section
      ref={sectionRef}
      aria-label="Kalam of the Day"
      style={{ backgroundColor: THEME.strawberryWhite }}
      className="relative w-full min-h-[80vh] flex flex-col justify-center overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:px-10 lg:px-16 xl:px-24"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src={KALAM_BG_IMAGE}
          alt=""
          fill
          className="object-cover"
          quality={100}
          priority={true}
        />
      </div>

      <ThreeBackground />

      <div className="relative z-10 mx-auto max-w-5xl w-full">
        <div className="mb-10 flex flex-col items-center text-center sm:mb-14">
          <p
            style={{ color: THEME.emeraldGreen }}
            className="kotd-eyebrow mb-2 text-xs font-semibold uppercase tracking-[0.25em] sm:text-sm"
          >
            Kalam of the Day
          </p>
          <h2
            dir="rtl"
            className="text-white font-urdu text-4xl leading-relaxed sm:text-5xl md:text-6xl"
          >
            کلامِ روز
          </h2>
          <span
            ref={underlineRef}
            style={{
              backgroundColor: THEME.emeraldGreen,
              transformOrigin: "center",
            }}
            className="mt-8 h-[3px] w-16 rounded-full sm:w-20"
          />
        </div>

        {status === "loading" && (
          <div
            style={{ backgroundColor: THEME.border }}
            className="mx-auto h-[420px] w-full max-w-3xl animate-pulse rounded-2xl"
          />
        )}

        {status === "empty" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ borderColor: THEME.border, color: THEME.mutedText }}
            className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-dashed px-8 py-16 text-center"
          >
            <p
              dir="rtl"
              className="font-urdu text-xl leading-relaxed sm:text-2xl"
              style={{ color: THEME.strawberryWhite }}
            >
              گزشتہ چوبیس گھنٹوں میں کوئی نیا کلام شائع نہیں ہوا۔
            </p>
            <p className="mt-3 text-sm">
              Check back soon for today&apos;s Kalam.
            </p>
          </motion.div>
        )}

        {status === "ready" && item && (
          <div ref={cardRef} className="relative mx-auto max-w-3xl">
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              onClick={() => setModalOpen(true)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl"
              style={{ backgroundColor: THEME.strawberryWhite }}
            >
              {item.coverImage && (
                <div className="relative h-72 w-full overflow-hidden sm:h-96">
                  <motion.div
                    className="absolute inset-0"
                    whileHover={{ scale: 1.06 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Image
                      src={item.coverImage}
                      alt=""
                      fill
                      priority={true}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                      quality={100}
                    />
                  </motion.div>

                  <motion.span
                    dir="rtl"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    style={{
                      backgroundColor: THEME.emeraldGreen,
                      color: THEME.strawberryWhite,
                    }}
                    className="font-urdu absolute right-5 top-5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm"
                  >
                    {TYPE_URDU[item.type]}
                  </motion.span>

                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 drop-shadow-md">
                    {item.type === "nazm" && item.title && (
                      <h3
                        dir="rtl"
                        style={{ color: THEME.strawberryWhite }}
                        className="font-urdu mb-2 text-2xl leading-snug sm:text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                      >
                        {item.title}
                      </h3>
                    )}
                    {item.firstLine && (
                      <p
                        dir="rtl"
                        style={{ color: THEME.strawberryWhite }}
                        className="font-urdu text-lg leading-loose sm:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                      >
                        {item.firstLine}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!item.coverImage && (
                <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
                  <span
                    dir="rtl"
                    style={{
                      backgroundColor: THEME.emeraldGreen,
                      color: THEME.strawberryWhite,
                    }}
                    className="font-urdu rounded-full px-3.5 py-1.5 text-sm font-semibold"
                  >
                    {TYPE_URDU[item.type]}
                  </span>
                  {item.type === "nazm" && item.title && (
                    <h3
                      dir="rtl"
                      style={{ color: THEME.darkText }}
                      className="font-urdu text-2xl leading-snug sm:text-3xl"
                    >
                      {item.title}
                    </h3>
                  )}
                  {item.firstLine && (
                    <p
                      dir="rtl"
                      style={{ color: THEME.darkText }}
                      className="font-urdu text-lg leading-loose sm:text-xl"
                    >
                      {item.firstLine}
                    </p>
                  )}
                </div>
              )}

              <div
                className="flex flex-col gap-4 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 bg-white/10"
                style={{ borderColor: THEME.border }}
              >
                <div
                  className="flex items-center gap-4 text-sm"
                  style={{ color: THEME.mutedText }}
                >
                  <span>
                    Published {formatCommentTimestamp(item.createdAt)}
                  </span>
                </div>

                <div
                  className="flex items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => handleReaction("like", e)}
                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                    style={{ color: THEME.mutedText }}
                    aria-label="Like"
                  >
                    <motion.svg
                      animate={
                        reaction?.isLiked
                          ? { scale: [1, 1.35, 1] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill={reaction?.isLiked ? THEME.deepRed : "none"}
                      stroke="currentColor"
                      strokeWidth={reaction?.isLiked ? 0 : 1.8}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </motion.svg>
                    <span>{reaction?.likesCount ?? item.likesCount}</span>
                  </motion.button>

                  {API_ROUTES[item.type].supportsDislike && (
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => handleReaction("dislike", e)}
                      className="flex cursor-pointer items-center gap-1.5 text-sm"
                      style={{ color: THEME.mutedText }}
                      aria-label="Dislike"
                    >
                      <motion.svg
                        animate={
                          reaction?.isDisliked
                            ? { scale: [1, 1.35, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="h-4 w-4 rotate-180"
                        viewBox="0 0 24 24"
                        fill={reaction?.isDisliked ? THEME.mutedText : "none"}
                        stroke="currentColor"
                        strokeWidth={reaction?.isDisliked ? 0 : 1.8}
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </motion.svg>
                      <span>{reaction?.dislikesCount ?? 0}</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setModalOpen(true)}
                    className="flex cursor-pointer items-center gap-1.5 text-sm"
                    style={{ color: THEME.mutedText }}
                    aria-label="Comments"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                    <span>{item.commentsCount}</span>
                  </motion.button>

                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Link
                      href={`${TYPE_ROUTES[item.type]}/${item.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: THEME.emeraldGreen,
                        color: THEME.strawberryWhite,
                      }}
                      className="font-urdu inline-flex h-9 cursor-pointer items-center justify-center rounded-sm px-4 text-sm shadow-sm transition-opacity hover:opacity-90"
                    >
                      کلام پڑھیں
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <KalamOfTheDayPanel
        item={modalOpen ? item : null}
        reaction={reaction}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}

function KalamOfTheDayPanel({
  item,
  reaction,
  onClose,
}: {
  item: KalamOfTheDayItem | null;
  reaction: ReactionState | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      }
    } catch {
      // Handle accordingly
    } finally {
      setSubmitting(false);
    }
  };

  const gallery = useMemo(
    () => (item?.coverImage ? [item.coverImage] : []),
    [item],
  );

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
            className="fixed left-1/2 top-1/2 z-[61] w-[94%] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl flex flex-col"
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
              {gallery.length > 0 && (
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
                        priority={true}
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        quality={100}
                      />
                    </motion.div>
                  ))}
                  <span
                    dir="rtl"
                    style={{
                      backgroundColor: THEME.emeraldGreen,
                      color: THEME.strawberryWhite,
                    }}
                    className="font-urdu absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                  >
                    {TYPE_URDU[item.type]}
                  </span>
                </div>
              )}

              <div
                className={`flex w-full flex-col ${gallery.length > 0 ? "md:w-1/2" : ""}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="border-b p-6"
                  style={{ borderColor: THEME.border }}
                >
                  {item.type === "nazm" && item.title && (
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
                          backgroundColor: THEME.emeraldGreen,
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
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {reaction?.likesCount ?? item.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                        {item.commentsCount}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Comments Section */}
                <div className="flex flex-col flex-1 bg-white/40 p-6 overflow-hidden">
                  <h3
                    dir="rtl"
                    className="font-urdu mb-4 text-xl font-semibold"
                    style={{ color: THEME.darkText }}
                  >
                    تبصرے
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
                    {commentsLoading ? (
                      <div
                        className="text-center text-sm py-4"
                        style={{ color: THEME.mutedText }}
                      >
                        Loading comments...
                      </div>
                    ) : comments.length > 0 ? (
                      comments.map((comment, i) => (
                        <motion.div
                          key={comment._id}
                          custom={i}
                          variants={commentVariants}
                          initial="hidden"
                          animate="show"
                          className="rounded-lg p-3 shadow-sm bg-white/80 border"
                          style={{ borderColor: THEME.border }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span
                              className="font-medium text-sm"
                              style={{ color: THEME.darkText }}
                            >
                              {comment.user?.firstname} {comment.user?.lastname}
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: THEME.mutedText }}
                            >
                              {formatCommentTimestamp(comment.createdAt)}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            style={{ color: THEME.darkText }}
                          >
                            {comment.content}
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      <div
                        className="text-center text-sm py-4"
                        style={{ color: THEME.mutedText }}
                      >
                        No comments yet.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2 pt-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none"
                      style={{
                        borderColor: THEME.border,
                        color: THEME.darkText,
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSubmitComment()
                      }
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={submitting || !newComment.trim()}
                      className="px-4 py-2 rounded-md text-sm font-semibold transition-opacity disabled:opacity-50"
                      style={{
                        backgroundColor: THEME.emeraldGreen,
                        color: THEME.strawberryWhite,
                      }}
                    >
                      {submitting ? "..." : "Send"}
                    </button>
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
