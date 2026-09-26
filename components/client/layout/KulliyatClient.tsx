"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import apiClient from "@/lib/api";
import KalamScrollItem, {
  type KalamScrollItemData,
} from "./KalamScrollItem";
import KalamPagination from "./KalamPagination";
import KalamThreeBackground from "./KalamThreeBackground";
import KalamEmptyState from "./KalamEmptyState";
import AuthModal from "../models/AuthModal";

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

type KalamFilterType = "all" | "ghazal" | "nazm" | "qata" | "shair";

const TYPE_CHIPS: { key: KalamFilterType; labelUrdu: string }[] = [
  { key: "all", labelUrdu: "سب" },
  { key: "ghazal", labelUrdu: "غزلیں" },
  { key: "nazm", labelUrdu: "نظمیں" },
  { key: "qata", labelUrdu: "قطعات" },
  { key: "shair", labelUrdu: "اشعار" },
];

interface KulliyatResponse {
  poetry: KalamScrollItemData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    showing: string;
  };
  stats: {
    total: number;
    byType: Partial<Record<KalamFilterType, number>>;
  };
}

function isUnauthorized(errOrData: any): boolean {
  if (!errOrData) return false;
  const status = errOrData?.response?.status ?? errOrData?.status;
  const code = errOrData?.response?.data?.err ?? errOrData?.err;
  return status === 401 || code === "UNAUTHORIZED";
}

