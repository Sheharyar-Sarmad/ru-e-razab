import { Outfit, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }) {
  return (
    <html lang="ur" className={`${outfit.variable} ${notoNastaliq.variable}`}>
      <body>{children}</body>
    </html>
  );
}