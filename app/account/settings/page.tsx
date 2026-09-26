// app/account/settings/page.tsx
import type { Metadata } from "next";
import SettingsClient from "@/components/client/layout/SettingsClient";

export const metadata: Metadata = {
  title: "Account Settings — Ru-e-Razab",
  description: "Manage your profile, security, and activity on Ru-e-Razab.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}