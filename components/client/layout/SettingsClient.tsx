"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import apiClient from "@/lib/api";
import ThreeBackground from "./ThreeBackground";
import { ToastViewport, type ToastData, type ToastKind } from "./Toast";
import ProfileTab, { type UserData } from "./ProfileTab";
import SecurityTab from "./SecurityTab";
import ActivityTab from "./ActivityTab";

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
  creamText: "#FFF7F4",
  creamMuted: "rgba(255, 247, 244, 0.72)",
};

const BG_IMAGE = "/settings-bg.png";
const USER_CACHE_KEY = "ru-e-razab:user";
const REDIRECT_DELAY_MS = 800;

type TabKey = "profile" | "security" | "activity";

const TABS: { key: TabKey; labelUr: string; labelEn: string }[] = [
  { key: "profile", labelUr: "پروفائل", labelEn: "Profile" },
  { key: "security", labelUr: "سیکیورٹی", labelEn: "Security" },
  { key: "activity", labelUr: "سرگرمی", labelEn: "Activity" },
];

/* =========================================================
   CACHE HELPERS — safe against SSR / private mode / quota
========================================================= */

function readCachedUser(): UserData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id) {
      return parsed as UserData;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: UserData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    /* quota exceeded / private mode — ignore */
  }
}

function clearCachedUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/* =========================================================
   AUTH FAILURE DETECTION
========================================================= */

function isUnauthorized(errOrData: any): boolean {
  if (!errOrData) return false;
  const status =
    errOrData?.response?.status ?? errOrData?.status;
  const code =
    errOrData?.response?.data?.err ?? errOrData?.err;
  return status === 401 || code === "UNAUTHORIZED";
}

/* =========================================================
   MAIN
========================================================= */

