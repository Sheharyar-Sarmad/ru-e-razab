// app/qatas/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import QatasClient from "@/components/client/layout/QatasClient";

export const metadata: Metadata = {
  title: "قطعات — Qatas | Ru-e-Razab",
  description:
    "Explore the collection of qatas by Razab Tabraiz — four-line quatrains packed with meaning and depth.",
  openGraph: {
    title: "قطعات — Ru-e-Razab",
    description: "The collection of qatas by Razab Tabraiz.",
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

export default function QatasPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <QatasClient />
    </Suspense>
  );
}