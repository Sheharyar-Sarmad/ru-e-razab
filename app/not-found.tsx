// app/not-found.tsx
import { headers } from "next/headers";
import { Metadata } from "next";
import NotFoundClient from "@/components/shared/NotFoundClient";

export const metadata: Metadata = {
  title: "404 - Page Not Found - Ru-e-Razab",
  description: "The page you are looking for does not exist or has been moved.",
  robots: {
    index: false, // Prevent search engines from indexing the 404 page
    follow: false,
  },
};

export default async function NotFound() {
  // Get the referer header (the page the user came from)
  const headersList = await headers();
  const referer = headersList.get("referer") || "";

  // Check if the referer contains "/admin/dashboard"
  const isAdminRoute = referer.includes("/admin/dashboard");

  return <NotFoundClient isAdminRoute={isAdminRoute} />;
}