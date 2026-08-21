// app/admin/dashboard/settings/account/page.tsx
import { cookies } from "next/headers";
import { Metadata } from "next";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import SettingsClient from "@/components/admin/layout/SettingsClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Account Settings | Admin Dashboard",
  description: "Update your admin account details and password.",
  robots: "noindex, nofollow",
};

interface AdminDetails {
  _id: string;
  accountname: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  createdAt: string;
  updatedAt: string;
}

async function getAdminDetails(): Promise<AdminDetails | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/dashboard/details/account`,
      {
        headers: {
          Cookie: cookieHeader,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch admin details:", error);
    return null;
  }
}

export default async function SettingsPage() {
  const admin = await getAdminDetails();

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <SettingsClient initialAdmin={admin} />
      </main>
    </div>
  );
}