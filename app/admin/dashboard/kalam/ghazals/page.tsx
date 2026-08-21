// app/admin/dashboard/kalam/ghazals/page.tsx
import { cookies } from "next/headers";
import apiClient from "@/lib/api";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import GhazalsClient from "@/components/admin/layout/GhazalsClient";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manage Ghazals | Admin Dashboard | Ru-e-Razab",
  description: "View, edit, and delete ghazals from the admin panel.",
  robots: "noindex, nofollow",
};

interface SearchParams {
  page?: string;
  search?: string;
}

interface Ghazal {
  _id: string;
  takhallus: string;
  slug: string;
  content: { lines: string[] }[] | string[];
  category: string[];
  coverImage: string;
  views: number;
  featured: boolean;
  createdAt: string;
}

interface FetchResponse {
  success: boolean;
  data: {
    ghazals: Ghazal[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export default async function GhazalsPage({
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

  let ghazals: Ghazal[] = [];
  let totalPages = 1;
  let totalCount = 0;
  let error: string | null = null;

  try {
    const response = await apiClient.get<FetchResponse>(
      "/api/admin/dashboard/deewan/ghazals",
      {
        params: { page, limit: 6, search },
        headers: {
          Cookie: cookieHeader,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

    if (response.data.success) {
      ghazals = response.data.data.ghazals;
      totalPages = response.data.data.pagination.pages;
      totalCount = response.data.data.pagination.total;
    } else {
      error = "Failed to load ghazals";
    }
  } catch (err) {
    console.error("Server fetch error:", err);
    error = "Could not load ghazals";
  }

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <GhazalsClient
          initialGhazals={ghazals}
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