export default function SettingsClient() {
  const router = useRouter();

  // Seed from cache so repeat visits render instantly
  const cached = useRef<UserData | null>(
    typeof window !== "undefined" ? readCachedUser() : null
  );

  const [user, setUser] = useState<UserData | null>(cached.current);
  const [loading, setLoading] = useState<boolean>(!cached.current);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ============ TOASTS ============ */
  const showToast = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, kind, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* =========================================================
     FETCH USER
     - success → cache + render
     - failure → silent wait → redirect to "/"
     - no error toasts, no messages, no flicker
  ========================================================= */
  useEffect(() => {
    let cancelled = false;

    const redirectHome = () => {
      clearCachedUser();
      redirectTimerRef.current = setTimeout(() => {
        if (!cancelled) router.replace("/");
      }, REDIRECT_DELAY_MS);
    };

    (async () => {
      try {
        const res = await apiClient.get(
          "/api/client/dashboard/details/account"
        );
        if (cancelled) return;

        // Success
        if (res.data?.success && res.data?.data?.user) {
          const freshUser: UserData = res.data.data.user;
          setUser(freshUser);
          writeCachedUser(freshUser);
          setLoading(false);
          return;
        }

        // 200 OK but flagged unauthenticated
        if (isUnauthorized(res.data)) {
          redirectHome();
          return;
        }

        // Unexpected shape → treat as failure
        redirectHome();
      } catch (err) {
        if (cancelled) return;

        // Any error — unauthorized, network, timeout — redirect silently
        if (isUnauthorized(err)) {
          redirectHome();
          return;
        }
        redirectHome();
      }
    })();

    return () => {
      cancelled = true;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [router]);

  /* ============ GSAP ENTRANCE ============ */
  useEffect(() => {
    if (loading || !user) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 30,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
        });
      }
      if (tabsRef.current) {
        gsap.from(tabsRef.current.children, {
          y: 16,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          delay: 0.3,
          ease: "power2.out",
        });
      }
    });

    return () => ctx.revert();
  }, [loading, user]);

  /* =========================================================
     BACKGROUND STACK
  ========================================================= */
  const BackgroundStack = (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src={BG_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={95}
          className="object-cover object-center"
        />

        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(
                180deg,
                rgba(15, 8, 5, 0.55) 0%,
                rgba(15, 8, 5, 0.35) 25%,
                rgba(15, 8, 5, 0.20) 50%,
                rgba(15, 8, 5, 0.40) 80%,
                rgba(15, 8, 5, 0.60) 100%
              )
            `,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 12% 8%, ${THEME.darkOrange}35, transparent 45%),
              radial-gradient(circle at 88% 92%, ${THEME.emeraldGreen}28, transparent 50%)
            `,
          }}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[1]">
        <ThreeBackground opacity={1} particleCount={200} zCamera={12} />
      </div>
    </>
  );

  /* =========================================================
     LOADING SKELETON
     Also serves as the "silent wait" screen before redirect
     when the user is not authenticated.
  ========================================================= */
  if (loading || !user) {
    return (
      <main
        className="relative min-h-screen overflow-hidden"
        style={{ backgroundColor: "#0F0805" }}
      >
        {BackgroundStack}

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 sm:px-6">
          <div className="h-20 w-full animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-6 h-12 w-72 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-8 h-96 w-full animate-pulse rounded-3xl bg-white/10" />
        </div>
      </main>
    );
  }

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "—";

  const initial = (user.firstname?.[0] || "U").toUpperCase();

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: "#0F0805" }}
    >
      {BackgroundStack}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        {/* ============ HEADER ============ */}
        <div
          ref={headerRef}
          className="mb-10 flex flex-col items-center text-center sm:mb-14"
        >
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
              aria-hidden="true"
            >
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <defs>
                  <linearGradient id="avatar-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop
                      offset="0%"
                      stopColor={THEME.orangeGlow}
                      stopOpacity="0.9"
                    />
                    <stop
                      offset="50%"
                      stopColor={THEME.orangeGlow}
                      stopOpacity="0.2"
                    />
                    <stop
                      offset="100%"
                      stopColor={THEME.emeraldGreen}
                      stopOpacity="0.9"
                    />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="url(#avatar-ring)"
                  strokeWidth="1.5"
                  strokeDasharray="6 8"
                />
              </svg>
            </motion.div>

            <div
              className="flex h-20 w-20 items-center justify-center rounded-full shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
                boxShadow: `0 12px 40px -8px ${THEME.orangeGlow}AA`,
                border: "2px solid rgba(255, 247, 244, 0.25)",
              }}
            >
              <span
                className="font-outfit text-3xl font-bold text-white"
                dir="ltr"
              >
                {initial}
              </span>
            </div>
          </div>

          <p
            className="font-outfit mb-2 text-xs font-semibold uppercase tracking-[0.3em]"
            style={{
              color: THEME.orangeGlow,
              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
            }}
            dir="ltr"
          >
            Account
          </p>

          <h1
            className="font-outfit text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl"
            style={{
              color: THEME.creamText,
              textShadow:
                "0 4px 24px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)",
            }}
            dir="ltr"
          >
            {user.firstname} {user.lastname}
          </h1>

          <p
            className="font-outfit mt-2 text-sm"
            style={{
              color: THEME.creamMuted,
              textShadow: "0 2px 10px rgba(0,0,0,0.6)",
            }}
            dir="ltr"
          >
            @{user.accountname} · Joined {joined}
          </p>

          <div
            className="mx-auto mt-5 h-[2px] w-20 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${THEME.orangeGlow}, transparent)`,
              boxShadow: `0 0 20px ${THEME.orangeGlow}AA`,
            }}
          />
        </div>

        {/* ============ TABS ============ */}
        <div
          ref={tabsRef}
          className="mb-8 flex flex-wrap items-center justify-center gap-2"
          role="tablist"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={isActive}
                className="font-urdu relative rounded-full px-5 py-2.5 text-base font-semibold transition-colors"
                style={{
                  color: isActive ? "#FFFFFF" : THEME.creamText,
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="settings-tab-bg"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full shadow-md"
                    style={{
                      background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
                      boxShadow: `0 12px 28px -12px ${THEME.orangeGlow}CC`,
                      border: "1px solid rgba(255, 247, 244, 0.2)",
                    }}
                  />
                )}
                {!isActive && (
                  <span
                    className="absolute inset-0 rounded-full border backdrop-blur-md"
                    style={{
                      borderColor: "rgba(255, 247, 244, 0.25)",
                      backgroundColor: "rgba(15, 8, 5, 0.45)",
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.labelUr}
                  <span
                    className="font-outfit text-[10px] uppercase tracking-widest opacity-70"
                    dir="ltr"
                  >
                    {tab.labelEn}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* ============ TAB CONTENT ============ */}
        <div
          className="rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
          style={{
            backgroundColor: "rgba(255, 252, 250, 0.9)",
            borderColor: "rgba(255, 247, 244, 0.4)",
            boxShadow: `
              0 32px 80px -24px rgba(0, 0, 0, 0.65),
              inset 0 1px 0 rgba(255, 255, 255, 0.6)
            `,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === "profile" && (
                <ProfileTab
                  user={user}
                  onUserUpdate={(u) => {
                    setUser(u);
                    writeCachedUser(u);
                  }}
                  showToast={showToast}
                />
              )}
              {activeTab === "security" && <SecurityTab showToast={showToast} />}
              {activeTab === "activity" && <ActivityTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}