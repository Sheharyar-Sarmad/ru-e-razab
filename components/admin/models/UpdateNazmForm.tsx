// components/admin/models/UpdateNazmForm.tsx
"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  PhotoIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { COLORS } from "@/lib/colors";

// ---------- Constants ----------
const MAX_LINES = 100;
const MIN_LINE_LENGTH = 2;
const MAX_LINE_LENGTH = 300;

// Fixed takhallus for Azad Nazm
const FIXED_TAKHALLUS = "رزب تبریز";

interface LinkType {
  title: string;
  url: string;
  type?: string;
}

interface NazmData {
  _id: string;
  unwan: string;
  takhallus: string;
  content: string[]; // Azad Nazm — flat array of lines
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

interface UpdateNazmFormProps {
  nazm: NazmData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

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

export default function UpdateNazmForm({
  nazm,
  isOpen,
  onClose,
  onUpdate,
}: UpdateNazmFormProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [unwan, setUnwan] = useState<string>("");
  // Takhallus is fixed; we still keep it in state so we can send it in the payload
  const [takhallus] = useState<string>(FIXED_TAKHALLUS);

  // Azad Nazm — raw textarea holds what user is typing
  const [contentText, setContentText] = useState<string>("");
  // Parsed/validated lines actually sent to the API
  const [lines, setLines] = useState<string[]>([]);

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

  // Populate form when nazm changes
  useEffect(() => {
    if (nazm && isOpen) {
      setUnwan(nazm.unwan);

      // Accept both shapes defensively: flat string[] OR old Band[] (flattened)
      const flatLines: string[] = Array.isArray(nazm.content)
        ? (nazm.content as unknown[]).flatMap((item) => {
            if (typeof item === "string") return [item];
            // Legacy Band shape: { shairs: [{ lines: [..] }, ...] }
            const band = item as { shairs?: { lines?: string[] }[] };
            if (band?.shairs && Array.isArray(band.shairs)) {
              return band.shairs.flatMap((s) =>
                Array.isArray(s?.lines) ? s.lines : []
              );
            }
            return [];
          })
        : [];

      setLines(flatLines);
      setContentText(flatLines.join("\n"));

      setCategories((nazm.category || []).join(", "));
      setMetaTitle(nazm.metaTitle || "");
      setMetaDescription(nazm.metaDescription || "");
      setFeatured(nazm.featured || false);
      setLinks(nazm.links || []);
      setPublishedAt(
        nazm.publishedAt
          ? new Date(nazm.publishedAt).toISOString().split("T")[0]
          : ""
      );
      setCoverImageFile(null);
      setMediaFiles([]);
      setError(null);
    }
  }, [nazm, isOpen]);

  // ---------- Line handler (auto line-break on newline) ----------
  const handleContentChange = (text: string) => {
    setContentText(text);
    const parsed = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, MAX_LINES);
    setLines(parsed);
  };

