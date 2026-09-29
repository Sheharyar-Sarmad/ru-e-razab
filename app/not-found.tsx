// app/not-found.tsx

import { headers } from "next/headers";
import type { Metadata } from "next";

import NotFoundClient from "@/components/shared/NotFoundClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "404 - Page Not Found | Ru-e-Razab",

  description:
    "The page you are looking for could not be found. Return to Ru-e-Razab and continue exploring poetry, kalam, ghazals, nazam, and Urdu literature.",

  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
    },
  },

  alternates: {
    canonical: "/404",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/404",
    siteName: "Ru-e-Razab",
    title: "404 - Page Not Found | Ru-e-Razab",
    description:
      "The page you are looking for could not be found. Return to Ru-e-Razab and continue exploring poetry, kalam, ghazals, nazam, and Urdu literature.",
    images: [
      {
        url: "/meta-404-banner.png",
        width: 1200,
        height: 630,
        alt: "404 — Page Not Found | Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "404 - Page Not Found | Ru-e-Razab",
    description:
      "The page you are looking for could not be found. Return to Ru-e-Razab and continue exploring Urdu poetry and literature.",
    images: [
      {
        url: "/meta-404-banner.png",
        alt: "404 — Page Not Found | Ru-e-Razab",
      },
    ],
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

export default async function NotFound() {
  // Get the page the user came from
  const headersList = await headers();
  const referer = headersList.get("referer") || "";

  // Detect whether the user came from the admin dashboard
  const isAdminRoute = referer.includes("/admin/dashboard");

  return <NotFoundClient isAdminRoute={isAdminRoute} />;
}