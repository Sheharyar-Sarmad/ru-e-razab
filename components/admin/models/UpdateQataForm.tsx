// components/admin/models/UpdateQataForm.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PhotoIcon, PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { COLORS } from "@/lib/colors";

interface Shair {
  lines: string[];
}

interface LinkType {
  title: string;
  url: string;
  type?: string;
}

interface QataData {
  _id: string;
  takhallus: string;
  content: Shair[];
  category: string[];
  coverImage: string;
  coverImageMetadata?: Record<string, unknown>;
  media?: unknown[];
  metaTitle?: string;
  metaDescription?: string;
  links?: LinkType[];
  featured: boolean;
  slug: string;
  publishedAt?: string;
}

interface UpdateQataFormProps {
  qata: QataData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const MIN_SHAIRS = 2;

const createEmptyShair = (): Shair => ({ lines: ["", ""] });

const createDefaultShairs = (): Shair[] =>
  Array.from({ length: MIN_SHAIRS }, createEmptyShair);

const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || "Network error";
  }
  if (err instanceof Error) return err.message;
  return "Network error";
};

const successToastStyle = { background: "#2B4735", color: "#FFF3EF" };
const errorToastStyle = { background: "#4A2B2B", color: "#FFF3EF" };

export default function UpdateQataForm({ qata, isOpen, onClose, onUpdate }: UpdateQataFormProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [takhallus, setTakhallus] = useState<string>("");
  const [shairs, setShairs] = useState<Shair[]>(createDefaultShairs());
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
    if (qata && isOpen) {
      setTakhallus(qata.takhallus);
      setShairs(
        qata.content && Array.isArray(qata.content) && qata.content.length > 0
          ? qata.content
          : createDefaultShairs()
      );
      setCategories((qata.category || []).join(", "));
      setMetaTitle(qata.metaTitle || "");
      setMetaDescription(qata.metaDescription || "");
      setFeatured(qata.featured || false);
      setLinks(qata.links || []);
      setPublishedAt(qata.publishedAt ? new Date(qata.publishedAt).toISOString().split("T")[0] : "");
      setCoverImageFile(null);
      setMediaFiles([]);
      setError(null);
    }
  }, [qata, isOpen]);

  // ---------- Shair handlers ----------
  const addShair = () => {
    setShairs((prev) => [...prev, createEmptyShair()]);
  };

  const removeShair = (index: number) => {
    setShairs((prev) => (prev.length > MIN_SHAIRS ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleShairChange = (index: number, lineIndex: number, value: string) => {
    setShairs((prev) =>
      prev.map((shair, i) => {
        if (i !== index) return shair;
        const newLines = [...shair.lines];
        newLines[lineIndex] = value;
        return { ...shair, lines: newLines };
      })
    );
  };

  // ---------- Link handlers ----------
  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setLinks((prev) => [...prev, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
      setNewLinkTitle("");
      setNewLinkUrl("");
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!qata) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("takhallus", takhallus);
      formData.append("content", JSON.stringify(shairs));
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

      const response = await axios.patch<{ success: boolean; message?: string }>(
        `/api/admin/dashboard/tarmeem/qata/${qata.slug}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Qata updated successfully!", {
          style: successToastStyle,
        });
        onUpdate();
        onClose();
      } else {
        const msg = response.data.message || "Failed to update qata";
        setError(msg);
        toast.error(msg, {
          style: errorToastStyle,
        });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg, {
        style: errorToastStyle,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && qata && (
        <motion.div
          key="update-qata-overlay"
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
                Update Qata
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
                  Content (2 Shairs) <span className="text-red-500">*</span>
                </label>
                {shairs.map((shair, index) => (
                  <div key={index} className="flex gap-2 items-center mb-2">
                    <span className="text-xs text-gray-400 w-6">#{index + 1}</span>
                    <input
                      type="text"
                      placeholder="First line"
                      value={shair.lines[0] || ""}
                      onChange={(e) => handleShairChange(index, 0, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Second line"
                      value={shair.lines[1] || ""}
                      onChange={(e) => handleShairChange(index, 1, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                    />
                    {shairs.length > MIN_SHAIRS && (
                      <button
                        type="button"
                        onClick={() => removeShair(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addShair}
                  className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1"
                >
                  <PlusCircleIcon className="w-4 h-4" /> Add Shair
                </button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">External Links</label>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div key={index} className="flex gap-2 items-center text-sm">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Cover Image</label>
                  {qata.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qata.coverImage}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Media ({qata.media?.length ?? 0} files)
                  </label>
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
                  {loading ? "Updating..." : "Update Qata"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}