// components/admin/models/UpdateGhazalForm.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  PhotoIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
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

interface GhazalData {
  _id: string;
  takhallus: string;
  content: Shair[];
  category: string[];
  coverImage: string;
  coverImageMetadata?: any;
  media?: any[];
  metaTitle?: string;
  metaDescription?: string;
  links?: LinkType[];
  featured: boolean;
  slug: string;
}

interface UpdateGhazalFormProps {
  ghazal: GhazalData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const MAX_SHAIRS = 20;
const MIN_LINE_LENGTH = 2;
const MAX_LINE_LENGTH = 300;

export default function UpdateGhazalForm({
  ghazal,
  isOpen,
  onClose,
  onUpdate,
}: UpdateGhazalFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [takhallus, setTakhallus] = useState("");
  const [shairs, setShairs] = useState<{ line1: string; line2: string }[]>([]);
  const [categories, setCategories] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Quick paste panel state
  const [pasteText, setPasteText] = useState("");
  const [pasteInfo, setPasteInfo] = useState<{
    lines: number;
    shairs: number;
    odd: boolean;
    truncated: boolean;
  } | null>(null);

  useEffect(() => {
    if (ghazal && isOpen) {
      setTakhallus(ghazal.takhallus);

      const initialShairs = (ghazal.content || []).map((s) => ({
        line1: s.lines?.[0] || "",
        line2: s.lines?.[1] || "",
      }));
      setShairs(initialShairs);
      // Seed the paste textarea with the current content so admin can edit inline
      setPasteText(
        initialShairs
          .flatMap((s) => [s.line1, s.line2])
          .filter(Boolean)
          .join("\n")
      );
      setPasteInfo(null);

      setCategories((ghazal.category || []).join(", "));
      setMetaTitle(ghazal.metaTitle || "");
      setMetaDescription(ghazal.metaDescription || "");
      setFeatured(ghazal.featured || false);
      setLinks(ghazal.links || []);
      setCoverImageFile(null);
      setMediaFiles([]);
      setError(null);
    }
  }, [ghazal, isOpen]);

  // ---------- Quick Paste (2 lines = 1 shair) ----------
  const handlePasteChange = (text: string) => {
    setPasteText(text);

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setShairs([{ line1: "", line2: "" }]);
      setPasteInfo(null);
      return;
    }

    const built: { line1: string; line2: string }[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      built.push({
        line1: lines[i] ?? "",
        line2: lines[i + 1] ?? "",
      });
    }

    const truncated = built.length > MAX_SHAIRS;
    const finalShairs = built.slice(0, MAX_SHAIRS);

    setShairs(finalShairs);
    setPasteInfo({
      lines: lines.length,
      shairs: finalShairs.length,
      odd: lines.length % 2 !== 0,
      truncated,
    });
  };

  const clearPaste = () => {
    setPasteText("");
    setPasteInfo(null);
    setShairs([{ line1: "", line2: "" }]);
  };

  // Live preview of parsed shairs
  const previewShairs = useMemo(() => {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const out: { line1: string; line2: string }[] = [];
    for (let i = 0; i < lines.length && out.length < MAX_SHAIRS; i += 2) {
      out.push({ line1: lines[i] ?? "", line2: lines[i + 1] ?? "" });
    }
    return out;
  }, [pasteText]);

  // ---------- Shair handlers ----------
  const handleAddShair = () => {
    if (shairs.length < MAX_SHAIRS) {
      setShairs([...shairs, { line1: "", line2: "" }]);
    }
  };

  const handleRemoveShair = (index: number) =>
    setShairs(shairs.filter((_, i) => i !== index));

  const handleShairLineChange = (
    index: number,
    key: "line1" | "line2",
    value: string
  ) => {
    const next = [...shairs];
    next[index] = { ...next[index], [key]: value };
    setShairs(next);
    // Keep paste textarea roughly in sync so it doesn't get out of step
    setPasteText(
      next.flatMap((s) => [s.line1, s.line2]).filter(Boolean).join("\n")
    );
  };

