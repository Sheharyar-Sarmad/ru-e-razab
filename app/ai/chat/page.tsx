// app/ai/chat/page.tsx

import type { Metadata } from "next";

import AIChatClient from "@/components/client/layout/AIChatClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "RAZAB AI — ادبی دوست | Ru-e-Razab",

  description:
    "RAZAB AI — ادبی دوست سے Razab Tabraiz ki ghazlon, shairon, nazmon, qaton aur Urdu adab ke baare mein baat karein. Likhein, sawal karein, aur apni literary journey ko explore karein.",

  keywords: [
    "RAZAB AI",
    "ادبی دوست",
    "Adbi Dost",
    "Ru-e-Razab AI",
    "Razab AI",
    "Razab Tabraiz",
    "Razab Tabraiz poetry",
    "Urdu AI",
    "Urdu poetry AI",
    "Urdu literary assistant",
    "AI poetry assistant",
    "Urdu literature",
    "Urdu adab",
    "Ghazal",
    "Ghazals",
    "Shair",
    "Ashaar",
    "Nazm",
    "Nazms",
    "Qata",
    "Qatas",
    "Kalam",
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
    canonical: "/ai/chat",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/ai/chat",
    siteName: "Ru-e-Razab",

    title: "RAZAB AI — ادبی دوست | Ru-e-Razab",

    description:
      "Meet ادبی دوست — the AI literary assistant for exploring Razab Tabraiz's ghazals, shairs, nazms, qatas, kalam, and Urdu literature.",

    images: [
      {
        url: "/meta-adbi-dost-banner.png",
        width: 1200,
        height: 630,
        alt: "RAZAB AI — ادبی دوست | Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "RAZAB AI — ادبی دوست | Ru-e-Razab",

    description:
      "Talk with ادبی دوست about Razab Tabraiz's ghazals, shairs, nazms, qatas, kalam, and Urdu literature.",

    images: [
      {
        url: "/meta-adbi-dost-banner.png",
        alt: "RAZAB AI — ادبی دوست | Ru-e-Razab",
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

export default function AIChatPage() {
  return <AIChatClient />;
}