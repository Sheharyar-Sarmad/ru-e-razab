// app/shairs/page.tsx

import type { Metadata } from "next";
import { Suspense } from "react";

import ShairsClient from "@/components/client/layout/ShairsClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "اشعار — Ashaar | Ru-e-Razab",

  description:
    "Explore the finest اشعار and selected couplets by Razab Tabraiz — timeless Urdu verses that capture emotions, thoughts, and moments in just a few lines.",

  keywords: [
    "اشعار",
    "Ashaar",
    "Shair",
    "Sher",
    "شعر",
    "شاعری",
    "Urdu Ashaar",
    "Urdu poetry",
    "Urdu couplets",
    "Urdu Shayari",
    "Razab Tabraiz",
    "Razab Tabraiz Ashaar",
    "Razab poetry",
    "Ru-e-Razab",
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
    canonical: "/shairs",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/shairs",
    siteName: "Ru-e-Razab",

    title: "اشعار — Ashaar | Ru-e-Razab",

    description:
      "Explore selected اشعار and timeless Urdu couplets by Razab Tabraiz. Discover poetry that captures an entire emotion in just a few lines.",

    images: [
      {
        url: "/meta-shair-banner.png",
        width: 1200,
        height: 630,
        alt: "اشعار — Ashaar | Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "اشعار — Ashaar | Ru-e-Razab",

    description:
      "Explore selected Urdu couplets and اشعار by Razab Tabraiz.",

    images: [
      {
        url: "/meta-shair-banner.png",
        alt: "اشعار — Ashaar | Ru-e-Razab",
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

function Fallback() {
  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#FFF7F4" }}
    >
      <p className="font-urdu text-xl" style={{ color: "#76584F" }}>
        لوڈ ہو رہا ہے…
      </p>
    </main>
  );
}

export default function ShairsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ShairsClient />
    </Suspense>
  );
}