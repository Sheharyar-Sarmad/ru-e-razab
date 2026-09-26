"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Eye, Loader2, BookOpen, Filter } from "lucide-react";
import apiClient from "@/lib/api";

const THEME = {
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

type KalamType = "ghazal" | "nazm" | "qata" | "shair";
type ActivityMode = "both" | "likes" | "comments";

interface ActivityHit {
  _id: string;
  type: KalamType;
  typeDisplayUrdu: string;
  title: string;
  slug: string;
  href: string;
  firstLine: string;
  category: string[];
  coverImage: string;
  likesCount: number;
  commentsCount: number;
  views: number;
  createdAt: string;
  userActivity: {
    hasLiked: boolean;
    userCommentCount: number;
    userComments: { _id: string; content: string; createdAt: string }[];
    lastActivityAt: string;
  };
}

interface ActivityPayload {
  stats: {
    totalKalamWithActivity: number;
    totalLikes: number;
    totalComments: number;
    byType: Record<KalamType, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
  results: ActivityHit[];
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString();
}

const TYPE_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

const TYPE_TABS: { key: KalamType | "all"; label: string }[] = [
  { key: "all", label: "سب" },
  { key: "ghazal", label: "غزل" },
  { key: "nazm", label: "نظم" },
  { key: "qata", label: "قطعہ" },
  { key: "shair", label: "شعر" },
];

const ACTIVITY_TABS: { key: ActivityMode; label: string; labelUr: string }[] = [
  { key: "both", label: "All", labelUr: "سب" },
  { key: "likes", label: "Liked", labelUr: "پسند" },
  { key: "comments", label: "Commented", labelUr: "تبصرے" },
];

export default function ActivityTab() {
  const [activity, setActivity] = useState<ActivityMode>("both");
  const [typeFilter, setTypeFilter] = useState<KalamType | "all">("all");
  const [data, setData] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchActivity = useCallback(
    async (opts?: { append?: boolean }) => {
      const append = opts?.append ?? false;
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          activity,
          page: String(page),
          limit: "9",
        });
        if (typeFilter !== "all") params.set("type", typeFilter);

        const res = await apiClient.get(
          `/api/client/dashboard/deewan/my-activity?${params.toString()}`
        );

        if (res.data?.success) {
          const payload = res.data.data as ActivityPayload;
          if (append && data) {
            setData({
              ...payload,
              results: [...data.results, ...payload.results],
            });
          } else {
            setData(payload);
          }
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activity, typeFilter, page, data]
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activity, typeFilter]);

  // Fetch on filter/page change
  useEffect(() => {
    fetchActivity({ append: page > 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, typeFilter, page]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Activity mode */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-outfit text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: THEME.mutedText }}
          >
            <Filter size={12} className="inline mr-1" />
            Show
          </span>
          {ACTIVITY_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActivity(t.key)}
              className="font-outfit relative rounded-full px-4 py-1.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor:
                  activity === t.key ? THEME.darkOrange : "transparent",
                color:
                  activity === t.key ? "#FFFFFF" : THEME.mutedText,
                border: `1px solid ${
                  activity === t.key ? THEME.darkOrange : THEME.border
                }`,
              }}
            >
              {t.label} <span className="font-urdu mr-1">{t.labelUr}</span>
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap items-center gap-2" dir="rtl">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className="font-urdu rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
              style={{
                backgroundColor:
                  typeFilter === t.key ? `${THEME.emeraldGreen}15` : "transparent",
                color:
                  typeFilter === t.key ? THEME.emeraldGreen : THEME.mutedText,
                border: `1px solid ${
                  typeFilter === t.key ? THEME.emeraldGreen : THEME.border
                }`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <Stat label="Kalam" urdu="کلام" value={data.stats.totalKalamWithActivity} accent={THEME.darkOrange} />
          <Stat label="Liked" urdu="پسند" value={data.stats.totalLikes} accent={THEME.deepRed} />
          <Stat label="Comments" urdu="تبصرے" value={data.stats.totalComments} accent={THEME.emeraldGreen} />
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl"
              style={{ backgroundColor: `${THEME.border}60` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.results.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            borderColor: THEME.darkOrange,
          }}
          dir="rtl"
        >
          <BookOpen size={36} style={{ color: THEME.darkOrange, opacity: 0.6 }} />
          <p
            className="font-urdu mt-4 text-lg leading-[2]"
            style={{ color: THEME.darkText }}
          >
            ابھی تک کوئی سرگرمی نہیں
          </p>
          <p
            className="font-outfit mt-1 text-xs"
            style={{ color: THEME.mutedText }}
            dir="ltr"
          >
            Like or comment on any kalam to see it here.
          </p>
          <Link
            href="/kulliyat"
            className="font-urdu mt-5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
            style={{ backgroundColor: THEME.darkOrange }}
          >
            کلیات دیکھیں
          </Link>
        </motion.div>
      )}

      {/* Cards grid */}
      {!loading && data && data.results.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {data.results.map((hit, i) => (
              <ActivityCard key={`${hit.type}-${hit._id}`} hit={hit} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Load more */}
      {!loading && data?.pagination.hasMore && (
        <div className="flex justify-center pt-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPage((p) => p + 1)}
            disabled={loadingMore}
            className="font-outfit inline-flex h-11 items-center gap-2 rounded-full border px-6 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              borderColor: THEME.border,
              color: THEME.darkText,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
            }}
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  urdu,
  value,
  accent,
}: {
  label: string;
  urdu: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border p-4 text-center"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        borderColor: THEME.border,
      }}
    >
      <span
        className="font-outfit text-2xl font-bold"
        style={{ color: accent }}
        dir="ltr"
      >
        {value}
      </span>
      <span
        className="font-urdu mt-1 text-xs"
        style={{ color: THEME.mutedText }}
        dir="rtl"
      >
        {urdu}
      </span>
      <span
        className="font-outfit text-[10px] font-semibold uppercase tracking-widest opacity-60"
        style={{ color: THEME.mutedText }}
      >
        {label}
      </span>
    </div>
  );
}

