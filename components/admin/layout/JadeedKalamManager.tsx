// components/admin/layout/JadeedKalamManager.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  SparklesIcon,
  BookOpenIcon,
  PencilSquareIcon,
  MusicalNoteIcon,
  DocumentTextIcon,
  ClockIcon,
  AcademicCapIcon,
  RocketLaunchIcon, // Added for the scroll-to-top button
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";
import GhazalForm from "../models/GhazalForm";
import NazmForm from "../models/NazmForm";
import QataForm from "../models/QataForm";
import ShairForm from "../models/ShairForm";
import axios from "axios";

type ModalType = "ghazal" | "nazm" | "qata" | "shair" | null;

// Types for API response
interface StatsData {
  totalGhazal: number;
  totalNazm: number;
  totalQata: number;
  totalShair: number;
  totalKalam: number;
}

export default function JadeedKalamManager() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => setActiveModal(null);

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get("/api/admin/dashboard/app/info", {
          withCredentials: true,
        });

        if (response.data.success) {
          const d = response.data.data;
          // Map the response to our StatsData shape
          const mapped: StatsData = {
            totalGhazal: d.poetry?.breakdown?.ghazals ?? 0,
            totalNazm: d.poetry?.breakdown?.nazms ?? 0,
            totalQata: d.poetry?.breakdown?.qatas ?? 0,
            totalShair: d.poetry?.breakdown?.shairs ?? 0,
            totalKalam: d.poetry?.total ?? 0,
          };
          setStats(mapped);
        } else {
          setError(response.data.message || "Failed to load statistics");
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || "Network error";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Stat cards configuration
  const statCards = [
    {
      label: "کل کلام",
      value: stats?.totalKalam ?? 0,
      icon: <DocumentTextIcon className="w-5 h-5" />,
      color: COLORS.deepForest,
    },
    {
      label: "غزلیں",
      value: stats?.totalGhazal ?? 0,
      icon: <SparklesIcon className="w-5 h-5" />,
      color: COLORS.softAmethyst,
    },
    {
      label: "نظمیں",
      value: stats?.totalNazm ?? 0,
      icon: <BookOpenIcon className="w-5 h-5" />,
      color: COLORS.tataBlue,
    },
    {
      label: "قطعات",
      value: stats?.totalQata ?? 0,
      icon: <PencilSquareIcon className="w-5 h-5" />,
      color: COLORS.richMustard,
    },
    {
      label: "اشعار",
      value: stats?.totalShair ?? 0,
      icon: <MusicalNoteIcon className="w-5 h-5" />,
      color: COLORS.burntRust,
    },
  ];

  const cards = [
    {
      type: "ghazal" as const,
      label: "Ghazal",
      icon: <SparklesIcon className="w-8 h-8" />,
      description: "ایک غزل (1-10 اشعار)",
      color: COLORS.softAmethyst,
    },
    {
      type: "nazm" as const,
      label: "Nazm",
      icon: <BookOpenIcon className="w-8 h-8" />,
      description: "ایک نظم (1-6 بند، ہر بند میں 2 اشعار)",
      color: COLORS.tataBlue,
    },
    {
      type: "qata" as const,
      label: "Qata",
      icon: <PencilSquareIcon className="w-8 h-8" />,
      description: "ایک قطعہ (بالکل 2 اشعار)",
      color: COLORS.richMustard,
    },
    {
      type: "shair" as const,
      label: "Shair",
      icon: <MusicalNoteIcon className="w-8 h-8" />,
      description: "ایک شعر (بالکل 2 مصرعے)",
      color: COLORS.burntRust,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto font-urdu" dir="rtl">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-3xl md:text-4xl my-8 mb-12 font-bold"
              style={{ color: COLORS.deepForest }}
            >
              نیا کلام تخلیق کریں
            </h1>
            <p
              className="mt-1 text-lg"
              style={{ color: `${COLORS.deepForest}CC` }}
            >
              منتخب کریں کہ آپ کس قسم کا کلام شامل کرنا چاہتے ہیں
            </p>
          </div>
          <div
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: `${COLORS.deepForest}10`,
              border: `1px solid ${COLORS.deepForest}20`,
            }}
          >
            <ClockIcon className="w-5 h-5" style={{ color: COLORS.deepForest }} />
            <span className="text-sm" style={{ color: COLORS.deepForest }}>
              {new Date().toLocaleDateString("ur-PK", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        <div
          className="mt-2 h-0.5 w-24 rounded-full"
          style={{ background: `linear-gradient(90deg, ${COLORS.softAmethyst}, ${COLORS.tataBlue})` }}
        />
      </motion.div>

      {/* Stats Bar with Loading / Error */}
      <div className="mb-8">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: COLORS.deepForest, borderTopColor: "transparent" }}
            />
          </div>
        ) : error ? (
          <div
            className="p-4 rounded-xl text-center"
            style={{ background: `${COLORS.burntRust}10`, border: `1px solid ${COLORS.burntRust}30` }}
          >
            <p className="text-sm" style={{ color: COLORS.burntRust }}>
              {error}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            {statCards.map((stat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  background: `${stat.color}08`,
                  borderColor: `${stat.color}20`,
                }}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.deepForest }}>
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Quick Actions Label */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.deepForest }}>
          تخلیق کا عمل شروع کریں
        </h2>
        <div
          className="flex-1 h-px"
          style={{ background: `linear-gradient(90deg, ${COLORS.deepForest}30, transparent)` }}
        />
        <AcademicCapIcon className="w-5 h-5" style={{ color: `${COLORS.deepForest}50` }} />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <motion.button
            key={card.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setActiveModal(card.type)}
            className="group relative rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              background: `linear-gradient(145deg, ${card.color}15, ${card.color}05)`,
              border: `1px solid ${card.color}30`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"
              style={{ background: `radial-gradient(circle at 30% 30%, ${card.color}, transparent)` }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex p-3 rounded-xl mb-4"
                style={{ background: `${card.color}25` }}
              >
                {card.icon}
              </div>
              <h3
                className="text-xl font-semibold font-outfit"
                style={{ color: card.color }}
              >
                {card.label}
              </h3>
              <p
                className="mt-1 text-sm"
                style={{ color: `${COLORS.deepForest}CC` }}
              >
                {card.description}
              </p>
              <div
                className="mt-4 text-sm font-medium flex items-center gap-1"
                style={{ color: card.color }}
              >
                تخلیق کریں
                <span className="group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Modals */}
      <GhazalForm isOpen={activeModal === "ghazal"} onClose={closeModal} />
      <NazmForm isOpen={activeModal === "nazm"} onClose={closeModal} />
      <QataForm isOpen={activeModal === "qata"} onClose={closeModal} />
      <ShairForm isOpen={activeModal === "shair"} onClose={closeModal} />

      {/* EXACT SCROLL-TO-TOP FAB FROM DASHBOARD FILE    */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1, rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl text-white shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
          boxShadow: `0 8px 32px ${COLORS.burntRust}66`,
        }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <RocketLaunchIcon className="w-6 h-6" />
      </motion.button>
    </div>
  );
}