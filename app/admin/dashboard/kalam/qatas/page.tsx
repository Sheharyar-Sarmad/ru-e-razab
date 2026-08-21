// app/admin/dashboard/kalam/qatas/page.tsx
import { cookies } from "next/headers";
import apiClient from "@/lib/api";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import QatasClient from "@/components/admin/layout/QatasClient";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manage Qatas | Admin Dashboard | Ru-e-Razab",
  description: "View, edit, and delete qatas from the admin panel.",
  robots: "noindex, nofollow",
};

interface SearchParams {
  page?: string;
  search?: string;
}

interface Qata {
  _id: string;
  takhallus: string;
  slug: string;
  content: { lines: string[] }[];
  category: string[];
  coverImage: string;
  views: number;
  featured: boolean;
  createdAt: string;
}

interface FetchResponse {
  success: boolean;
  data: {
    qatas: Qata[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export default async function QatasPage({
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

  let qatas: Qata[] = [];
  let totalPages = 1;
  let totalCount = 0;
  let error: string | null = null;

  try {
    // Cache buster
    const timestamp = Date.now();
    const response = await apiClient.get<FetchResponse>(
      "/api/admin/dashboard/deewan/qatas",
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
      qatas = response.data.data.qatas;
      totalPages = response.data.data.pagination.totalPages;
      totalCount = response.data.data.pagination.total;
    } else {
      error = "Failed to load qatas";
    }
  } catch (err) {
    console.error("Server fetch error:", err);
    error = "Could not load qatas";
  }

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <QatasClient
          initialQatas={qatas}
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