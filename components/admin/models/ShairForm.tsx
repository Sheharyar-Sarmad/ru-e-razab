// components/admin/jadeed-kalam/ShairForm.tsx
"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { COLORS } from "@/lib/colors";
import Modal from "./SharedKalamModel";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDropzone } from "react-dropzone";

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for cover image
const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB for other media
const MAX_MEDIA_FILES = 20;

const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif"];
const ALLOWED_MEDIA_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jfif", "image/svg+xml", "image/bmp", "image/tiff"],
  video: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/3gpp", "video/mpeg"],
  audio: ["audio/mpeg", "audio/ogg", "audio/wav", "audio/webm", "audio/aac", "audio/flac", "audio/mp4"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
             "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
             "text/plain", "text/csv", "application/json", "application/xml"]
};

const ALLOWED_MEDIA_TYPES_FLAT = Object.values(ALLOWED_MEDIA_TYPES).flat();

// Zod Schema
const schema = z.object({
  takhallus: z.string().min(2, "کم از کم 2 حروف").max(50, "زیادہ سے زیادہ 50 حروف"),
  content: z
    .array(
      z.string().min(2, "کم از کم 2 حروف").max(300, "زیادہ سے زیادہ 300 حروف")
    )
    .length(2, "شعر میں بالکل 2 مصرعے ہونے چاہئیں"),
  categories: z.array(z.string()).min(1, "کم از کم 1 زمرہ").max(10, "زیادہ سے زیادہ 10 زمرے"),
  coverImage: z
    .any()
    .refine((file) => file && file.size <= MAX_IMAGE_SIZE, "تصویر کا سائز 5MB سے کم ہونا چاہیے")
    .refine(
      (file) => file && ALLOWED_COVER_TYPES.includes(file.type),
      "صرف JPEG, PNG, WEBP, GIF, JFIF کی اجازت ہے"
    ),
  metaTitle: z.string().max(60, "زیادہ سے زیادہ 60 حروف").optional(),
  metaDescription: z.string().max(160, "زیادہ سے زیادہ 160 حروف").optional(),
  featured: z.boolean().optional(),
  links: z
    .array(
      z.object({
        title: z.string().min(1, "عنوان درکار ہے").max(100, "زیادہ سے زیادہ 100 حروف"),
        url: z.string().url("درست URL درج کریں").max(500, "زیادہ سے زیادہ 500 حروف"),
        type: z.enum(["spotify", "youtube", "wikipedia", "website", "social", "other"]).optional(),
      })
    )
    .max(5, "زیادہ سے زیادہ 5 لنکس")
    .optional(),
});

type FormData = z.infer<typeof schema>;

interface MediaFileWithPreview extends File {
  preview?: string;
  id?: string;
}

