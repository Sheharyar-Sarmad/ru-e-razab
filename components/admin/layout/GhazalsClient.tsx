// components/admin/layout/GhazalsClient.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UpdateGhazalForm from "@/components/admin/models/UpdateGhazalForm";
import {
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  EyeIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";

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

interface GhazalsClientProps {
  initialGhazals: Ghazal[];
  initialPage: number;
  totalPages: number;
  totalCount: number; // 🔥 new prop
  initialSearch: string;
  error: string | null;
}

// Helpers
const getFirstLine = (content: any): string => {
  if (!content) return "Untitled";
  if (Array.isArray(content)) {
    if (content.length === 0) return "Untitled";
    if (typeof content[0] === "string") return content[0];
    if (content[0]?.lines) return content[0].lines[0] || "Untitled";
  }
  return "Untitled";
};

const getCategories = (category: any): string[] => {
  if (!category) return [];
  if (Array.isArray(category)) return category;
  if (typeof category === "string") return [category];
  return [];
};

export default function GhazalsClient({
  initialGhazals,
  initialPage,
  totalPages,
  totalCount,
  initialSearch,
  error,
}: GhazalsClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [ghazals, setGhazals] = useState(initialGhazals);
  const [totalPagesState, setTotalPagesState] = useState(totalPages);
  const [totalCountState, setTotalCountState] = useState(totalCount);

  const [selectedGhazal, setSelectedGhazal] = useState<Ghazal | null>(null);
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
    setGhazals(initialGhazals);
    setTotalPagesState(totalPages);
    setTotalCountState(totalCount);
    setCurrentPage(initialPage);
    setSearchInput(initialSearch);
    setDebouncedSearch(initialSearch);
  }, [initialGhazals, totalPages, totalCount, initialPage, initialSearch]);

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this Ghazal? This action cannot be undone.")) return;

    const previousGhazals = ghazals;
    setGhazals((prev) => prev.filter((g) => g.slug !== slug));

    try {
      await axios.delete(`/api/admin/dashboard/hazf/ghazal/${slug}`, {
        withCredentials: true,
      });
      toast.success("غزل حذف ہوگئی!", {
        style: { background: "#2B4735", color: "#FFF3EF" },
        progressStyle: { background: "#A964FF" },
      });
      router.refresh();
      setTotalPagesState((prev) => Math.max(1, prev - 1));
      setTotalCountState((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setGhazals(previousGhazals);
      toast.error("حذف کرنے میں ناکامی", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
    }
  };

  const handleUpdateSuccess = () => {
    setIsUpdateModalOpen(false);
    setSelectedGhazal(null);
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
            Ghazals (غزلیں)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage, edit, and review your ghazal collection</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by first line..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-60"
            />
          </div>
          <Link
            href="/admin/dashboard/jadeed-kalam"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-md hover:shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
          >
            <PlusCircleIcon className="w-4 h-4" />
            Add New Ghazal
          </Link>
        </div>
      </div>

      {/* Total count (no filters) */}
      <div className="mb-4 text-sm text-gray-400">
        {totalCountState} {totalCountState === 1 ? 'ghazal' : 'ghazals'} found
      </div>

      {/* Content */}
      {error ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-red-100">
          <p className="text-red-500">{error}</p>
        </div>
      ) : ghazals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-gray-500 text-lg">No Ghazals found.</p>
          <p className="text-gray-400 text-sm mt-1">Start by adding your first ghazal.</p>
          <Link
            href="/admin/dashboard/jadeed-kalam"
            className="inline-block mt-4 px-6 py-2 text-white rounded-lg shadow-md hover:shadow-lg transition"
            style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
          >
            <PlusCircleIcon className="w-4 h-4 inline mr-2" />
            Add New Ghazal
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ghazals.map((ghazal, idx) => {
              const firstLine = getFirstLine(ghazal.content);
              const categories = getCategories(ghazal.category);

              return (
                <motion.div
                  key={ghazal._id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full"
                >
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {ghazal.coverImage ? (
                      <img src={ghazal.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <span className="text-sm">No Image</span>
                      </div>
                    )}
                    {ghazal.featured && (
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
                      <span className="font-medium">Takhallus:</span> {ghazal.takhallus || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <EyeIcon className="w-3 h-3" /> {ghazal.views ?? 0} views
                    </p>
                    <div className="mt-auto pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setSelectedGhazal(ghazal);
                          setIsUpdateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ghazal.slug)}
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
      <UpdateGhazalForm
        ghazal={selectedGhazal}
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onUpdate={handleUpdateSuccess}
      />

      {/* Floating Scroll-to-Top Button */}
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