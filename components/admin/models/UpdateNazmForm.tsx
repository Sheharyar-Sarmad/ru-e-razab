// components/admin/models/UpdateNazmForm.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PhotoIcon, PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { COLORS } from "@/lib/colors";

interface Shair {
  lines: string[];
}

interface Band {
  shairs: Shair[];
}

interface LinkType {
  title: string;
  url: string;
  type?: string;
}

interface NazmData {
  _id: string;
  unwan: string;
  takhallus: string;
  content: Band[];
  category: string[];
  coverImage: string;
  coverImageMetadata?: any;
  media?: any[];
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

export default function UpdateNazmForm({ nazm, isOpen, onClose, onUpdate }: UpdateNazmFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [unwan, setUnwan] = useState("");
  const [takhallus, setTakhallus] = useState("");
  const [bands, setBands] = useState<Band[]>([{ shairs: [{ lines: ["", ""] }, { lines: ["", ""] }] }]);
  const [categories, setCategories] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  // Populate form when nazm changes
  useEffect(() => {
    if (nazm && isOpen) {
      setUnwan(nazm.unwan);
      setTakhallus(nazm.takhallus);
      setBands(nazm.content && Array.isArray(nazm.content) ? nazm.content : [{ shairs: [{ lines: ["", ""] }, { lines: ["", ""] }] }]);
      setCategories(nazm.category.join(", "));
      setMetaTitle(nazm.metaTitle || "");
      setMetaDescription(nazm.metaDescription || "");
      setFeatured(nazm.featured || false);
      setLinks(nazm.links || []);
      setPublishedAt(nazm.publishedAt ? new Date(nazm.publishedAt).toISOString().split("T")[0] : "");
      setCoverImageFile(null);
      setMediaFiles([]);
      setError(null);
    }
  }, [nazm, isOpen]);

  // ---------- Band & Shair handlers ----------
  const addBand = () => {
    setBands([...bands, { shairs: [{ lines: ["", ""] }, { lines: ["", ""] }] }]);
  };

  const removeBand = (index: number) => {
    if (bands.length > 1) {
      setBands(bands.filter((_, i) => i !== index));
    }
  };

  const addShair = (bandIndex: number) => {
    const newBands = [...bands];
    newBands[bandIndex].shairs.push({ lines: ["", ""] });
    setBands(newBands);
  };

  const removeShair = (bandIndex: number, shairIndex: number) => {
    const newBands = [...bands];
    if (newBands[bandIndex].shairs.length > 1) {
      newBands[bandIndex].shairs.splice(shairIndex, 1);
      setBands(newBands);
    }
  };

  const handleShairChange = (bandIndex: number, shairIndex: number, lineIndex: number, value: string) => {
    const newBands = [...bands];
    newBands[bandIndex].shairs[shairIndex].lines[lineIndex] = value;
    setBands(newBands);
  };

  // ---------- Link handlers ----------
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

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nazm) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("unwan", unwan);
      formData.append("takhallus", takhallus);
      formData.append("content", JSON.stringify(bands));
      formData.append("categories", JSON.stringify(categories.split(",").map(c => c.trim())));
      formData.append("metaTitle", metaTitle);
      formData.append("metaDescription", metaDescription);
      formData.append("featured", String(featured));
      formData.append("links", JSON.stringify(links));
      if (publishedAt) formData.append("publishedAt", publishedAt);

      if (coverImageFile) formData.append("coverImage", coverImageFile);
      mediaFiles.forEach(file => formData.append("media", file));

      const response = await axios.patch(
        `/api/admin/dashboard/tarmeem/nazm/${nazm.slug}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Nazm updated successfully!", {
          style: { background: "#2B4735", color: "#FFF3EF" },
          progressStyle: { background: "#A964FF" },
        });
        onUpdate();
        onClose();
      } else {
        const msg = response.data.message || "Failed to update nazm";
        setError(msg);
        toast.error(msg, {
          style: { background: "#4A2B2B", color: "#FFF3EF" },
          progressStyle: { background: "#BD4D23" },
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Network error";
      setError(msg);
      toast.error(msg, {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !nazm) return null;

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
            <h2 className="text-xl font-bold" style={{ color: COLORS.deepForest }}>
              Update Nazm
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content (Bands & Shairs) <span className="text-red-500">*</span>
              </label>
              {bands.map((band, bandIndex) => (
                <div key={bandIndex} className="p-4 mb-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-600">Band #{bandIndex + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeBand(bandIndex)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      disabled={bands.length <= 1}
                    >
                      Remove Band
                    </button>
                  </div>
                  {band.shairs.map((shair, shairIndex) => (
                    <div key={shairIndex} className="flex gap-2 items-center mb-2">
                      <span className="text-xs text-gray-400 w-6">S{shairIndex + 1}</span>
                      <input
                        type="text"
                        placeholder="First line"
                        value={shair.lines[0] || ""}
                        onChange={(e) => handleShairChange(bandIndex, shairIndex, 0, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Second line"
                        value={shair.lines[1] || ""}
                        onChange={(e) => handleShairChange(bandIndex, shairIndex, 1, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
                      />
                      {band.shairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeShair(bandIndex, shairIndex)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addShair(bandIndex)}
                    className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1"
                  >
                    <PlusCircleIcon className="w-4 h-4" /> Add Shair
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBand}
                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <PlusCircleIcon className="w-4 h-4" /> Add Band
              </button>
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

            {/* SEO */}
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

            {/* Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">External Links</label>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex gap-2 items-center text-sm">
                    <span className="flex-1 font-medium text-gray-700">{link.title}</span>
                    <span className="flex-1 text-gray-500 truncate">{link.url}</span>
                    <button type="button" onClick={() => handleRemoveLink(index)} className="text-red-500 hover:text-red-700">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Cover Image</label>
                {nazm.coverImage && (
                  <img src={nazm.coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg border border-gray-200 mb-2" />
                )}
                <label className="cursor-pointer block">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <PhotoIcon className="w-5 h-5" /> Replace Cover Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {coverImageFile && <span className="text-xs text-gray-500 mt-1 block">{coverImageFile.name}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Media ({nazm.media?.length || 0} files)
                </label>
                <label className="cursor-pointer block">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <PlusCircleIcon className="w-5 h-5" /> Add / Replace Media (Max 20 files)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                    className="hidden"
                  />
                </label>
                {mediaFiles.length > 0 && <span className="text-xs text-gray-500 mt-1 block">{mediaFiles.length} new file(s) selected</span>}
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
                style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
              >
                {loading ? "Updating..." : "Update Nazm"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}