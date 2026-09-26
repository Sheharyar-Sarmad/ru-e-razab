// app/ghazals/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import GhazalsClient from "@/components/client/layout/GhazalsClient";

export const metadata: Metadata = {
  title: "غزلیں — Ghazals | Ru-e-Razab",
  description:
    "Explore the complete collection of ghazals by Razab Tabraiz — love, longing, and the ache of the heart in every verse.",
  openGraph: {
    title: "غزلیں — Ru-e-Razab",
    description:
      "The complete collection of ghazals by Razab Tabraiz.",
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

export default function GhazalsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <GhazalsClient />
    </Suspense>
  );
}