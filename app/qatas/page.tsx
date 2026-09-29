// app/qatas/page.tsx

import type { Metadata } from "next";
import { Suspense } from "react";

import QatasClient from "@/components/client/layout/QatasClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "قطعات — Qatas | Ru-e-Razab",

  description:
    "Explore the collection of قطعات by Razab Tabraiz — thoughtful Urdu quatrains filled with meaning, emotion, reflection, and literary depth.",

  keywords: [
    "قطعات",
    "Qatas",
    "Qata",
    "قطعة",
    "Urdu Qatas",
    "Urdu poetry",
    "Urdu quatrains",
    "Urdu Shayari",
    "Urdu literature",
    "Razab Tabraiz",
    "Razab Tabraiz Qatas",
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
    canonical: "/qatas",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/qatas",
    siteName: "Ru-e-Razab",

    title: "قطعات — Qatas | Ru-e-Razab",

    description:
      "Explore thoughtful قطعات by Razab Tabraiz — Urdu quatrains filled with meaning, emotion, reflection, and literary depth.",

    images: [
      {
        url: "/meta-qata-banner.png",
        width: 1200,
        height: 630,
        alt: "قطعات — Qatas | Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "قطعات — Qatas | Ru-e-Razab",

    description:
      "Explore the collection of Urdu قطعات by Razab Tabraiz.",

    images: [
      {
        url: "/meta-qata-banner.png",
        alt: "قطعات — Qatas | Ru-e-Razab",
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

export default function QatasPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <QatasClient />
    </Suspense>
  );
}