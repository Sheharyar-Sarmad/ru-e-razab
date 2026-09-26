// app/kulliyat/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import KulliyatClient from "@/components/client/layout/KulliyatClient";

export const metadata: Metadata = {
  title: "کلیات — The Complete Collection | Ru-e-Razab",
  description:
    "Explore the complete collection of Razab Tabraiz's poetry — ghazals, nazms, and qatas, all in one place.",
  openGraph: {
    title: "کلیات — Ru-e-Razab",
    description:
      "Complete collection of Razab Tabraiz's poetry — ghazals, nazms, and qatas.",
    type: "website",
  },
};

function Fallback() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF7F4" }}>
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