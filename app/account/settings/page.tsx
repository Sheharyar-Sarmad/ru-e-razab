// app/account/settings/page.tsx

import type { Metadata } from "next";

import SettingsClient from "@/components/client/layout/SettingsClient";
import EnvSecrets from "@/config/env.secrets";

export const metadata: Metadata = {
  metadataBase: EnvSecrets.appUrl,

  title: "Account Settings — Ru-e-Razab",

  description:
    "Manage your profile, account security, preferences, and activity on Ru-e-Razab — your literary space for Urdu poetry and adab.",

  keywords: [
    "Ru-e-Razab account",
    "Ru-e-Razab settings",
    "Account Settings",
    "Profile Settings",
    "Account Security",
    "User Settings",
    "Urdu poetry",
    "Urdu literature",
    "Razab Tabraiz",
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
    canonical: "/account/settings",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/account/settings",
    siteName: "Ru-e-Razab",

    title: "Account Settings — Ru-e-Razab",

    description:
      "Manage your profile, account security, preferences, and activity on Ru-e-Razab.",

    images: [
      {
        url: "/meta-account-banner.png",
        width: 1200,
        height: 630,
        alt: "Account Settings — Ru-e-Razab",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "Account Settings — Ru-e-Razab",

    description:
      "Manage your profile, account security, preferences, and activity on Ru-e-Razab.",

    images: [
      {
        url: "/meta-account-banner.png",
        alt: "Account Settings — Ru-e-Razab",
      },
    ],
  },

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

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  other: {
    "theme-color": "#0d2424",
  },
};

export default function SettingsPage() {
  return <SettingsClient />;
}