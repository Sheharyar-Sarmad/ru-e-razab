// app/admin/dashboard/page.tsx
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import DashboardContent from "@/components/admin/layout/AdminDashboardContent";
import { Metadata } from "next";

// This is a Server Component by default (no "use client")
export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* AdminSidebar is a Client Component - works in Server Component */}
      <AdminSidebar />
      <main className="flex-1 lg:ml-0 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden min-h-screen w-full">
        <div className="max-w-7xl mx-auto">
          {/* DashboardContent is a Client Component - works in Server Component */}
          <DashboardContent />
        </div>
      </main>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Admin Dashboard | Ru-e-Razab",
  robots: {
    index: false,
    follow: false,
  },
};