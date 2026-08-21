// app/admin/dashboard/kalam/shairs/page.tsx
import { cookies } from "next/headers";
import apiClient from "@/lib/api";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import ShairsClient from "@/components/admin/layout/ShairsClient";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manage Shairs | Admin Dashboard | Ru-e-Razab",
  description: "View, edit, and delete shairs from the admin panel.",
  robots: "noindex, nofollow",
};

interface SearchParams {
  page?: string;
  search?: string;
}

interface Shair {
  _id: string;
  takhallus: string;
  slug: string;
  content: string[]; // exactly 2 lines
  category: string[];
  coverImage: string;
  views: number;
  featured: boolean;
  createdAt: string;
}

interface FetchResponse {
  success: boolean;
  data: {
    shairs: Shair[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export default async function ShairsPage({
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

  let shairs: Shair[] = [];
  let totalPages = 1;
  let totalCount = 0;
  let error: string | null = null;

  try {
    // Cache buster to avoid 1-minute cache
    const timestamp = Date.now();
    const response = await apiClient.get<FetchResponse>(
      "/api/admin/dashboard/deewan/shairs",
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
      shairs = response.data.data.shairs;
      totalPages = response.data.data.pagination.totalPages;
      totalCount = response.data.data.pagination.total;
    } else {
      error = "Failed to load shairs";
    }
  } catch (err) {
    console.error("Server fetch error:", err);
    error = "Could not load shairs";
  }

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <ShairsClient
          initialShairs={shairs}
          initialPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          initialSearch={search}
          error={error}
        />
      </main>
    </div>
  );
}