// app/shairs/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import ShairsClient from "@/components/client/layout/ShairsClient";

export const metadata: Metadata = {
  title: "اشعار — Ashaar | Ru-e-Razab",
  description:
    "Explore the finest couplets by Razab Tabraiz — individual sher that capture an entire emotion in two lines.",
  openGraph: {
    title: "اشعار — Ru-e-Razab",
    description: "Selected couplets by Razab Tabraiz.",
    type: "website",
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

export default function ShairsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ShairsClient />
    </Suspense>
  );
}