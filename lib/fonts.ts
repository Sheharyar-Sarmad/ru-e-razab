// lib/fonts.ts
import { Outfit } from "next/font/google";
import localFont from "next/font/local";

// English font (Outfit)
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-outfit",
});

// Urdu font – using Google Fonts via next/font/google
// Note: Noto Nastaliq Urdu is available via Google Fonts.
export const notoNastaliq = localFont({
  src: [
    {
      path: "../public/fonts/NotoNastaliqUrdu-Regular.woff2", // You need to download the font
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/NotoNastaliqUrdu-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-urdu",
});