  // ---------- Link handlers ----------
  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setLinks([
        ...links,
        {
          title: newLinkTitle.trim(),
          url: newLinkUrl.trim(),
        },
      ]);
      setNewLinkTitle("");
      setNewLinkUrl("");
    }
  };

  const handleRemoveLink = (index: number) =>
    setLinks(links.filter((_, i) => i !== index));

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghazal) return;

    // Client-side guard for shairs
    const cleanShairs = shairs
      .map((s) => ({
        lines: [s.line1.trim(), s.line2.trim()],
      }))
      .filter((s) => s.lines[0] || s.lines[1]);

    if (cleanShairs.length < 1 || cleanShairs.length > MAX_SHAIRS) {
      const msg = `Content must have 1-${MAX_SHAIRS} shairs`;
      setError(msg);
      toast.error(msg, { style: { background: "#4A2B2B", color: "#FFF3EF" } });
      return;
    }

    for (let i = 0; i < cleanShairs.length; i++) {
      const [l1, l2] = cleanShairs[i].lines;
      for (const [j, line] of [l1, l2].entries()) {
        if (line.length < MIN_LINE_LENGTH || line.length > MAX_LINE_LENGTH) {
          const msg = `Shair #${i + 1}, line ${j + 1} must be ${MIN_LINE_LENGTH}-${MAX_LINE_LENGTH} chars`;
          setError(msg);
          toast.error(msg, { style: { background: "#4A2B2B", color: "#FFF3EF" } });
          return;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("takhallus", takhallus);
      formData.append("content", JSON.stringify(cleanShairs));
      formData.append(
        "categories",
        JSON.stringify(categories.split(",").map((c) => c.trim()).filter(Boolean))
      );
      formData.append("metaTitle", metaTitle);
      formData.append("metaDescription", metaDescription);
      formData.append("featured", String(featured));
      formData.append("links", JSON.stringify(links));

      if (coverImageFile) {
        formData.append("coverImage", coverImageFile);
      }
      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await axios.put(
        `/api/admin/dashboard/tarmeem/ghazal/${ghazal.slug}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (response.data.success) {
        toast.success("غزل اپ ڈیٹ ہوگئی!", {
          style: { background: "#2B4735", color: "#FFF3EF" },
        });
        onUpdate();
        onClose();
      } else {
        const msg = response.data.message || "Failed to update ghazal";
        setError(msg);
        toast.error(msg, { style: { background: "#4A2B2B", color: "#FFF3EF" } });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Network error";
      setError(msg);
      toast.error(msg, { style: { background: "#4A2B2B", color: "#FFF3EF" } });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ghazal) return null;

  return (
    <AnimatePresence>
      <motion.div
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
              Update Ghazal
            </h2>
            <button
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Takhallus (تخلص)
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
            </div>

            {/* ---------- Quick Paste Panel ---------- */}
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: `${COLORS.deepForest}30`,
                background: `${COLORS.warmWhite}60`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-sm font-medium"
                  style={{ color: COLORS.deepForest }}
                >
                  مکمل غزل ایک ساتھ پیسٹ کریں
                </label>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: `${COLORS.deepForest}15`,
                    color: COLORS.deepForest,
                  }}
                >
                  تجویز کردہ ⭐
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-2">
                ہر مصرع نئی سطر میں لکھیں۔ ہر دو مصرعوں سے ایک شعر بنے گا اور
                نیچے اشعار خودبخود اپ ڈیٹ ہو جائیں گے۔ (زیادہ سے زیادہ{" "}
                {MAX_SHAIRS} اشعار)
              </p>

              <textarea
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                rows={10}
                dir="rtl"
                placeholder={
                  "پہلا مصرع\nدوسرا مصرع\nتیسرا مصرع\nچوتھا مصرع\n..."
                }
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:outline-none font-urdu leading-[2.2]"
                style={{
                  borderColor: `${COLORS.deepForest}40`,
                  background: "#FFFFFF",
                }}
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs">
                  {pasteInfo && (
                    <span className="text-gray-600">
                      {pasteInfo.lines} مصرعے ← {pasteInfo.shairs} اشعار
                    </span>
                  )}
                  {pasteInfo?.odd && (
                    <span className="mr-3 text-amber-600">
                      ⚠ مصرعوں کی تعداد طاق ہے، آخری شعر کا دوسرا مصرع خالی ہے
                    </span>
                  )}
                  {pasteInfo?.truncated && (
                    <span className="mr-3 text-red-500">
                      ⚠ صرف پہلے {MAX_SHAIRS} اشعار لیے گئے ہیں
                    </span>
                  )}
                </div>
                {pasteText && (
                  <button
                    type="button"
                    onClick={clearPaste}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    صاف کریں
                  </button>
                )}
              </div>

              {/* Live preview of parsed shairs */}
              {previewShairs.length > 0 && (
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
                    پیش نظارہ ({previewShairs.length} اشعار)
                  </p>
                  <ol className="space-y-2 font-urdu leading-[2] text-sm">
                    {previewShairs.map((s, i) => (
                      <li
                        key={i}
                        className="border-r-2 pr-3"
                        style={{ borderColor: COLORS.tataBlue }}
                      >
                        <span
                          className="text-xs block mb-1"
                          style={{ color: COLORS.tataBlue }}
                        >
                          شعر #{i + 1}
                        </span>
                        <div>{s.line1}</div>
                        <div>{s.line2}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* ---------- Shairs (manual edit) ---------- */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Content (اشعار) — 1-{MAX_SHAIRS}
                </label>
                <button
                  type="button"
                  onClick={handleAddShair}
                  disabled={shairs.length >= MAX_SHAIRS}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                >
                  <PlusCircleIcon className="w-4 h-4" />
                  Add Shair
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {shairs.map((shair, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="text-xs font-semibold text-gray-500 w-6">
                      #{index + 1}
                    </span>

                    <input
                      type="text"
                      placeholder="مصرع اول"
                      value={shair.line1}
                      onChange={(e) =>
                        handleShairLineChange(index, "line1", e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-urdu"
                    />

                    <input
                      type="text"
                      placeholder="مصرع دوم"
                      value={shair.line2}
                      onChange={(e) =>
                        handleShairLineChange(index, "line2", e.target.value)
                      }
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-urdu"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveShair(index)}
                      className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors"
                      disabled={shairs.length <= 1}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories (زمرہ جات)
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External Links
              </label>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex gap-2 items-center text-sm">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Cover Image
                </label>
                {ghazal.coverImage && (
                  <img
                    src={ghazal.coverImage}
                    alt="Cover"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 mb-2"
                  />
                )}
                <label className="cursor-pointer block">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <PhotoIcon className="w-5 h-5" />
                    Replace Cover Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setCoverImageFile(e.target.files?.[0] || null)
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
                  Current Media ({ghazal.media?.length || 0} files)
                </label>
                <label className="cursor-pointer block">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <PlusCircleIcon className="w-5 h-5" />
                    Replace All Media (Max 20 files)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={(e) =>
                      setMediaFiles(Array.from(e.target.files || []))
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
                {loading ? "Updating..." : "Update Ghazal"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}