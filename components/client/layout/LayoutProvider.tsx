"use client";

import { usePathname } from "next/navigation";
import Navbar from "../navigation/Navbar";
import Footer from "../navigation/Footer";

export default function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide condition checks:
  // 1. Any route starting with /admin/dashboard
  // 2. Exact match for /admin/login or /admin/sign-up
  // 3. 404 / Not Found pages
  const isAdminDashboard = pathname?.startsWith("/admin/dashboard");
  const isAdminAuth = pathname === "/admin/login" || pathname === "/admin/sign-up";
  const isNotFound = pathname === "/not-found" || pathname === "/404";

  const shouldHideHeaderFooter = isAdminDashboard || isAdminAuth || isNotFound;

  return (
    <>
      {!shouldHideHeaderFooter && <Navbar />}
      <main className="flex-1">{children}</main>
      {!shouldHideHeaderFooter && <Footer />}
    </>
  );
}