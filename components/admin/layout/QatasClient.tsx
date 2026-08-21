// components/admin/layout/QatasClient.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UpdateQataForm from "@/components/admin/models/UpdateQataForm";
import {
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  EyeIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";

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

interface QatasClientProps {
  initialQatas: Qata[];
  initialPage: number;
  totalPages: number;
  totalCount: number;
  initialSearch: string;
  error?: string | null;
}

// Helpers
const getFirstLine = (content: any): string => {
  if (!content) return "Untitled";
  if (Array.isArray(content) && content.length > 0) {
    return content[0].lines[0] || "Untitled";
  }
  return "Untitled";
};

const getCategories = (category: any): string[] => {
  if (!category) return [];
  if (Array.isArray(category)) return category;
  if (typeof category === "string") return [category];
  return [];
};

export default function QatasClient({
  initialQatas,
  initialPage,
  totalPages,
  totalCount,
  initialSearch,
  error: initialError,
}: QatasClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [qatas, setQatas] = useState(initialQatas);
  const [totalPagesState, setTotalPagesState] = useState(totalPages);
  const [totalCountState, setTotalCountState] = useState(totalCount);
  const [error, setError] = useState(initialError);

  const [selectedQata, setSelectedQata] = useState<Qata | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL on page/search change
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set("page", String(currentPage));
    if (debouncedSearch) params.set("search", debouncedSearch);

    const url = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.push(url, { scroll: false });
  }, [currentPage, debouncedSearch, pathname, router]);

  // Sync with server props
  useEffect(() => {
    setQatas(initialQatas);
    setTotalPagesState(totalPages);
    setTotalCountState(totalCount);
    setCurrentPage(initialPage);
    setSearchInput(initialSearch);
    setDebouncedSearch(initialSearch);
    setError(initialError);
  }, [initialQatas, totalPages, totalCount, initialPage, initialSearch, initialError]);

  // Delete handler
  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this Qata? This action cannot be undone.")) return;

    const previousQatas = qatas;
    setQatas((prev) => prev.filter((q) => q.slug !== slug));

    try {
      await axios.delete(`/api/admin/dashboard/hazf/qata/${slug}`, {
        withCredentials: true,
      });
      toast.success("Qata deleted successfully!", {
        style: { background: "#2B4735", color: "#FFF3EF" },
        progressStyle: { background: "#A964FF" },
      });
      router.refresh();
      setTotalPagesState((prev) => Math.max(1, prev - 1));
      setTotalCountState((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setQatas(previousQatas);
      toast.error("Failed to delete Qata.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
    }
  };

  const handleUpdateSuccess = () => {
    setIsUpdateModalOpen(false);
    setSelectedQata(null);
    router.refresh();
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < totalPagesState) setCurrentPage(currentPage + 1);
  };

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
        style={{ width: "auto", maxWidth: "90%" }}
        toastClassName="custom-toast"
      />

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl mt-10 md:text-3xl font-bold" style={{ color: COLORS.deepForest }}>
            Qatas (قطعات)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage, edit, and review your qata collection</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by poet, content..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-60"
            />
          </div>
          <Link
            href="/admin/dashboard/jadeed-kalam/qata"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md hover:shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
          >
            <PlusCircleIcon className="w-4 h-4" />
            Add New Qata
          </Link>
        </div>
      </div>

      {/* Total count */}
      <div className="mb-4 text-sm text-gray-400">
        {totalCountState} {totalCountState === 1 ? 'qata' : 'qatas'} found
      </div>

      {/* Content */}
      {error ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-100">
          <p className="text-red-500">{error}</p>
        </div>
      ) : qatas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-gray-500 text-lg">No Qatas found.</p>
          <p className="text-gray-400 text-sm mt-1">Start by adding your first qata.</p>
          <Link
            href="/admin/dashboard/jadeed-kalam/qata"
            className="inline-block mt-4 px-6 py-2 text-white rounded-lg shadow-md hover:shadow-lg transition"
            style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
          >
            <PlusCircleIcon className="w-4 h-4 inline mr-2" />
            Add New Qata
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qatas.map((qata, idx) => {
              const firstLine = getFirstLine(qata.content);
              const categories = getCategories(qata.category);

              return (
                <motion.div
                  key={qata._id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
                >
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {qata.coverImage ? (
                      <img src={qata.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <span className="text-sm">No Image</span>
                      </div>
                    )}
                    {qata.featured && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full bg-yellow-500">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-base truncate text-gray-800">
                      {firstLine}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {categories.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          {c}
                        </span>
                      ))}
                      {categories.length > 2 && (
                        <span className="text-[10px] text-gray-400">+{categories.length - 2}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Takhallus:</span> {qata.takhallus || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <EyeIcon className="w-3 h-3" /> {qata.views ?? 0} views
                    </p>
                    <div className="mt-auto pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setSelectedQata(qata);
                          setIsUpdateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(qata.slug)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPagesState}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPagesState}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Update Modal */}
      <UpdateQataForm
        qata={selectedQata}
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onUpdate={handleUpdateSuccess}
      />

      {/* Scroll-to-Top Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1, rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl text-white shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
          boxShadow: `0 8px 32px ${COLORS.burntRust}66`,
        }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <RocketLaunchIcon className="w-6 h-6" />
      </motion.button>

      <style jsx global>{`
        .custom-toast .Toastify__toast {
          border-radius: 12px !important;
        }
        .custom-toast .Toastify__toast--success {
          background: #2B4735 !important;
          color: #FFF3EF !important;
        }
        .custom-toast .Toastify__toast--success .Toastify__progress-bar {
          background: #A964FF !important;
        }
        .custom-toast .Toastify__toast--error {
          background: #4A2B2B !important;
          color: #FFF3EF !important;
        }
        .custom-toast .Toastify__toast--error .Toastify__progress-bar {
          background: #BD4D23 !important;
        }
        .custom-toast .Toastify__toast-body {
          color: #FFF3EF !important;
        }
        .custom-toast .Toastify__close-button {
          color: #FFF3EF !important;
        }
      `}</style>
    </>
  );
}