// components/admin/layout/UsersClient.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useRouter, usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";

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

interface UsersClientProps {
  initialUsers: User[];
  initialPage: number;
  totalPages: number;
  totalCount: number;
  initialSearch: string;
  initialSortBy: string;
  initialSortOrder: string;
  error?: string | null;
}

const formatDate = (date: string): string => {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
};

export default function UsersClient({
  initialUsers,
  initialPage,
  totalPages,
  totalCount,
  initialSearch,
  initialSortBy,
  initialSortOrder,
  error: initialError,
}: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState<string>(initialSearch);
  const [debouncedSearch, setDebouncedSearch] =
    useState<string>(initialSearch);

  const [sortBy, setSortBy] = useState<string>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<string>(initialSortOrder);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const [users, setUsers] = useState<User[]>(initialUsers);

  const [totalPagesState, setTotalPagesState] =
    useState<number>(totalPages);

  const [totalCountState, setTotalCountState] =
    useState<number>(totalCount);

  const [error, setError] = useState<string | null | undefined>(
    initialError,
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* =========================================================
     DEBOUNCE SEARCH
  ========================================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  /* =========================================================
     UPDATE URL ON FILTER CHANGE
  ========================================================= */

  useEffect(() => {
    const params = new URLSearchParams();

    if (currentPage > 1) {
      params.set("page", String(currentPage));
    }

    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    }

    if (sortBy !== "createdAt") {
      params.set("sortBy", sortBy);
    }

    if (sortOrder !== "desc") {
      params.set("sortOrder", sortOrder);
    }

    const queryString = params.toString();

    const url = `${pathname}${queryString ? `?${queryString}` : ""}`;

    router.push(url, {
      scroll: false,
    });
  }, [
    currentPage,
    debouncedSearch,
    sortBy,
    sortOrder,
    pathname,
    router,
  ]);

  /* =========================================================
     SYNC WITH SERVER PROPS
  ========================================================= */

  useEffect(() => {
    setUsers(initialUsers);
    setTotalPagesState(totalPages);
    setTotalCountState(totalCount);
    setCurrentPage(initialPage);
    setSearchInput(initialSearch);
    setDebouncedSearch(initialSearch);
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
    setError(initialError);
  }, [
    initialUsers,
    totalPages,
    totalCount,
    initialPage,
    initialSearch,
    initialSortBy,
    initialSortOrder,
    initialError,
  ]);

  /* =========================================================
     FETCH USERS WHEN FILTERS CHANGE
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const timestamp = Date.now();

        const response = await axios.get("/api/admin/dashboard/users", {
          params: {
            page: currentPage,
            limit: 9,
            search: debouncedSearch,
            sortBy,
            sortOrder,
            _t: timestamp,
          },
          withCredentials: true,
        });

        if (cancelled) {
          return;
        }

        if (response.data?.success) {
          const responseUsers = response.data?.data?.users;
          const pagination = response.data?.data?.pagination;

          if (Array.isArray(responseUsers)) {
            setUsers(responseUsers as User[]);
          }

          if (pagination) {
            if (typeof pagination.total === "number") {
              setTotalCountState(pagination.total);
            }

            if (typeof pagination.totalPages === "number") {
              setTotalPagesState(
                Math.max(1, pagination.totalPages),
              );
            }
          }
        } else {
          setError(
            response.data?.message || "Failed to load users.",
          );
        }
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        console.error("Fetch error:", err);

        const message = axios.isAxiosError(err)
          ? err.response?.data?.message
          : null;

        const errorMessage =
          typeof message === "string"
            ? message
            : "Failed to load users.";

        setError(errorMessage);

        toast.error(errorMessage, {
          style: {
            background: "#4A2B2B",
            color: "#FFF3EF",
          },
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    /*
     * Avoid fetching the same data that was already supplied
     * by the server on the initial render.
     */
    const hasChanged =
      currentPage !== initialPage ||
      debouncedSearch !== initialSearch ||
      sortBy !== initialSortBy ||
      sortOrder !== initialSortOrder;

    if (hasChanged) {
      void fetchUsers();
    }

    return () => {
      cancelled = true;
    };
  }, [
    currentPage,
    debouncedSearch,
    sortBy,
    sortOrder,
    initialPage,
    initialSearch,
    initialSortBy,
    initialSortOrder,
  ]);

  /* =========================================================
     DELETE USER
  ========================================================= */

  const handleDelete = async (
    id: string,
    name: string,
  ): Promise<void> => {
    const confirmed = window.confirm(
      `Are you sure you want to delete user "${name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const previousUsers = [...users];

    // Optimistic UI update
    setUsers((prev) =>
      prev.filter((user) => user._id !== id),
    );

    try {
      await axios.delete(
        `/api/admin/dashboard/user/delete/${encodeURIComponent(id)}`,
        {
          withCredentials: true,
        },
      );

      toast.success(
        `User "${name}" deleted successfully.`,
        {
          style: {
            background: "#2B4735",
            color: "#FFF3EF",
          },
        },
      );

      setTotalCountState((prev) =>
        Math.max(0, prev - 1),
      );

      // Refresh the page to sync with the server.
      router.refresh();
    } catch (err: unknown) {
      // Restore the list if deletion failed.
      setUsers(previousUsers);

      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : null;

      toast.error(
        typeof message === "string"
          ? message
          : "Failed to delete user.",
        {
          style: {
            background: "#4A2B2B",
            color: "#FFF3EF",
          },
        },
      );
    }
  };

  /* =========================================================
     PAGINATION
  ========================================================= */

  const goToPrevPage = (): void => {
    if (currentPage > 1) {
      setCurrentPage((prev) => Math.max(1, prev - 1));
    }
  };

  const goToNextPage = (): void => {
    if (currentPage < totalPagesState) {
      setCurrentPage((prev) =>
        Math.min(totalPagesState, prev + 1),
      );
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{
          width: "auto",
          maxWidth: "90%",
        }}
        toastClassName="custom-toast"
      />

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{
              color: COLORS.deepForest,
            }}
          >
            Users (صارفین)
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage registered users of Ru-e-Razab
          </p>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />

          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchInput}
            onChange={(e) =>
              setSearchInput(e.target.value)
            }
            className="pl-9 pr-4 py-2 bg-white text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-60"
          />
        </div>
      </div>

      {/* Total count & sorting */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-gray-400">
          {totalCountState}{" "}
          {totalCountState === 1 ? "user" : "users"} found
        </span>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value)
            }
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="createdAt">
              Created Date
            </option>
            <option value="accountname">
              Account Name
            </option>
            <option value="firstname">
              First Name
            </option>
            <option value="email">
              Email
            </option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value)
            }
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="desc">
              Descending
            </option>

            <option value="asc">
              Ascending
            </option>
          </select>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-100">
          <p className="text-red-500">
            {error}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#A5421D] border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">
            👤
          </div>

          <p className="text-gray-500 text-lg">
            No users found.
          </p>

          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your search.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Account
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Name
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Email
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Phone
                    </th>

                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Joined
                    </th>

                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {users.map((user, idx) => (
                    <motion.tr
                      key={user._id || idx}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: idx * 0.03,
                      }}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {user.accountname}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {user.firstname}{" "}
                        {user.lastname}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        <a
                          href={`mailto:${user.email}`}
                          className="hover:text-[#A5421D]"
                        >
                          {user.email}
                        </a>
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {user.phonenumber || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              user._id,
                              `${user.firstname} ${user.lastname}`,
                            )
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title="Delete user"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPagesState > 1 && (
            <div className="flex items-center justify-between mt-8">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>

              <span className="text-sm text-gray-500">
                Page {currentPage} of{" "}
                {totalPagesState}
              </span>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={
                  currentPage === totalPagesState
                }
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Toast styling */}
      <style jsx global>{`
        .custom-toast .Toastify__toast {
          border-radius: 12px !important;
        }

        .custom-toast .Toastify__toast--success {
          background: #2b4735 !important;
          color: #fff3ef !important;
        }

        .custom-toast
          .Toastify__toast--success
          .Toastify__progress-bar {
          background: #a964ff !important;
        }

        .custom-toast .Toastify__toast--error {
          background: #4a2b2b !important;
          color: #fff3ef !important;
        }

        .custom-toast
          .Toastify__toast--error
          .Toastify__progress-bar {
          background: #bd4d23 !important;
        }

        .custom-toast .Toastify__toast-body {
          color: #fff3ef !important;
        }

        .custom-toast .Toastify__close-button {
          color: #fff3ef !important;
        }
      `}</style>
    </>
  );
}
