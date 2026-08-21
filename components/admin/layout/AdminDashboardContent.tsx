// components/admin/layout/AdminDashboardContent.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  UsersIcon,
  UserGroupIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CalendarDaysIcon,
  FireIcon,
  ChartBarIcon,
  MusicalNoteIcon,
  PlusCircleIcon,
  RocketLaunchIcon,
  StarIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SignalIcon,
  BoltIcon,
  CursorArrowRaysIcon,
  ArrowPathIcon,
  HandRaisedIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  UsersIcon as UsersIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  SparklesIcon as SparklesIconSolid,
  CheckBadgeIcon as CheckBadgeIconSolid,
} from "@heroicons/react/24/solid";

import { COLORS } from "@/lib/colors";

// PALETTE (sourced from lib/colors.ts)
const PALETTE = {
  shell: COLORS.warmWhite,
  forest: COLORS.deepForest,
  rust: COLORS.burntRust,
  mustard: COLORS.richMustard,
  lime: COLORS.electricLime,
  amethyst: COLORS.softAmethyst,
  tataBlue: COLORS.tataBlue,
  pink: COLORS.pinkRed,
  purple: COLORS.purple,
  orange: COLORS.orange,
  gold: COLORS.yellowGold,
  darkBlue: COLORS.darkBlue,
  dustyRose: COLORS.dustyRose,
};

const CATEGORY_COLORS = [
  PALETTE.rust,
  PALETTE.mustard,
  PALETTE.amethyst,
  PALETTE.tataBlue,
  PALETTE.pink,
  PALETTE.purple,
  PALETTE.orange,
  PALETTE.gold,
  PALETTE.darkBlue,
  PALETTE.dustyRose,
];

// TYPES
interface RecentPoem {
  _id: string;
  takhallus: string;
  slug: string;
  metaTitle?: string;
  createdAt: string;
}

interface StatsData {
  success: boolean;
  message: string;
  data: {
    users: {
      total: number;
      active: number;
      admins: number;
      newThisWeek: number;
    };
    poetry: {
      total: number;
      newThisWeek: number;
      breakdown: {
        ghazals: number;
        shairs: number;
        qatas: number;
        nazms: number;
      };
    };
    categories: Array<{ name: string; count: number }>;
    weeklyActivity: Array<{ day: string; count: number }>;
    recent: {
      ghazals: RecentPoem[];
      shairs: RecentPoem[];
      qatas: RecentPoem[];
      nazms: RecentPoem[];
    };
    meta: {
      responseTime: string;
      timestamp: string;
    };
  };
  err: string | null;
  status: number;
}

// HELPERS

// MOTION VARIANTS (single source of truth — no GSAP fighting Framer)
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.05, duration: 0.45, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const scrollReveal = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const scrollRevealLeft = {
  hidden: { opacity: 0, x: -40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const scrollRevealRight = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const viewportOnce = { once: true, margin: "-80px" };

// LOADING SKELETON
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 bg-gray-200 rounded-3xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-72 bg-gray-200 rounded-2xl" />
      ))}
    </div>
    <div className="h-80 bg-gray-200 rounded-2xl" />
  </div>
);

