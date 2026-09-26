import { Outfit, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import LayoutProvider from "@/components/client/layout/LayoutProvider";
import LenisProvider from "@/components/client/layout/LenisProvider";
import type { Metadata } from "next";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const notoNastaliq = Noto_Nastaliq_Urdu({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ru-e-Razab",
  description: "The poetry and literary world of Razab Tabraiz.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur" className={`${outfit.variable} ${notoNastaliq.variable}`}>
      <body className="font-outfit bg-[#FFF7F5] dark:bg-[#1A090D] text-[#1A090D] dark:text-[#FFF7F5] min-h-screen flex flex-col">
        <LenisProvider>
          <LayoutProvider>{children}</LayoutProvider>
        </LenisProvider>
      </body>
    </html>
  );
}