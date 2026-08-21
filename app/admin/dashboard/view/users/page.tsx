// app/admin/dashboard/users/page.tsx
import { cookies } from "next/headers";
import apiClient from "@/lib/api";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import UsersClient from "@/components/admin/layout/UsersClient";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Manage Users | Admin Dashboard",
  description: "View, search, and delete registered users of Ru-e-Razab.",
  robots: "noindex, nofollow",
};

interface SearchParams {
  page?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface User {
  _id: string;
  accountname: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface FetchResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    search: string | null;
    sort: {
      field: string;
      order: string;
    };
  };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder || "desc";

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let users: User[] = [];
  let totalPages = 1;
  let totalCount = 0;
  let error: string | null = null;

  try {
    const timestamp = Date.now();
    const response = await apiClient.get<FetchResponse>(
      "/api/admin/dashboard/users",
      {
        params: { page, limit: 9, search, sortBy, sortOrder, _t: timestamp },
        headers: {
          Cookie: cookieHeader,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

    if (response.data.success) {
      users = response.data.data.users;
      totalPages = response.data.data.pagination.totalPages;
      totalCount = response.data.data.pagination.total;
    } else {
      error = "Failed to load users";
    }
  } catch (err) {
    console.error("Server fetch error:", err);
    error = "Could not load users";
  }

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <UsersClient
          initialUsers={users}
          initialPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          initialSearch={search}
          initialSortBy={sortBy}
          initialSortOrder={sortOrder}
          error={error}
        />
      </main>
    </div>
  );
}