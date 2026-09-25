import { Outfit, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import LayoutProvider from "@/components/client/layout/LayoutProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const notoNastaliq = Noto_Nastaliq_Urdu({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata = {
  title: "Admin",
  description: "Admin Panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ur" className={`${outfit.variable} ${notoNastaliq.variable}`}>
      <body className="font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen flex flex-col">
        <LayoutProvider>{children}</LayoutProvider>
      </body>
    </html>
  );
}