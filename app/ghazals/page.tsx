// app/ghazals/page.tsx

import type { Metadata } from "next";
import { Suspense } from "react";

import GhazalsClient from "@/components/client/layout/GhazalsClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "غزلیں — Ghazals | Ru-e-Razab",

  description:
    "Explore the complete collection of غزلیں by Razab Tabraiz — Urdu poetry of love, longing, reflection, and the many emotions of the heart.",

  keywords: [
    "غزلیں",
    "غزل",
    "Ghazals",
    "Ghazal",
    "Urdu Ghazal",
    "Urdu Ghazals",
    "Urdu poetry",
    "Urdu Shayari",
    "Urdu literature",
    "Razab Tabraiz",
    "Razab Tabraiz Ghazals",
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
    canonical: "/ghazals",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/ghazals",
    siteName: "Ru-e-Razab",

    title: "غزلیں — Ghazals | Ru-e-Razab",

    description:
      "Explore the complete collection of ghazals by Razab Tabraiz — Urdu poetry filled with love, longing, reflection, and emotion.",

    images: [
      {
        url: "/meta-ghazal-banner.png",
        width: 1200,
        height: 630,
        alt: "غزلیں — Ghazals | Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "غزلیں — Ghazals | Ru-e-Razab",

    description:
      "Explore the complete collection of Urdu ghazals by Razab Tabraiz.",

    images: [
      {
        url: "/meta-ghazal-banner.png",
        alt: "غزلیں — Ghazals | Ru-e-Razab",
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

export default function GhazalsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <GhazalsClient />
    </Suspense>
  );
}