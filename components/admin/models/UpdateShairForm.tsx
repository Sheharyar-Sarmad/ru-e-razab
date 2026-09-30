// components/admin/models/UpdateShairForm.tsx
"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PhotoIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { COLORS } from "@/lib/colors";

interface LinkType {
  title: string;
  url: string;
  type?: string;
}

interface MediaItem {
  url?: string;
  type?: string;
  [key: string]: unknown;
}

interface ShairData {
  _id: string;
  takhallus: string;
  content: string[]; // exactly 2 lines
  category: string[];
  coverImage: string;
  coverImageMetadata?: Record<string, unknown>;
  media?: MediaItem[];
  metaTitle?: string;
  metaDescription?: string;
  links?: LinkType[];
  featured: boolean;
  slug: string;
  publishedAt?: string;
}

interface UpdateShairFormProps {
  shair: ShairData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface ApiResponse {
  success: boolean;
  message?: string;
}

const successToastStyle = { background: "#2B4735", color: "#FFF3EF" };
const errorToastStyle = { background: "#4A2B2B", color: "#FFF3EF" };

export default function UpdateShairForm({ shair, isOpen, onClose, onUpdate }: UpdateShairFormProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [takhallus, setTakhallus] = useState<string>("");
  const [lines, setLines] = useState<string[]>(["", ""]);
  const [categories, setCategories] = useState<string>("");
  const [metaTitle, setMetaTitle] = useState<string>("");
  const [metaDescription, setMetaDescription] = useState<string>("");
  const [featured, setFeatured] = useState<boolean>(false);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");
  const [publishedAt, setPublishedAt] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  useEffect(() => {
    if (shair && isOpen) {
      setTakhallus(shair.takhallus);
      setLines(shair.content && Array.isArray(shair.content) ? shair.content : ["", ""]);
      setCategories(shair.category.join(", "));
      setMetaTitle(shair.metaTitle || "");
      setMetaDescription(shair.metaDescription || "");
      setFeatured(shair.featured || false);
      setLinks(shair.links || []);
      setPublishedAt(shair.publishedAt ? new Date(shair.publishedAt).toISOString().split("T")[0] : "");
      setCoverImageFile(null);
      setMediaFiles([]);
      setError(null);
    }
  }, [shair, isOpen]);

  const handleLineChange = (index: number, value: string) => {
    const newLines = [...lines];
    newLines[index] = value;
    setLines(newLines);
  };

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setLinks([...links, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
      setNewLinkTitle("");
      setNewLinkUrl("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const showError = (msg: string) => {
    setError(msg);
    toast.error(msg, { style: errorToastStyle });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shair) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("takhallus", takhallus);
      formData.append("content", JSON.stringify(lines));
      formData.append(
        "categories",
        JSON.stringify(categories.split(",").map((c) => c.trim()))
      );
      formData.append("metaTitle", metaTitle);
      formData.append("metaDescription", metaDescription);
      formData.append("featured", String(featured));
      formData.append("links", JSON.stringify(links));
      if (publishedAt) formData.append("publishedAt", publishedAt);

      if (coverImageFile) formData.append("coverImage", coverImageFile);
      mediaFiles.forEach((file) => formData.append("media", file));

      const response = await axios.patch<ApiResponse>(
        `/api/admin/dashboard/tarmeem/shair/${shair.slug}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Shair updated successfully!", { style: successToastStyle });
        onUpdate();
        onClose();
      } else {
        showError(response.data.message || "Failed to update shair");
      }
    } catch (err: unknown) {
      let msg = "Network error";
      if (axios.isAxiosError<ApiResponse>(err)) {
        msg = err.response?.data?.message || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && shair && (
        <motion.div
          key="update-shair-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold" style={{ color: COLORS.deepForest }}>
                Update Shair
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Takhallus <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={takhallus}
                    onChange={(e) => setTakhallus(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Published Date</label>
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content (2 lines) <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="First line"
                    value={lines[0] || ""}
                    onChange={(e) => handleLineChange(0, e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Second line"
                    value={lines[1] || ""}
                    onChange={(e) => handleLineChange(1, e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  placeholder="E.g., Romantic, Spiritual (comma separated)"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">Featured</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm text-gray-600">Mark as Featured</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title (SEO)</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description (SEO)</label>
                  <input
                    type="text"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    maxLength={160}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">External Links</span>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div key={`${link.url}-${index}`} className="flex gap-2 items-center text-sm">
                      <span className="flex-1 font-medium text-gray-700">{link.title}</span>
                      <span className="flex-1 text-gray-500 truncate">{link.url}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Link Title"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Link URL"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">Current Cover Image</span>
                  {shair.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shair.coverImage}
                      alt="Cover"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 mb-2"
                    />
                  )}
                  <label className="cursor-pointer block">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <PhotoIcon className="w-5 h-5" /> Replace Cover Image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  {coverImageFile && (
                    <span className="text-xs text-gray-500 mt-1 block">{coverImageFile.name}</span>
                  )}
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    Current Media ({shair.media?.length || 0} files)
                  </span>
                  <label className="cursor-pointer block">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <PlusCircleIcon className="w-5 h-5" /> Add / Replace Media (Max 20 files)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      onChange={(e) => setMediaFiles(Array.from(e.target.files ?? []))}
                      className="hidden"
                    />
                  </label>
                  {mediaFiles.length > 0 && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      {mediaFiles.length} new file(s) selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
                  }}
                >
                  {loading ? "Updating..." : "Update Shair"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}