// BACKGROUND PARTICLES
const BackgroundParticles = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.15 + 0.05,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: PALETTE.lime,
          }}
          initial={{ opacity: p.opacity }}
          animate={{
            y: [0, -100, 0],
            x: [0, 50, 0],
            opacity: [p.opacity, p.opacity * 0.5, p.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

// STAT CARD
const StatCard = ({
  title,
  value,
  icon: Icon,
  iconSolid: IconSolid,
  color,
  subtitle,
  trend,
  index,
  badge,
}: {
  title: string;
  value: number | string;
  icon: any;
  iconSolid?: any;
  color: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  index: number;
  badge?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.03, y: -6 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl p-6 shadow-lg backdrop-blur-sm border"
      style={{
        background: `linear-gradient(135deg, ${PALETTE.shell}, #fff)`,
        borderColor: isHovered ? `${color}50` : "rgba(229,231,235,0.8)",
        boxShadow: isHovered
          ? `0 20px 40px -12px ${color}35, 0 0 0 1px ${color}20`
          : "0 10px 25px -12px rgba(0,0,0,0.08)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* glow blob */}
      <motion.div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none blur-2xl"
        animate={{ opacity: isHovered ? 0.35 : 0.12, scale: isHovered ? 1.15 : 1 }}
        transition={{ duration: 0.4 }}
        style={{ background: color }}
      />
      {/* shine sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ x: "-120%" }}
        animate={{ x: isHovered ? "120%" : "-120%" }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        style={{
          background: `linear-gradient(75deg, transparent 40%, ${color}18 50%, transparent 60%)`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 flex items-center gap-2">
              {title}
              {badge && (
                <span
                  className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-full"
                  style={{ background: `${PALETTE.lime}25`, color: PALETTE.forest }}
                >
                  {badge}
                </span>
              )}
            </p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <PlusCircleIcon className="w-3 h-3" />
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-0.5">
                {trend.value > 0 ? (
                  <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />
                ) : (
                  <ArrowTrendingDownIcon className="w-3 h-3 text-red-500" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    trend.value > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-gray-400">{trend.label}</span>
              </div>
            )}
          </div>
          <motion.div
            className="rounded-2xl p-3 flex-shrink-0"
            animate={{ rotate: isHovered ? -8 : 0, scale: isHovered ? 1.1 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            style={{ backgroundColor: `${color}18` }}
          >
            {IconSolid ? (
              <IconSolid className="w-6 h-6" style={{ color }} />
            ) : (
              <Icon className="w-6 h-6" style={{ color }} />
            )}
          </motion.div>
        </div>
        <div
          className="absolute bottom-0 left-0 h-0.5"
          style={{
            width: "100%",
            background: `linear-gradient(90deg, ${color}, ${color}60)`,
            opacity: isHovered ? 0.7 : 0.3,
            transition: "opacity 0.3s",
          }}
        />
      </div>
    </motion.div>
  );
};

// RECENT ITEM
const RecentItem = ({
  item,
  type,
  index,
  color,
  icon: Icon,
}: {
  item: RecentPoem;
  type: string;
  index: number;
  color: string;
  icon: any;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!item || typeof item !== "object") return null;

  const displayName = item.metaTitle || item.takhallus || "Untitled";
  const poetName = item.takhallus || "Unknown";
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A";
  const slug = item.slug;
  const href = slug ? `/admin/dashboard/kalam/${type.toLowerCase()}/${slug}` : "#";

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.01, x: 4 }}
    >
      <Link
        href={href}
        className="relative group flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer"
        style={{
          background: isHovered ? `${color}10` : "transparent",
          border: isHovered ? `1px solid ${color}30` : "1px solid transparent",
          textDecoration: "none",
        }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}
        >
          {poetName[0]?.toUpperCase() || "R"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1.5">
            {displayName.length > 30 ? displayName.substring(0, 30) + "…" : displayName}
            <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />
          </p>
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
            <span className="capitalize font-medium">{type}</span>
            <span>•</span>
            <span className="truncate max-w-[60px]">{poetName}</span>
            <span>•</span>
            <ClockIcon className="w-2.5 h-2.5 flex-shrink-0" />
            <span>{date}</span>
          </div>
        </div>
        {isHovered && <CursorArrowRaysIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />}
      </Link>
    </motion.div>
  );
};

// CUSTOM TOOLTIP FOR CHARTS
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-xl px-3 py-2 border border-gray-100 text-xs">
      {label && <p className="font-semibold text-gray-700 mb-0.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.payload?.fill }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// MAIN COMPONENT

export default function DashboardContent() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("/api/admin/dashboard/app/info", {
          withCredentials: true,
        });
        if (response.data.success) {
          setStats(response.data);
        } else {
          setError(response.data.message || "Failed to fetch stats");
        }
      } catch (err: any) {
        setError(err.message || "Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const newUsersCount = useMemo(() => {
    if (!stats) return 0;
    return stats.data.users.newThisWeek || 0;
  }, [stats]);

  const poetryBreakdownChartData = useMemo(() => {
    if (!stats) return [];
    const b = stats.data.poetry?.breakdown;
    return [
      { name: "Ghazals", value: b?.ghazals || 0, color: PALETTE.rust },
      { name: "Shairs", value: b?.shairs || 0, color: PALETTE.tataBlue },
      { name: "Qatas", value: b?.qatas || 0, color: PALETTE.amethyst },
      { name: "Nazms", value: b?.nazms || 0, color: PALETTE.mustard },
    ];
  }, [stats]);

  const categoryChartData = useMemo(() => {
    if (!stats) return [];
    return (stats.data.categories || []).slice(0, 8).map((c, i) => ({
      name: c.name,
      count: c.count,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [stats]);

  const weeklyActivityData = useMemo(() => {
    if (!stats) return [];
    return stats.data.weeklyActivity || [];
  }, [stats]);

  // NEW 4TH CHART: User Distribution (Admins vs Regular Users)
  const userDistributionData = useMemo(() => {
    if (!stats) return [];
    const total = stats.data.users.total;
    const admins = stats.data.users.admins;
    // In case of a single admin setup, ensure total is at least 1 to show data
    const regularUsers = Math.max(0, total - admins);
    
    return [
      { name: "Admins", value: admins, color: PALETTE.rust },
      { name: "Regular Users", value: regularUsers, color: PALETTE.tataBlue },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-[60vh] px-4 py-6">
        <div className="text-center text-sm text-gray-500 mb-4">⏳ Loading dashboard…</div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8 bg-gradient-to-br from-red-50 to-red-100/50 rounded-3xl border border-red-200 max-w-md w-full"
        >
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-red-500" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:shadow-lg transition-all text-sm inline-flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-500">
        <CloudIcon className="w-12 h-12 mx-auto text-gray-300" />
        <p>No data received.</p>
      </div>
    );
  }

  const { data } = stats;
  const totalPoetry = data.poetry?.total || 0;
  const categories = data.categories || [];
  const recentGhazals = data.recent?.ghazals || [];
  const recentShairs = data.recent?.shairs || [];
  const recentQatas = data.recent?.qatas || [];
  const recentNazms = data.recent?.nazms || [];

  return (
    <div className="relative">
      <BackgroundParticles />
      <motion.div
        className="space-y-6 md:space-y-8 pb-20 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 lg:p-10 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.forest}, ${PALETTE.forest}, #1d3328)`,
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl animate-spin-slow" />
            <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl animate-spin-slow-reverse" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="pl-14 sm:pl-16 lg:pl-0">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white flex items-center gap-3">
                <span>Welcome Back!</span>
                <motion.span
                  animate={{ rotate: [0, 15, -10, 15, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2 }}
                >
                  <HandRaisedIcon className="w-8 h-8 md:w-10 md:h-10" style={{ color: PALETTE.gold }} />
                </motion.span>
              </h1>
              <p className="text-emerald-100/90 text-sm md:text-base mt-2 flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4" />
                {currentTime}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: PALETTE.lime }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: PALETTE.lime }}
                  />
                </span>
                <span className="text-xs text-white font-medium">Live</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                <ClockIcon className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/80">{data.meta?.responseTime || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                <SignalIcon className="w-4 h-4 text-white/80" />
                <span className="text-xs text-white/80">Strong</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6"
        >
          <StatCard
            index={0}
            title="Total Users"
            value={data.users?.total?.toLocaleString() || 0}
            icon={UsersIcon}
            iconSolid={UsersIconSolid}
            color={PALETTE.rust}
            subtitle={`${newUsersCount} new this week`}
            trend={{ value: 12, label: "vs last month" }}
            badge="Active"
          />
          <StatCard
            index={1}
            title="Active Users"
            value={data.users?.active?.toLocaleString() || 0}
            icon={UserGroupIcon}
            iconSolid={UserGroupIconSolid}
            color={PALETTE.tataBlue}
            subtitle={`${
              data.users?.total > 0 ? Math.round((data.users.active / data.users.total) * 100) : 0
            }% engagement`}
          />
          <StatCard
            index={2}
            title="Total Poetry"
            value={totalPoetry?.toLocaleString() || 0}
            icon={BookOpenIcon}
            iconSolid={BookOpenIconSolid}
            color={PALETTE.mustard}
            subtitle={`${data.poetry?.newThisWeek || 0} new this week`}
            trend={{ value: 8, label: "vs last week" }}
            badge="Popular"
          />
          <StatCard
            index={3}
            title="Admins"
            value={data.users?.admins?.toLocaleString() || 0}
            icon={ShieldCheckIcon}
            iconSolid={CheckBadgeIconSolid}
            color={PALETTE.amethyst}
            subtitle="Active administrators"
          />
        </motion.div>

        {/* Poetry Breakdown quick cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: "Ghazals", count: data.poetry?.breakdown?.ghazals || 0, color: PALETTE.rust, icon: MusicalNoteIcon },
            { label: "Shairs", count: data.poetry?.breakdown?.shairs || 0, color: PALETTE.tataBlue, icon: PencilSquareIcon },
            { label: "Qatas", count: data.poetry?.breakdown?.qatas || 0, color: PALETTE.amethyst, icon: DocumentTextIcon },
            { label: "Nazms", count: data.poetry?.breakdown?.nazms || 0, color: PALETTE.mustard, icon: BookOpenIcon },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              custom={idx}
              whileHover={{ scale: 1.06, y: -6, rotate: idx % 2 === 0 ? -1 : 1 }}
              whileTap={{ scale: 0.97 }}
              className="relative overflow-hidden p-4 rounded-2xl border shadow-md hover:shadow-xl transition-shadow cursor-default group"
              style={{
                background: `linear-gradient(135deg, ${item.color}12, ${item.color}05)`,
                borderColor: `${item.color}30`,
              }}
            >
              <motion.div
                className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                style={{ background: item.color }}
              />
              <div className="relative flex items-center justify-between">
                <span className="text-xs md:text-sm font-semibold" style={{ color: item.color }}>
                  {item.label}
                </span>
                <motion.div whileHover={{ rotate: 15, scale: 1.2 }} transition={{ type: "spring", stiffness: 300 }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </motion.div>
              </div>
              <motion.p
                className="relative text-2xl md:text-3xl font-bold mt-1"
                style={{ color: item.color }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + idx * 0.08, type: "spring", stiffness: 200 }}
              >
                {item.count}
              </motion.p>
              <div
                className="relative w-full h-0.5 mt-2 rounded-full overflow-hidden"
                style={{ background: `${item.color}20` }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}80)` }}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.2 + idx * 0.08, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row - UPDATED TO 2X2 GRID WITH 4 REAL CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Poetry Breakdown Pie Chart */}
          <motion.div
            variants={scrollRevealLeft}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100/80 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <ChartBarIcon className="w-5 h-5" style={{ color: PALETTE.rust }} />
              Poetry Breakdown
            </h3>
            {totalPoetry > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={poetryBreakdownChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      animationDuration={800}
                    >
                      {poetryBreakdownChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 -mt-2">
                  {poetryBreakdownChartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No poetry data yet</p>
            )}
          </motion.div>

          {/* 2. Category Distribution Bar Chart */}
          <motion.div
            variants={scrollRevealRight}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100/80 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5" style={{ color: PALETTE.tataBlue }} />
                Category Distribution
              </h3>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: `${PALETTE.forest}15`, color: PALETTE.forest }}
              >
                Top {Math.min(categories.length, 8)}
              </span>
            </div>
            {categoryChartData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={35} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#00000005" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={700}>
                      {categoryChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No categories found</p>
            )}
          </motion.div>

          {/* 3. Weekly Activity Bar Chart */}
          <motion.div
            variants={scrollRevealLeft}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100/80 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5" style={{ color: PALETTE.orange }} />
                Weekly Activity
              </h3>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: `${PALETTE.orange}15`, color: PALETTE.orange }}
              >
                Last 7 days
              </span>
            </div>

            {weeklyActivityData.some(day => day.count > 0) ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 11, fill: '#6b7280' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6b7280' }} 
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#00000005" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={700}>
                      {weeklyActivityData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-12">
                No new poetry added in the last 7 days
              </p>
            )}
          </motion.div>

          {/* 4. User Distribution Chart (NEW) */}
          <motion.div
            variants={scrollRevealRight}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100/80 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5" style={{ color: PALETTE.amethyst }} />
                User Distribution
              </h3>
            </div>

            {userDistributionData.some(item => item.value > 0) ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={75}
                      paddingAngle={3}
                      animationDuration={800}
                    >
                      {userDistributionData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 -mt-2">
                  {userDistributionData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-12">
                No user data available
              </p>
            )}
          </motion.div>
        </div>

        {/* Recent Additions */}
        <motion.div
          variants={scrollReveal}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-100/80 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FireIcon className="w-5 h-5" style={{ color: PALETTE.orange }} />
              Recent Additions
              <BoltIcon className="w-4 h-4" style={{ color: PALETTE.mustard }} />
            </h3>
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: `${PALETTE.orange}15`, color: PALETTE.orange }}
            >
              Latest 5 each
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Ghazals", type: "ghazal", items: recentGhazals, color: PALETTE.rust, icon: HeartIcon, headerIcon: SparklesIconSolid },
              { label: "Shairs", type: "shair", items: recentShairs, color: PALETTE.tataBlue, icon: ChatBubbleLeftRightIcon, headerIcon: PencilSquareIcon },
              { label: "Qatas", type: "qata", items: recentQatas, color: PALETTE.amethyst, icon: EyeIcon, headerIcon: DocumentTextIcon },
              { label: "Nazms", type: "nazm", items: recentNazms, color: PALETTE.mustard, icon: StarIcon, headerIcon: BookOpenIconSolid },
            ].map((section) => (
              <div
                key={section.label}
                className="p-3 rounded-xl border"
                style={{
                  background: `linear-gradient(135deg, ${section.color}0d, ${section.color}05)`,
                  borderColor: `${section.color}30`,
                }}
              >
                <h4
                  className="text-xs md:text-sm font-medium mb-2 flex items-center gap-2"
                  style={{ color: section.color }}
                >
                  <section.headerIcon className="w-4 h-4" />
                  {section.label}
                  <span className="ml-auto text-xs text-gray-400">{section.items.length} items</span>
                </h4>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-1 max-h-[220px] overflow-y-auto custom-scrollbar"
                >
                  <AnimatePresence>
                    {section.items.length > 0 ? (
                      section.items.map((item, idx) => (
                        <RecentItem
                          key={item._id || item.slug || idx}
                          item={item}
                          type={section.type}
                          index={idx}
                          color={section.color}
                          icon={section.icon}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No {section.label.toLowerCase()} found
                      </p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Stats */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Total Users", value: data.users?.total || 0, icon: UsersIcon, color: PALETTE.rust },
            { label: "Active Users", value: data.users?.active || 0, icon: UserGroupIcon, color: PALETTE.tataBlue },
            { label: "Total Poetry", value: data.poetry?.total || 0, icon: BookOpenIcon, color: PALETTE.mustard },
            { label: "Categories", value: data.categories?.length || 0, icon: ChartBarIcon, color: PALETTE.amethyst },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              custom={idx}
              whileHover={{ scale: 1.04, y: -4 }}
              className="rounded-xl p-4 shadow-md border border-gray-100/80 text-center hover:shadow-xl transition-shadow cursor-pointer"
              style={{ background: `linear-gradient(135deg, ${item.color}10, ${item.color}05)` }}
            >
              <item.icon className="w-5 h-5 mx-auto mb-1" style={{ color: item.color }} />
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-xl font-bold text-gray-900">{item.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Floating Action Button */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl text-white shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.rust}, ${PALETTE.mustard})`,
            boxShadow: `0 8px 32px ${PALETTE.rust}66`,
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <RocketLaunchIcon className="w-6 h-6" />
        </motion.button>
      </motion.div>

      {/* Custom Styles (global, not scoped, so scrollbar classes apply everywhere used) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${PALETTE.rust}40;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${PALETTE.rust}60;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${PALETTE.rust}40 transparent;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 60s linear infinite;
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 80s linear infinite;
        }
      `}</style>
    </div>
  );
}