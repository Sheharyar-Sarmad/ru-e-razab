"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import apiClient from "@/lib/api";
import AuthModal from "../models/AuthModal";
import KalamDetailHero from "./KalamDetailHero";
import KalamPoemBody from "./KalamPoemBody";
import KalamLinksSection from "./KalamLinksSection";
import KalamMediaSection, { type MediaFile } from "./KalamMediaSection";
import KalamRecitationPlayer from "./KalamRecitationPlayer";
import KalamActionBar from "./KalamActionBar";
import KalamCommentsSection from "./KalamCommentsSection";
import KalamAskAIPanel from "./KalamAskAIPanel";
import KalamDetailSkeleton from "./KalamDetailSkeleton";
import KalamThreeBackground from "./KalamThreeBackground";

const THEME = {
  strawberryWhite: "#FFF7F4",
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

const TYPE_LABEL: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

const SUPPORTS_DISLIKE: Record<KalamType, boolean> = {
  ghazal: true,
  nazm: false,
  qata: true,
  shair: true,
};

const LIKE_SEGMENT: Record<KalamType, string> = {
  ghazal: "ghazal",
  nazm: "nazm",
  qata: "qata",
  shair: "shair",
};

/* =========================================================
   DETAIL API PATH
========================================================= */
const DETAIL_API: Record<KalamType, (slug: string) => string> = {
  ghazal: (slug) => `/api/client/deewan/ghazal/${slug}`,
  nazm: (slug) => `/api/client/deewan/nazm/${slug}`,
  qata: (slug) => `/api/client/deewan/qata/${slug}`,
  shair: (slug) => `/api/client/deewan/shair/${slug}`,
};

/* =========================================================
   DOC EXTRACTOR
========================================================= */
function extractDoc(raw: any): any | null {
  if (!raw || typeof raw !== "object") return null;
  return (
    raw.ghazal ||
    raw.nazm ||
    raw.qata ||
    raw.shair ||
    (raw.slug && raw.content ? raw : null)
  );
}

interface KalamData {
  _id: string;
  slug: string;
  type?: KalamType;
  unwan?: string;
  takhallus: string;
  content: any;
  category: string[];
  coverImage: string;
  coverImageMetadata?: Record<string, any>;
  media?: MediaFile[];
  metaTitle?: string;
  metaDescription?: string;
  links?: { title: string; url: string; type?: string }[];
  likes?: any[];
  dislikes?: any[];
  comments?: any[];
  views?: number;
  featured?: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Props {
  type: KalamType;
  slug: string;
}

function isUnauthorized(errOrData: any): boolean {
  if (!errOrData) return false;
  const status = errOrData?.response?.status ?? errOrData?.status;
  const code = errOrData?.response?.data?.err ?? errOrData?.err;
  return status === 401 || code === "UNAUTHORIZED";
}

/* =========================================================
   AUTO ASPECT RATIO
========================================================= */
function pickAspectRatio(metadata?: Record<string, any>): string {
  const w = metadata?.width;
  const h = metadata?.height;

  if (!w || !h || typeof w !== "number" || typeof h !== "number") {
    return "16 / 9";
  }

  const ratio = w / h;
  if (ratio >= 2.2) return "21 / 9";
  if (ratio >= 1.6) return "16 / 9";
  if (ratio >= 1.3) return "3 / 2";
  if (ratio >= 1.05) return "4 / 3";
  if (ratio >= 0.9) return "1 / 1";
  if (ratio >= 0.7) return "4 / 5";
  return "3 / 4";
}

export default function KalamDetailClient({ type, slug }: Props) {
  const [data, setData] = useState<KalamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isAIOpen, setIsAIOpen] = useState(false);

  const commentsRef = useRef<HTMLDivElement | null>(null);

  /* =========================================================
     FETCH
  ========================================================= */
  const fetchKalam = useCallback(async () => {
    setLoading(true);
    try {
      const url = DETAIL_API[type](slug);
      const res = await apiClient.get(url);

      if (res.data?.success && res.data?.data) {
        const doc = extractDoc(res.data.data);

        if (!doc) {
          setNotFound(true);
          return;
        }

        setData(doc);
        setLikesCount(doc.likes?.length ?? 0);
        setDislikesCount(doc.dislikes?.length ?? 0);
        setCommentsCount(doc.comments?.length ?? 0);
        setNotFound(false);

        try {
          const likeRes = await apiClient.get(
            `/api/client/dashboard/deewan/${LIKE_SEGMENT[type]}/${slug}/likes`
          );
          if (likeRes.data?.success && likeRes.data?.data) {
            const d = likeRes.data.data;
            setLikesCount(d.likesCount ?? doc.likes?.length ?? 0);
            setDislikesCount(d.dislikesCount ?? 0);
            setIsLiked(d.isLiked ?? false);
            setIsDisliked(d.isDisliked ?? false);
          }
        } catch {
          /* not logged in */
        }
      } else if (res.status === 404) {
        setNotFound(true);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) setNotFound(true);
      else console.error("Kalam fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [type, slug]);

  useEffect(() => {
    fetchKalam();
  }, [fetchKalam]);

  /* =========================================================
     AUTH PROMPT
  ========================================================= */
  const requireAuth = useCallback((msg: string) => {
    toast.info(
      <div dir="rtl">
        <div
          className="font-urdu text-sm font-bold"
          style={{ color: THEME.darkText }}
        >
          لاگ ان ضروری ہے
        </div>
        <div
          className="font-urdu mt-1 text-xs"
          style={{ color: THEME.mutedText }}
        >
          {msg}
        </div>
      </div>
    );
    setAuthMode("login");
    setIsAuthOpen(true);
  }, []);

  /* =========================================================
     LIKE / DISLIKE
  ========================================================= */
  const react = useCallback(
    async (reaction: "like" | "dislike") => {
      if (likeBusy) return;
      setLikeBusy(true);

      const prev = { likesCount, dislikesCount, isLiked, isDisliked };

      if (reaction === "like") {
        if (isLiked) {
          setLikesCount((c) => Math.max(0, c - 1));
          setIsLiked(false);
        } else {
          setLikesCount((c) => c + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikesCount((c) => Math.max(0, c - 1));
            setIsDisliked(false);
          }
        }
      } else {
        if (isDisliked) {
          setDislikesCount((c) => Math.max(0, c - 1));
          setIsDisliked(false);
        } else {
          setDislikesCount((c) => c + 1);
          setIsDisliked(true);
          if (isLiked) {
            setLikesCount((c) => Math.max(0, c - 1));
            setIsLiked(false);
          }
        }
      }

      try {
        const res = await apiClient.post(
          `/api/client/dashboard/deewan/${LIKE_SEGMENT[type]}/${slug}/likes`,
          { reaction }
        );
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          if (typeof d.likesCount === "number") setLikesCount(d.likesCount);
          if (typeof d.dislikesCount === "number")
            setDislikesCount(d.dislikesCount);
          if (typeof d.isLiked === "boolean") setIsLiked(d.isLiked);
          if (typeof d.isDisliked === "boolean") setIsDisliked(d.isDisliked);
        } else if (isUnauthorized(res.data)) {
          setLikesCount(prev.likesCount);
          setDislikesCount(prev.dislikesCount);
          setIsLiked(prev.isLiked);
          setIsDisliked(prev.isDisliked);
          requireAuth("پسند کرنے کے لیے لاگ ان کریں۔");
        }
      } catch (err: any) {
        setLikesCount(prev.likesCount);
        setDislikesCount(prev.dislikesCount);
        setIsLiked(prev.isLiked);
        setIsDisliked(prev.isDisliked);
        if (isUnauthorized(err)) requireAuth("پسند کرنے کے لیے لاگ ان کریں۔");
      } finally {
        setLikeBusy(false);
      }
    },
    [
      likeBusy,
      likesCount,
      dislikesCount,
      isLiked,
      isDisliked,
      type,
      slug,
      requireAuth,
    ]
  );

  const handleLike = () => react("like");
  const handleDislike = () => react("dislike");

  const scrollToComments = useCallback(() => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* =========================================================
     NOT FOUND
  ========================================================= */
  if (notFound) {
    return (
      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
        style={{ backgroundColor: THEME.strawberryWhite }}
      >
        <KalamThreeBackground opacity={0.9} particleCount={260} />
        <div className="relative z-10 text-center" dir="rtl">
          <p
            className="font-urdu text-2xl leading-[2]"
            style={{ color: THEME.darkText }}
          >
            یہ {TYPE_LABEL[type]} نہیں ملی
          </p>
          <p
            className="font-outfit mt-2 text-sm"
            style={{ color: THEME.mutedText }}
            dir="ltr"
          >
            The {type} you&apos;re looking for doesn&apos;t exist.
          </p>
          <a
            href={`/${type}s`}
            className="font-urdu mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-105"
            style={{ backgroundColor: THEME.rust }}
          >
            تمام {TYPE_LABEL[type]} دیکھیں
          </a>
        </div>
      </main>
    );
  }

  if (loading || !data) return <KalamDetailSkeleton />;

  /* =========================================================
     DERIVED
  ========================================================= */
  const firstLine =
    type === "shair"
      ? Array.isArray(data.content)
        ? data.content[0] ?? ""
        : ""
      : type === "nazm"
      ? data.content?.[0]?.shairs?.[0]?.lines?.[0] ?? ""
      : data.content?.[0]?.lines?.[0] ?? "";

  const copyText = (() => {
    if (type === "shair")
      return Array.isArray(data.content) ? data.content.join("\n") : "";
    if (type === "nazm")
      return (data.content || [])
        .flatMap((b: any) => b.shairs || [])
        .map((s: any) => s.lines?.join("\n") ?? "")
        .join("\n\n");
    return (data.content || [])
      .map((c: any) => c.lines?.join("\n") ?? "")
      .join("\n\n");
  })();

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const hasCover = !!data.coverImage;
  const coverAspect = pickAspectRatio(data.coverImageMetadata);

  return (
    <main
      className="relative min-h-screen"
      style={{ backgroundColor: THEME.strawberryWhite }}
    >
      {/* Ambient 3D background */}
      <KalamThreeBackground opacity={0.9} particleCount={260} zCamera={14} />

      {/* Warm radial glows */}
      <div
        className="pointer-events-none"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background: `
            radial-gradient(circle at 15% 10%, ${THEME.rust}0F, transparent 45%),
            radial-gradient(circle at 85% 90%, ${THEME.emerald}0A, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      <div
        className="relative mx-auto px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:px-10"
        style={{
          zIndex: 10,
          maxWidth: "min(1600px, 96vw)",
        }}
      >
        {/* ============ MAIN GRID ============ */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
          {/* ============ LEFT COLUMN — Cover + Recitation ============ */}
          <aside className="order-2 lg:order-1">
            <div className="space-y-5 lg:sticky lg:top-24">
              {/* Cover */}
              {hasCover && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden rounded-3xl border shadow-xl"
                  style={{
                    borderColor: THEME.border,
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: coverAspect }}
                  >
                    <Image
                      src={data.coverImage}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 50vw"
                      quality={95}
                      className="object-cover object-center"
                    />
                  </div>

                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
                    style={{
                      background: `linear-gradient(180deg, transparent, rgba(15,8,5,0.35))`,
                    }}
                    aria-hidden="true"
                  />

                  <span
                    className="font-urdu absolute right-4 top-4 rounded-full px-4 py-1.5 text-sm font-bold leading-[1.7] shadow-lg backdrop-blur-md"
                    style={{
                      backgroundColor: "rgba(154, 52, 18, 0.94)",
                      color: "#FFF7F4",
                    }}
                  >
                    {TYPE_LABEL[type]}
                  </span>

                  {data.featured && (
                    <span
                      className="font-outfit absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur-md"
                      style={{
                        backgroundColor: "rgba(4, 120, 87, 0.94)",
                      }}
                      dir="ltr"
                    >
                      Featured
                    </span>
                  )}
                </motion.div>
              )}

              {/* Recitation */}
              <KalamRecitationPlayer type={type} content={data.content} />
            </div>
          </aside>

          {/* ============ RIGHT COLUMN — Content + Media ============ */}
          <div className="order-1 space-y-6 lg:order-2">
            <KalamDetailHero
              type={type}
              title={type === "nazm" ? data.unwan || data.metaTitle : undefined}
              category={data.category}
              takhallus={data.takhallus}
              publishedAt={data.publishedAt}
              createdAt={data.createdAt}
              featured={data.featured ?? false}
              firstLine={firstLine}
            />

            {/* Poem body */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative overflow-hidden rounded-3xl border p-6 shadow-sm sm:p-10"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: THEME.border,
                boxShadow: `0 16px 40px -28px ${THEME.rust}30`,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  background: `
                    radial-gradient(circle at 50% 0%, ${THEME.orangeGlow}06, transparent 55%),
                    radial-gradient(circle at 50% 100%, ${THEME.emerald}06, transparent 55%)
                  `,
                }}
                aria-hidden="true"
              />

              <div className="relative z-10">
                <KalamPoemBody
                  type={type}
                  content={data.content}
                  interactive
                />
              </div>
            </motion.div>

            {/* ✅ LINKS — right after the poem body */}
            <KalamLinksSection links={data.links} />

            {/* Action bar */}
            <KalamActionBar
              type={type}
              likesCount={likesCount}
              dislikesCount={dislikesCount}
              commentsCount={commentsCount}
              isLiked={isLiked}
              isDisliked={isDisliked}
              supportsDislike={SUPPORTS_DISLIKE[type]}
              likeBusy={likeBusy}
              onLike={handleLike}
              onDislike={SUPPORTS_DISLIKE[type] ? handleDislike : undefined}
              onCommentClick={scrollToComments}
              onAskAI={() => setIsAIOpen(true)}
              shareData={{
                title: `${firstLine} — Ru-e-Razab`,
                text: firstLine,
                url: shareUrl,
              }}
              copyText={copyText}
            />

            {/* Media */}
            <KalamMediaSection media={data.media} />
          </div>
        </div>

        {/* ============ COMMENTS ============ */}
        <div ref={commentsRef} className="mt-12">
          <KalamCommentsSection
            type={type}
            slug={slug}
            onAuthRequired={requireAuth}
            onCountChange={setCommentsCount}
          />
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <a
            href={`/${type}s`}
            className="font-urdu inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all hover:scale-105"
            style={{
              borderColor: THEME.border,
              color: THEME.darkText,
              backgroundColor: "#FFF",
            }}
          >
            ← تمام {TYPE_LABEL[type]}
          </a>
        </div>
      </div>

      {/* AI panel */}
      <KalamAskAIPanel
        type={type}
        slug={slug}
        title={data.unwan || data.metaTitle}
        firstLine={firstLine}
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />

      {/* Auth modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setIsAuthOpen(false);
          fetchKalam();
        }}
      />
    </main>
  );
}