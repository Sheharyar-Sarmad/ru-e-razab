import type { Metadata } from "next";

import HomeHero from "@/components/client/layout/HomeHero";
import StatsStrip from "@/components/client/layout/StatsStrip";
import KalamOfTheDay from "@/components/client/layout/KalamOfTheDay";
import FeaturedKalam from "@/components/client/layout/FeaturedKalam";
import TimelineSection from "@/components/client/layout/TimelineSection";
import AboutRazab from "@/components/client/layout/AboutRazab";
import ExploreKalam from "@/components/client/layout/ExploreKalam";
import AIAnalysisBanner from "@/components/client/layout/AIAnalysisBanner";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: {
    default: "Ru-e-Razab | The Poetry & Literary World of Razab Tabraiz",
    template: "%s | Ru-e-Razab",
  },

  description:
    "Explore the poetry, kalam, ghazals, quotes, literary journey, and timeless words of Razab Tabraiz. Discover Urdu literature, poetry, and an AI-powered Adbi Dost for deeper literary exploration.",

  keywords: [
    "Ru-e-Razab",
    "Razab Tabraiz",
    "Razab Tabraiz poetry",
    "Razab poetry",
    "Urdu poetry",
    "Urdu shayari",
    "Urdu ghazal",
    "Urdu kalam",
    "Kalam",
    "Ghazal",
    "Nazam",
    "Nazm",
    "Qata",
    "Urdu literature",
    "Urdu quotes",
    "Urdu adab",
    "Shayari",
    "Shayar",
    "poetry collection",
    "Adbi Dost",
    "AI poetry assistant",
    "Urdu literary assistant",
  ],

  authors: [
    {
      name: "Razab Tabraiz",
    },
  ],

  creator: "Ru-e-Razab",
  publisher: "Ru-e-Razab",

  applicationName: "Ru-e-Razab",

  category: "Literature",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Ru-e-Razab",
    title: "Ru-e-Razab | The Poetry & Literary World of Razab Tabraiz",
    description:
      "Explore the poetry, kalam, ghazals, literary journey, and timeless words of Razab Tabraiz. Discover Urdu literature and connect with the world of poetry through Ru-e-Razab.",
    images: [
      {
        url: "/meta-home-banner.png",
        width: 1200,
        height: 630,
        alt: "Ru-e-Razab — The poetry and literary world of Razab Tabraiz",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Ru-e-Razab | The Poetry & Literary World of Razab Tabraiz",
    description:
      "Explore Razab Tabraiz's poetry, kalam, ghazals, literary journey, and timeless Urdu literature.",
    images: [
      {
        url: "/meta-home-banner.png",
        alt: "Ru-e-Razab — The poetry and literary world of Razab Tabraiz",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  other: {
    "theme-color": "#0d2424",
  },
};

export default function Home() {
  return (
    <main>
      <HomeHero />
      <StatsStrip />
      <KalamOfTheDay />
      <FeaturedKalam />
      <TimelineSection />
      <AboutRazab />
      <ExploreKalam />
      <AIAnalysisBanner />
    </main>
  );
}