// app/kulliyat/page.tsx

import type { Metadata } from "next";
import { Suspense } from "react";

import KulliyatClient from "@/components/client/layout/KulliyatClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "کلیات — The Complete Collection | Ru-e-Razab",

  description:
    "Explore the complete کلیات of Razab Tabraiz — a comprehensive collection of his ghazals, nazms, qatas, and selected Urdu poetry gathered in one literary archive.",

  keywords: [
    "کلیات",
    "Kulliyat",
    "Razab Tabraiz Kulliyat",
    "Razab Tabraiz poetry",
    "Razab poetry collection",
    "Urdu Kulliyat",
    "Urdu poetry",
    "Urdu Shayari",
    "Urdu literature",
    "Ghazal",
    "Ghazals",
    "Nazm",
    "Nazms",
    "Qata",
    "Qatas",
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
    canonical: "/kulliyat",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/kulliyat",
    siteName: "Ru-e-Razab",

    title: "کلیات — The Complete Collection | Ru-e-Razab",

    description:
      "Explore the complete collection of Razab Tabraiz's poetry — ghazals, nazms, qatas, and selected Urdu poetry gathered together in one place.",

    images: [
      {
        url: "/meta-kulliyat-banner.png",
        width: 1200,
        height: 630,
        alt: "کلیات — The Complete Collection | Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "کلیات — The Complete Collection | Ru-e-Razab",

    description:
      "Explore the complete poetry collection of Razab Tabraiz — ghazals, nazms, qatas, and more.",

    images: [
      {
        url: "/meta-kulliyat-banner.png",
        alt: "کلیات — The Complete Collection | Ru-e-Razab",
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

export default function KulliyatPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <KulliyatClient />
    </Suspense>
  );
}