function ActivityCard({ hit, index }: { hit: ActivityHit; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index, 8) * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={hit.href}
        className="group block overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-lg"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          borderColor: THEME.border,
        }}
      >
        {/* Cover */}
        <div className="relative h-32 w-full overflow-hidden">
          {hit.coverImage ? (
            <Image
              src={hit.coverImage}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${THEME.darkOrange}20, ${THEME.emeraldGreen}15)`,
              }}
            >
              <span
                className="font-urdu text-3xl"
                style={{ color: THEME.darkOrange }}
              >
                {hit.typeDisplayUrdu}
              </span>
            </div>
          )}

          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 45%, rgba(58,33,27,0.85) 100%)`,
            }}
          />

          {/* Type badge */}
          <span
            className="font-urdu absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm"
            style={{ backgroundColor: THEME.emeraldGreen, color: "#FFFFFF" }}
          >
            {hit.typeDisplayUrdu}
          </span>

          {/* Liked indicator */}
          {hit.userActivity.hasLiked && (
            <span
              className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full shadow-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
              aria-label="You liked this"
            >
              <Heart size={14} fill={THEME.deepRed} stroke={THEME.deepRed} />
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-4" dir="rtl">
          <p
            className="font-urdu line-clamp-2 text-sm leading-[2]"
            style={{ color: THEME.darkText }}
          >
            {hit.firstLine || hit.title}
          </p>

          {/* Meta */}
          <div
            className="mt-3 flex items-center justify-between border-t pt-3"
            style={{ borderColor: THEME.border }}
          >
            <div
              className="flex items-center gap-3 text-[11px] font-outfit"
              style={{ color: THEME.mutedText }}
            >
              <span className="flex items-center gap-1">
                <Heart size={11} /> {hit.likesCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={11} /> {hit.commentsCount}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={11} /> {hit.views}
              </span>
            </div>
            <span
              className="font-outfit text-[10px] opacity-70"
              style={{ color: THEME.mutedText }}
            >
              {timeAgo(hit.userActivity.lastActivityAt)}
            </span>
          </div>

          {/* Your activity summary */}
          {(hit.userActivity.hasLiked || hit.userActivity.userCommentCount > 0) && (
            <div
              className="mt-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-outfit"
              style={{
                backgroundColor: `${THEME.darkOrange}10`,
                color: THEME.darkOrange,
              }}
              dir="ltr"
            >
              {hit.userActivity.hasLiked && (
                <span className="flex items-center gap-1">
                  <Heart size={10} fill={THEME.darkOrange} stroke={THEME.darkOrange} />
                  You liked
                </span>
              )}
              {hit.userActivity.hasLiked && hit.userActivity.userCommentCount > 0 && (
                <span className="opacity-40">•</span>
              )}
              {hit.userActivity.userCommentCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle size={10} />
                  {hit.userActivity.userCommentCount} comment
                  {hit.userActivity.userCommentCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}