  // Live preview list (only first MAX_LINES kept)
  const parsedPreview = useMemo(() => {
    return contentText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [contentText]);

  const isTruncated = parsedPreview.length > MAX_LINES;

  // ---------- Link handlers ----------
  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setLinks((prev) => [
        ...prev,
        { title: newLinkTitle.trim(), url: newLinkUrl.trim() },
      ]);
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
    if (!nazm) return;

    // Client-side guard (mirror of server rules)
    if (lines.length < 1 || lines.length > MAX_LINES) {
      const msg = `Content must have between 1 and ${MAX_LINES} lines`;
      setError(msg);
      toast.error(msg, { style: errorToastStyle });
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const len = lines[i].trim().length;
      if (len < MIN_LINE_LENGTH || len > MAX_LINE_LENGTH) {
        const msg = `Line ${i + 1} must be between ${MIN_LINE_LENGTH} and ${MAX_LINE_LENGTH} characters`;
        setError(msg);
        toast.error(msg, { style: errorToastStyle });
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("unwan", unwan);
      formData.append("takhallus", takhallus); // fixed رزب تبریز
      formData.append("content", JSON.stringify(lines)); // flat string[]
      formData.append(
        "categories",
        JSON.stringify(categories.split(",").map((c) => c.trim()).filter(Boolean))
      );
      formData.append("metaTitle", metaTitle);
      formData.append("metaDescription", metaDescription);
      formData.append("featured", String(featured));
      formData.append("links", JSON.stringify(links));
      if (publishedAt) formData.append("publishedAt", publishedAt);

      if (coverImageFile) formData.append("coverImage", coverImageFile);
      mediaFiles.forEach((file) => formData.append("media", file));

      const response = await axios.patch<{ success: boolean; message?: string }>(
        `/api/admin/dashboard/tarmeem/nazm/${nazm.slug}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("Nazm updated successfully!", {
          style: successToastStyle,
        });
        onUpdate();
        onClose();
      } else {
        const msg = response.data.message || "Failed to update nazm";
        setError(msg);
        toast.error(msg, { style: errorToastStyle });
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg, { style: errorToastStyle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && nazm && (
        <motion.div
          key="update-nazm-overlay"
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
              <h2
                className="text-xl font-bold"
                style={{ color: COLORS.deepForest }}
              >
                Update Nazm (آزاد نظم)
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (Unwan) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={unwan}
                    onChange={(e) => setUnwan(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Takhallus
                  </label>
                  <input
                    type="text"
                    value={takhallus}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none opacity-90 cursor-not-allowed"
                    style={{
                      background: `${COLORS.warmWhite}80`,
                      color: COLORS.deepForest,
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Published Date
                </label>
                <input
                  type="date"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Content — Azad Nazm */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Content (Lines) <span className="text-red-500">*</span>{" "}
                    (1-{MAX_LINES})
                  </label>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: `${COLORS.deepForest}15`,
                      color: COLORS.deepForest,
                    }}
                  >
                    آزاد نظم ⭐
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-2">
                  Paste the entire nazm — one misra per line. Line breaks happen
                  automatically. (Max {MAX_LINES} lines, each 2–300 chars)
                </p>

                <textarea
                  value={contentText}
                  onChange={(e) => handleContentChange(e.target.value)}
                  rows={16}
                  dir="rtl"
                  placeholder={
                    "پہلا مصرع\nدوسرا مصرع\nتیسرا مصرع\nچوتھا مصرع\n...\n(ہر نئی سطر = نیا مصرع)"
                  }
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:outline-none font-urdu leading-[2.2]"
                  style={{
                    borderColor: error ? "#ef4444" : `${COLORS.deepForest}40`,
                    background: "#FFFFFF",
                  }}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-gray-600">
                      {lines.length} line{lines.length === 1 ? "" : "s"}
                    </span>
                    {isTruncated && (
                      <span className="mr-3 text-red-500">
                        ⚠ Only first {MAX_LINES} lines will be saved (
                        {parsedPreview.length - MAX_LINES} dropped)
                      </span>
                    )}
                  </div>
                  {contentText && (
                    <button
                      type="button"
                      onClick={() => {
                        setContentText("");
                        setLines([]);
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Line-by-line preview */}
                {parsedPreview.length > 0 && (
                  <div
                    className="mt-3 max-h-64 overflow-y-auto rounded-lg border p-3"
                    style={{
                      borderColor: `${COLORS.deepForest}20`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                  >
                    <p
                      className="text-xs mb-2 font-medium"
                      style={{ color: COLORS.deepForest }}
                    >
                      Preview ({Math.min(parsedPreview.length, MAX_LINES)} lines)
                    </p>
                    <ol className="space-y-1 font-urdu leading-[2] text-sm">
                      {parsedPreview.slice(0, MAX_LINES).map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span
                            className="text-xs shrink-0 w-8 text-left"
                            style={{ color: COLORS.tataBlue }}
                          >
                            {i + 1}.
                          </span>
                          <span className="flex-1">{line}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* Categories */}
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

              {/* Featured */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-sm text-gray-600">
                    Mark as Featured
                  </span>
                </label>
              </div>

              {/* SEO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Title (SEO)
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description (SEO)
                  </label>
                  <input
                    type="text"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    maxLength={160}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Links */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  External Links
                </label>
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-center text-sm"
                    >
                      <span className="flex-1 font-medium text-gray-700">
                        {link.title}
                      </span>
                      <span className="flex-1 text-gray-500 truncate">
                        {link.url}
                      </span>
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

              {/* Media */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Cover Image
                  </label>
                  {nazm.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nazm.coverImage}
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
                      onChange={(e) =>
                        setCoverImageFile(e.target.files?.[0] ?? null)
                      }
                      className="hidden"
                    />
                  </label>
                  {coverImageFile && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      {coverImageFile.name}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Media ({nazm.media?.length ?? 0} files)
                  </label>
                  <label className="cursor-pointer block">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <PlusCircleIcon className="w-5 h-5" /> Add / Replace Media
                      (Max 20 files)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      onChange={(e) =>
                        setMediaFiles(Array.from(e.target.files ?? []))
                      }
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

              {/* Actions */}
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
                  {loading ? "Updating..." : "Update Nazm"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}