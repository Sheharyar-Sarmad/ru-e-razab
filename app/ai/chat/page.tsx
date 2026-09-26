// app/ai/chat/page.tsx
import type { Metadata } from "next";
import AIChatClient from "@/components/client/layout/AIChatClient";

export const metadata: Metadata = {
  title: "RAZAB AI — Baat-cheet | Ru-e-Razab",
  description:
    "RAZAB Tabraiz ki ghazlon, shairon, nazmon aur qaton ke baare mein baat karein — likh kar ya awaz mein.",
};

export default function AIChatPage() {
  return <AIChatClient />;
}