interface ShairFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShairForm({ isOpen, onClose }: ShairFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFileWithPreview[]>([]);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      content: ["", ""],
      categories: [],
      links: [],
      featured: false,
    },
  });

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
    control,
    name: "links",
  });

  // Dropzone for media files
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random()}`
      })
    );
    
    setMediaFiles(prev => {
      const total = prev.length + newFiles.length;
      if (total > MAX_MEDIA_FILES) {
        toast.error(`زیادہ سے زیادہ ${MAX_MEDIA_FILES} فائلیں اپ لوڈ کی جا سکتی ہیں`, {
          style: {
            background: "#4A2B2B",
            color: "#FFF3EF",
          },
          progressStyle: {
            background: "#BD4D23",
          },
        });
        return prev;
      }
      return [...prev, ...newFiles];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_MEDIA_TYPES_FLAT.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_MEDIA_SIZE,
    multiple: true,
  });

  // Handle cover image change
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("coverImage", file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove media file
  const removeMediaFile = (id: string) => {
    setMediaFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  // Get media type icon
  const getMediaIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return (
        <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (file.type.startsWith('video/')) {
      return (
        <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (file.type.startsWith('audio/')) {
      return (
        <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    return (
      <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("takhallus", data.takhallus);
    formData.append("content", JSON.stringify(data.content));
    formData.append("categories", JSON.stringify(data.categories));
    formData.append("coverImage", data.coverImage);
    
    // Append media files
    mediaFiles.forEach(file => {
      formData.append("media", file);
    });
    
    if (data.metaTitle) formData.append("metaTitle", data.metaTitle);
    if (data.metaDescription) formData.append("metaDescription", data.metaDescription);
    if (data.featured) formData.append("featured", "true");
    if (data.links && data.links.length > 0) {
      formData.append("links", JSON.stringify(data.links));
    }

    try {
      const response = await axios.post("/api/admin/dashboard/jadeed/shair", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        timeout: 120000, // 2 minutes for large file uploads
      });
      
      if (response.data.success) {
        toast.success("شعر تخلیق ہوگیا! 🎉", {
          style: {
            background: "#2B4735",
            color: "#FFF3EF",
          },
          progressStyle: {
            background: "#A964FF",
          },
        });
        
        // Reset form
        reset();
        setMediaFiles([]);
        setCoverImagePreview(null);
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        toast.error(response.data.message || "کچھ غلط ہو گیا", {
          style: {
            background: "#4A2B2B",
            color: "#FFF3EF",
          },
          progressStyle: {
            background: "#BD4D23",
          },
        });
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      const msg = error.response?.data?.message || 
                  error.message || 
                  "نیٹ ورک کی خرابی";
      toast.error(msg, {
        style: {
          background: "#4A2B2B",
          color: "#FFF3EF",
        },
        progressStyle: {
          background: "#BD4D23",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="نیا شعر تخلیق کریں">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
          {/* Takhallus */}
          <div>
            <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
              تخلس <span className="text-red-500">*</span>
            </label>
            <input
              {...register("takhallus")}
              className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none font-urdu"
              style={{
                borderColor: errors.takhallus ? "#ef4444" : `${COLORS.deepForest}40`,
                background: `${COLORS.warmWhite}40`,
              }}
              placeholder="مثال: رَضَب تَبْریز"
            />
            {errors.takhallus && <p className="mt-1 text-sm text-red-500">{errors.takhallus.message}</p>}
          </div>

          {/* Content – exactly 2 lines */}
          <div>
            <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
              مصرعے <span className="text-red-500">*</span> (بالکل 2)
            </label>
            <div className="mt-2 space-y-3">
              <input
                {...register("content.0")}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none font-urdu"
                style={{
                  borderColor: errors.content?.[0] ? "#ef4444" : `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="پہلا مصرع"
              />
              <input
                {...register("content.1")}
                className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none font-urdu"
                style={{
                  borderColor: errors.content?.[1] ? "#ef4444" : `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="دوسرا مصرع"
              />
            </div>
            {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content.message}</p>}
            {errors.content?.[0] && <p className="mt-1 text-sm text-red-500">{errors.content[0].message}</p>}
            {errors.content?.[1] && <p className="mt-1 text-sm text-red-500">{errors.content[1].message}</p>}
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
              زمرہ جات <span className="text-red-500">*</span> (کاما سے الگ کریں)
            </label>
            <Controller
              control={control}
              name="categories"
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value.join(", ")}
                  onChange={(e) =>
                    field.onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                  }
                  className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none font-urdu"
                  style={{
                    borderColor: errors.categories ? "#ef4444" : `${COLORS.deepForest}40`,
                    background: `${COLORS.warmWhite}40`,
                  }}
                  placeholder="مثال: کلاسیک, رومانوی"
                />
              )}
            />
            {errors.categories && <p className="mt-1 text-sm text-red-500">{errors.categories.message}</p>}
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
              سرورق کی تصویر <span className="text-red-500">*</span> (زیادہ سے زیادہ 5MB)
            </label>
            <div
              className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
              style={{
                borderColor: errors.coverImage ? "#ef4444" : `${COLORS.deepForest}40`,
                background: `${COLORS.warmWhite}40`,
              }}
              onClick={() => document.getElementById('coverImage')?.click()}
            >
              <input
                id="coverImage"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/jfif"
                onChange={handleCoverImageChange}
                className="hidden"
              />
              {coverImagePreview ? (
                <div>
                  <img 
                    src={coverImagePreview} 
                    alt="Cover" 
                    className="max-h-48 mx-auto object-contain"
                  />
                  <p className="mt-2 text-sm text-gray-600">تصویر تبدیل کرنے کے لیے کلک کریں</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">سرورق کی تصویر اپ لوڈ کریں</p>
                  <p className="text-xs text-gray-500">JPEG, PNG, WEBP, GIF (زیادہ سے زیادہ 5MB)</p>
                </div>
              )}
            </div>
            {errors.coverImage && <p className="mt-1 text-sm text-red-500">{errors.coverImage.message}</p>}
          </div>

          {/* Media Files - Images, Videos, Audio, Documents */}
          <div>
            <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
              میڈیا فائلیں (اختیاری - تصاویر، ویڈیوز، آڈیو، دستاویزات)
            </label>
            <div
              {...getRootProps()}
              className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : ''
              }`}
              style={{
                borderColor: `${COLORS.deepForest}40`,
                background: `${COLORS.warmWhite}40`,
              }}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-blue-500">فائلیں یہاں ڈراپ کریں...</p>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    کلک کریں یا ڈریگ & ڈراپ کریں
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    تصاویر: JPEG, PNG, WEBP, GIF | ویڈیوز: MP4, WEBM, OGG | آڈیو: MP3, WAV, OGG | دستاویزات: PDF, DOC, DOCX, TXT
                  </p>
                  <p className="text-xs text-gray-500">زیادہ سے زیادہ {MAX_MEDIA_FILES} فائلیں، {formatFileSize(MAX_MEDIA_SIZE)} فی فائل</p>
                </div>
              )}
            </div>

            {/* Media Files Preview */}
            {mediaFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mediaFiles.map((file) => (
                  <div key={file.id} className="relative border rounded-lg p-2 group" style={{ borderColor: `${COLORS.deepForest}20` }}>
                    {/* Preview */}
                    <div className="h-24 w-full flex items-center justify-center bg-gray-50 rounded">
                      {file.type.startsWith('image/') && file.preview && (
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="h-full w-full object-cover rounded"
                        />
                      )}
                      {file.type.startsWith('video/') && (
                        <video 
                          src={file.preview} 
                          className="h-full w-full object-cover rounded"
                          controls={false}
                        />
                      )}
                      {file.type.startsWith('audio/') && (
                        <div className="flex flex-col items-center">
                          {getMediaIcon(file)}
                          <div className="mt-1 text-xs text-gray-500 text-center">🎵 آڈیو</div>
                        </div>
                      )}
                      {file.type.startsWith('application/') && (
                        <div className="flex flex-col items-center">
                          {getMediaIcon(file)}
                          <div className="mt-1 text-xs text-gray-500 text-center">📄 دستاویز</div>
                        </div>
                      )}
                    </div>
                    
                    {/* File info */}
                    <div className="mt-1">
                      <p className="text-xs truncate font-medium" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeMediaFile(file.id!)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
                میٹا ٹائٹل (اختیاری، زیادہ سے زیادہ 60 حروف)
              </label>
              <input
                {...register("metaTitle")}
                className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none font-urdu"
                style={{
                  borderColor: `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="خودکار جنریٹ ہوگا اگر خالی چھوڑیں"
              />
              {errors.metaTitle && <p className="mt-1 text-sm text-red-500">{errors.metaTitle.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
                میٹا ڈسکرپشن (اختیاری، زیادہ سے زیادہ 160 حروف)
              </label>
              <input
                {...register("metaDescription")}
                className="mt-1 w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none font-urdu"
                style={{
                  borderColor: `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="خودکار جنریٹ ہوگا اگر خالی چھوڑیں"
              />
              {errors.metaDescription && <p className="mt-1 text-sm text-red-500">{errors.metaDescription.message}</p>}
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("featured")}
              className="w-4 h-4 rounded"
              style={{ accentColor: COLORS.deepForest }}
            />
            <label className="text-sm font-medium" style={{ color: COLORS.deepForest }}>
              نمایاں کریں (Featured)
            </label>
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" style={{ color: COLORS.deepForest }}>
                لنکس (اختیاری، زیادہ سے زیادہ 5)
              </label>
              {linkFields.length < 5 && (
                <button
                  type="button"
                  onClick={() => appendLink({ title: "", url: "", type: "website" })}
                  className="text-sm px-3 py-1 rounded-full transition-colors"
                  style={{
                    background: `${COLORS.softAmethyst}20`,
                    color: COLORS.softAmethyst,
                  }}
                >
                  + لنک شامل کریں
                </button>
              )}
            </div>
            {linkFields.map((field, index) => (
              <div key={field.id} className="mt-2 p-3 rounded-lg border" style={{ borderColor: `${COLORS.deepForest}20` }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    {...register(`links.${index}.title`)}
                    className="flex-1 min-w-[100px] px-3 py-1 rounded border focus:ring-2 focus:outline-none font-urdu"
                    style={{
                      borderColor: `${COLORS.deepForest}40`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                    placeholder="عنوان"
                  />
                  <input
                    {...register(`links.${index}.url`)}
                    className="flex-1 min-w-[150px] px-3 py-1 rounded border focus:ring-2 focus:outline-none font-urdu"
                    style={{
                      borderColor: `${COLORS.deepForest}40`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                    placeholder="URL"
                  />
                  <select
                    {...register(`links.${index}.type`)}
                    className="px-3 py-1 rounded border focus:ring-2 focus:outline-none"
                    style={{
                      borderColor: `${COLORS.deepForest}40`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                  >
                    <option value="website">Website</option>
                    <option value="spotify">Spotify</option>
                    <option value="youtube">YouTube</option>
                    <option value="wikipedia">Wikipedia</option>
                    <option value="social">Social</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                {errors.links?.[index] && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.links[index].title?.message || errors.links[index].url?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Sticky Submit Button */}
          <div
            className="sticky bottom-0 flex items-center gap-4 pt-4 pb-2 border-t mt-4"
            style={{
              borderColor: `${COLORS.deepForest}20`,
              background: `linear-gradient(180deg, transparent, ${COLORS.warmWhite} 20%, ${COLORS.warmWhite})`,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg text-black font-medium 
               transition-shadow duration-300 delay-100 
               disabled:opacity-50 hover:shadow-lg hover:border-0.5"
              style={{
                background: `linear-gradient(135deg, ${COLORS.deepForest}, ${COLORS.darkEmerald})`,
              }}
            >
              {isSubmitting ? "تخلیق ہو رہی ہے..." : "تخلیق کریں"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-black font-medium hover:bg-gray-100 transition-colors"
            >
              منسوخ کریں
            </button>
            {mediaFiles.length > 0 && (
              <span className="text-sm text-gray-500 mr-auto">
                {mediaFiles.length} فائل{mediaFiles.length > 1 ? 'یں' : ''} منتخب
              </span>
            )}
          </div>
        </form>
      </Modal>

      {/* Toast Container */}
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
    </>
  );
}