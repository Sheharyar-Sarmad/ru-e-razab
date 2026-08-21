// app/admin/dashboard/kalam/nazms/page.tsx
import { cookies } from "next/headers";
import apiClient from "@/lib/api";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import NazmsClient from "@/components/admin/layout/NazmsClient";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manage Nazms | Admin Dashboard | Ru-e-Razab",
  description: "View, edit, and delete nazms from the admin panel.",
  robots: "noindex, nofollow",
};

interface SearchParams {
  page?: string;
  search?: string;
}

interface Nazm {
  _id: string;
  unwan: string;
  takhallus: string;
  slug: string;
  content: { shairs: { lines: string[] }[] }[];
  category: string[];
  coverImage: string;
  views: number;
  featured: boolean;
  createdAt: string;
}

interface FetchResponse {
  success: boolean;
  data: {
    nazms: Nazm[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export default async function NazmsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let nazms: Nazm[] = [];
  let totalPages = 1;
  let total = 0;
  let error: string | null = null;

  try {
    // Add a timestamp to bust the API's 1‑minute cache
    const timestamp = Date.now();
    const response = await apiClient.get<FetchResponse>(
      "/api/admin/dashboard/deewan/nazms",
      {
        params: { page, limit: 9, search, _t: timestamp },
        headers: {
          Cookie: cookieHeader,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

    if (response.data.success) {
      nazms = response.data.data.nazms;
      totalPages = response.data.data.pagination.totalPages;
      total = response.data.data.pagination.total;
    } else {
      error = "Failed to load nazms";
    }
  } catch (err) {
    console.error("Server fetch error:", err);
    error = "Could not load nazms";
  }

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <NazmsClient
          initialNazms={nazms}
          initialPage={page}
          totalPages={totalPages}
          initialSearch={search}
          total={total}
          error={error}
        />
      </main>
    </div>
  );
}