export default function KulliyatClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const typeParam = (searchParams.get("type") || "all") as KalamFilterType;
  const searchParam = searchParams.get("search") || "";

  const [data, setData] = useState<KulliyatResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParam);

  // Optimistic like state per item id
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  /* ============ SEARCH DEBOUNCE ============ */
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateQuery({ search: searchInput, page: 1 });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateQuery = useCallback(
    (updates: Partial<{ page: number; type: string; search: string }>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === "" || v === "all" || (k === "page" && v === 1)) next.delete(k);
        else next.set(k, String(v));
      });
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /* ============ FETCH ============ */
  const fetchKulliyat = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("limit", "6");
      if (typeParam && typeParam !== "all") params.set("type", typeParam);
      if (searchParam) params.set("search", searchParam);

      const res = await apiClient.get(
        `/api/client/deewan/kulliyat?${params.toString()}`
      );
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [pageParam, typeParam, searchParam]);

  useEffect(() => {
    fetchKulliyat();
  }, [fetchKulliyat]);

  /* ============ AUTH PROMPT ============ */
  const requireAuth = (msg: string) => {
    toast.info(
      <div dir="rtl">
        <div className="font-urdu text-sm font-bold" style={{ color: THEME.darkText }}>
          لاگ ان ضروری ہے
        </div>
        <div className="font-urdu mt-1 text-xs" style={{ color: THEME.mutedText }}>
          {msg}
        </div>
      </div>
    );
    setAuthMode("login");
    setIsAuthOpen(true);
  };

  /* ============ LIKE ============ */
  const handleLike = useCallback(
    async (item: KalamScrollItemData) => {
      if (likeBusy[item._id]) return;

      const prevLiked = likedMap[item._id] ?? false;
      setLikedMap((p) => ({ ...p, [item._id]: !prevLiked }));
      setLikeBusy((p) => ({ ...p, [item._id]: true }));

      // Optimistic count update on the item too
      setData((prev) =>
        prev
          ? {
              ...prev,
              poetry: prev.poetry.map((p) =>
                p._id === item._id
                  ? {
                      ...p,
                      likesCount: Math.max(0, (p.likesCount ?? 0) + (prevLiked ? -1 : 1)),
                    }
                  : p
              ),
            }
          : prev
      );

      try {
        const path =
          item.type === "shair"
            ? `/api/client/dashboard/deewan/shair/${item.slug}/likes`
            : `/api/client/dashboard/deewan/${item.type}/${item.slug}/likes`;

        const res = await apiClient.post(path, {
          reaction: prevLiked ? "unlike" : "like",
        });

        if (!res.data?.success && isUnauthorized(res.data)) {
          // Rollback
          setLikedMap((p) => ({ ...p, [item._id]: prevLiked }));
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  poetry: prev.poetry.map((p) =>
                    p._id === item._id
                      ? {
                          ...p,
                          likesCount: Math.max(
                            0,
                            (p.likesCount ?? 0) + (prevLiked ? 1 : -1)
                          ),
                        }
                      : p
                  ),
                }
              : prev
          );
          requireAuth("پسند کرنے کے لیے لاگ ان کریں۔");
        }
      } catch (err) {
        // Rollback
        setLikedMap((p) => ({ ...p, [item._id]: prevLiked }));
        setData((prev) =>
          prev
            ? {
                ...prev,
                poetry: prev.poetry.map((p) =>
                  p._id === item._id
                    ? {
                        ...p,
                        likesCount: Math.max(
                          0,
                          (p.likesCount ?? 0) + (prevLiked ? 1 : -1)
                        ),
                      }
                    : p
                ),
              }
            : prev
        );
        if (isUnauthorized(err)) requireAuth("پسند کرنے کے لیے لاگ ان کریں۔");
      } finally {
        setLikeBusy((p) => ({ ...p, [item._id]: false }));
      }
    },
    [likedMap, likeBusy]
  );

  /* ============ COMMENT — navigate to detail with anchor ============ */
  const handleComment = useCallback((item: KalamScrollItemData) => {
    const href = `/${item.type}/${item.slug}#comments`;
    router.push(href);
  }, [router]);

  const handlePageChange = (p: number) => {
    updateQuery({ page: p });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTypeChange = (t: KalamFilterType) => {
    updateQuery({ type: t, page: 1 });
  };

  const hasFilters = !!(searchParam || (typeParam && typeParam !== "all"));

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: THEME.strawberryWhite }}
    >
      <KalamThreeBackground opacity={0.5} particleCount={90} />

      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `
            radial-gradient(circle at 15% 8%, ${THEME.darkOrange}0E, transparent 42%),
            radial-gradient(circle at 85% 92%, ${THEME.emeraldGreen}0A, transparent 45%)
          `,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        {/* PANEL */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border shadow-lg backdrop-blur-md"
          style={{
            backgroundColor: "rgba(255, 252, 250, 0.94)",
            borderColor: THEME.border,
            boxShadow: `0 20px 60px -30px ${THEME.darkOrange}40, inset 0 1px 0 rgba(255,255,255,0.6)`,
          }}
        >
          <div
            className="h-[3px] w-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, ${THEME.orangeGlow}, ${THEME.darkOrange}, transparent)`,
            }}
            aria-hidden="true"
          />

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-7 text-center" dir="rtl">
              <p
                className="font-outfit mb-2 text-[10px] font-semibold uppercase tracking-[0.35em]"
                style={{ color: THEME.darkOrange }}
                dir="ltr"
              >
                The Complete Collection
              </p>
              <h1
                className="font-urdu text-3xl font-normal leading-[1.9] sm:text-4xl md:text-5xl"
                style={{ color: THEME.darkText }}
              >
                کلیاتِ رزب
              </h1>
              <div
                className="mx-auto mt-4 h-[2px] w-14 rounded-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${THEME.darkOrange}, transparent)`,
                }}
              />
              {!loading && data?.stats?.total ? (
                <p
                  className="font-outfit mt-4 text-xs"
                  style={{ color: THEME.mutedText }}
                  dir="ltr"
                >
                  <span className="font-semibold" style={{ color: THEME.darkText }}>
                    {data.stats.total.toLocaleString()}
                  </span>{" "}
                  pieces · showing {data.pagination.showing}
                </p>
              ) : null}
            </div>

            {/* SEARCH */}
            <div className="relative mx-auto mb-5 max-w-xl">
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm focus-within:shadow-md"
                style={{ borderColor: THEME.border, backgroundColor: "#FFFFFF" }}
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  style={{ color: THEME.darkOrange }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    d="M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 1 1 4 10.5a6.5 6.5 0 0 1 13 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="کلام میں تلاش کریں…"
                  dir="rtl"
                  className="font-urdu flex-1 bg-transparent text-base leading-[2] text-right outline-none placeholder:leading-[2] placeholder:text-sm placeholder:opacity-60"
                  style={{ color: THEME.darkText }}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="Clear search"
                    className="shrink-0 rounded-full p-1 transition-opacity hover:opacity-70"
                    style={{ color: THEME.mutedText }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* TYPE CHIPS */}
            <div className="flex flex-wrap items-center justify-center gap-2" dir="rtl" role="tablist">
              {TYPE_CHIPS.map((chip) => {
                const isActive = typeParam === chip.key;
                const count = data?.stats?.byType?.[chip.key];
                return (
                  <motion.button
                    key={chip.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTypeChange(chip.key)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    className="font-urdu flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold leading-[1.8]"
                    style={{
                      borderColor: isActive ? THEME.darkOrange : THEME.border,
                      backgroundColor: isActive ? THEME.darkOrange : "rgba(255,255,255,0.7)",
                      color: isActive ? "#FFFFFF" : THEME.darkText,
                      boxShadow: isActive ? `0 8px 20px -8px ${THEME.orangeGlow}AA` : "none",
                    }}
                  >
                    <span>{chip.labelUrdu}</span>
                    {typeof count === "number" && count > 0 && chip.key !== "all" && (
                      <span
                        className="font-outfit rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: isActive ? "rgba(255,255,255,0.25)" : `${THEME.darkOrange}15`,
                          color: isActive ? "#FFFFFF" : THEME.darkOrange,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {hasFilters && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setSearchInput("");
                    updateQuery({ search: "", type: "all", page: 1 });
                  }}
                  className="font-urdu text-xs font-semibold underline-offset-4 transition-opacity hover:opacity-70 hover:underline"
                  style={{ color: THEME.darkOrange }}
                  dir="rtl"
                >
                  فلٹرز صاف کریں
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* SCROLL FEED */}
        <div className="mt-14">
          {loading ? (
            <div className="flex flex-col gap-8 sm:gap-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : !data?.poetry?.length ? (
            <KalamEmptyState
              titleUrdu={hasFilters ? "کوئی نتیجہ نہیں ملا" : "ابھی کوئی کلام نہیں"}
              titleEnglish={hasFilters ? "No matches found" : "No kalam yet"}
              description={
                hasFilters
                  ? "Try a different search term or clear your filters."
                  : "Kalam will appear here once published."
              }
            />
          ) : (
            <div className="flex flex-col gap-8 sm:gap-10">
              {data.poetry.map((item, i) => (
                <KalamScrollItem
                  key={`${item.type}-${item._id}`}
                  item={item}
                  index={i}
                  priority={i < 2}
                  isLiked={likedMap[item._id] ?? false}
                  onLike={handleLike}
                  onComment={handleComment}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && data && data.pagination.totalPages > 1 && (
          <KalamPagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onChange={handlePageChange}
          />
        )}

        {!loading && data && data.pagination.total > 0 && data.pagination.totalPages > 1 && (
          <p
            className="mt-6 text-center font-outfit text-xs"
            style={{ color: THEME.mutedText }}
            dir="ltr"
          >
            Showing {data.pagination.showing}
          </p>
        )}
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onSuccess={() => {
          setIsAuthOpen(false);
          fetchKulliyat();
        }}
      />
    </main>
  );
}

/* =========================================================
   SKELETON — image always on left
========================================================= */
function SkeletonRow() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl border md:flex-row md:items-stretch"
      style={{
        backgroundColor: "rgba(255,255,255,0.55)",
        borderColor: THEME.border,
      }}
    >
      <div
        className="h-56 w-full animate-pulse md:h-auto md:w-[36%] md:min-h-[260px]"
        style={{ backgroundColor: "#F2D6CF80" }}
      />
      <div className="flex flex-1 flex-col gap-4 p-8">
        <div className="h-8 w-3/4 animate-pulse rounded" style={{ backgroundColor: "#F2D6CF80" }} />
        <div className="h-8 w-2/3 animate-pulse rounded" style={{ backgroundColor: "#F2D6CF80" }} />
        <div className="mt-auto flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-full" style={{ backgroundColor: "#F2D6CF80" }} />
          <div className="h-9 w-20 animate-pulse rounded-full" style={{ backgroundColor: "#F2D6CF80" }} />
          <div className="ml-auto h-10 w-36 animate-pulse rounded-full" style={{ backgroundColor: "#F2D6CF80" }} />
        </div>
      </div>
    </div>
  );
}