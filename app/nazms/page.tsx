// app/nazms/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import NazmsClient from "@/components/client/layout/NazmsClient";

export const metadata: Metadata = {
  title: "نظمیں — Nazms | Ru-e-Razab",
  description:
    "Explore the complete collection of nazms by Razab Tabraiz — narrative poetry that tells a story in every stanza.",
  openGraph: {
    title: "نظمیں — Ru-e-Razab",
    description: "The complete collection of nazms by Razab Tabraiz.",
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

export default function NazmsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <NazmsClient />
    </Suspense>
  );
}