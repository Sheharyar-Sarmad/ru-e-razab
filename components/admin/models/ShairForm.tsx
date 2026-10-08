// components/admin/jadeed-kalam/ShairForm.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { COLORS } from "@/lib/colors";
import Modal from "./SharedKalamModel";
import {
  useForm,
  useFieldArray,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDropzone, type Accept } from "react-dropzone";

// ============================================================
// Constants
// ============================================================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_MEDIA_FILES = 20;

const ALLOWED_COVER_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jfif",
] as const;

const ALLOWED_MEDIA_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jfif",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/3gpp",
    "video/mpeg",
  ],
  audio: [
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/aac",
    "audio/flac",
    "audio/mp4",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/json",
    "application/xml",
  ],
} as const;

// react-dropzone expects Accept:
// Record<string, string[]>
const DROPZONE_ACCEPT: Accept = {
  "image/jpeg": [],
  "image/png": [],
  "image/webp": [],
  "image/gif": [],
  "image/jfif": [],
  "image/svg+xml": [],
  "image/bmp": [],
  "image/tiff": [],

  "video/mp4": [],
  "video/webm": [],
  "video/ogg": [],
  "video/quicktime": [],
  "video/x-msvideo": [],
  "video/x-matroska": [],
  "video/3gpp": [],
  "video/mpeg": [],

  "audio/mpeg": [],
  "audio/ogg": [],
  "audio/wav": [],
  "audio/webm": [],
  "audio/aac": [],
  "audio/flac": [],
  "audio/mp4": [],

  "application/pdf": [],
  "application/msword": [],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    [],
  "application/vnd.ms-excel": [],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
  "text/plain": [],
  "text/csv": [],
  "application/json": [],
  "application/xml": [],
};

// ============================================================
// Zod Schema
// ============================================================

const linkSchema = z.object({
  title: z
    .string()
    .min(1, "عنوان درکار ہے")
    .max(100, "زیادہ سے زیادہ 100 حروف"),

  url: z
    .string()
    .min(1, "URL درکار ہے")
    .url("درست URL درج کریں")
    .max(500, "زیادہ سے زیادہ 500 حروف"),

  type: z
    .enum([
      "spotify",
      "youtube",
      "wikipedia",
      "website",
      "social",
      "other",
    ])
    .optional(),
});

const schema = z.object({
  takhallus: z
    .string()
    .min(2, "کم از کم 2 حروف")
    .max(50, "زیادہ سے زیادہ 50 حروف"),

  content: z
    .array(
      z
        .string()
        .min(2, "کم از کم 2 حروف")
        .max(300, "زیادہ سے زیادہ 300 حروف")
    )
    .length(2, "شعر میں بالکل 2 مصرعے ہونے چاہئیں"),

  categories: z
    .array(z.string())
    .min(1, "کم از کم 1 زمرہ")
    .max(10, "زیادہ سے زیادہ 10 زمرے"),

  coverImage: z
    .custom<File>(
      (file) =>
        typeof File !== "undefined" &&
        file instanceof File,
      "سرورق کی تصویر درکار ہے"
    )
    .refine(
      (file) => file.size <= MAX_IMAGE_SIZE,
      "تصویر کا سائز 5MB سے کم ہونا چاہیے"
    )
    .refine(
      (file) =>
        ALLOWED_COVER_TYPES.includes(
          file.type as (typeof ALLOWED_COVER_TYPES)[number]
        ),
      "صرف JPEG, PNG, WEBP, GIF, JFIF کی اجازت ہے"
    ),

  metaTitle: z
    .string()
    .max(60, "زیادہ سے زیادہ 60 حروف")
    .optional(),

  metaDescription: z
    .string()
    .max(160, "زیادہ سے زیادہ 160 حروف")
    .optional(),

  featured: z.boolean().optional(),

  links: z
    .array(linkSchema)
    .max(5, "زیادہ سے زیادہ 5 لنکس")
    .optional(),
});

type FormData = z.infer<typeof schema>;

// ============================================================
// Types
// ============================================================

interface MediaFileWithPreview extends File {
  preview: string;
  id: string;
}

interface ShairFormProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export default function ShairForm({
  isOpen,
  onClose,
}: ShairFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<
    MediaFileWithPreview[]
  >([]);
  const [coverImagePreview, setCoverImagePreview] = useState<
    string | null
  >(null);

  // Quick paste panel state
  const [pasteText, setPasteText] = useState("");
  const [pasteInfo, setPasteInfo] = useState<{
    lines: number;
    tooFew: boolean;
    tooMany: boolean;
  } | null>(null);

  // ==========================================================
  // React Hook Form
  // ==========================================================

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      takhallus: "",
      content: ["", ""],
      categories: [],
      coverImage: undefined as unknown as File,
      metaTitle: "",
      metaDescription: "",
      featured: false,
      links: [],
    },
  });

  // ==========================================================
  // Links Field Array
  // ==========================================================

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control,
    name: "links",
  });

  // ==========================================================
  // Quick Paste (2 lines = 1 شعر)
  // ==========================================================

  const handlePasteChange = (text: string) => {
    setPasteText(text);

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    setValue("content.0", lines[0] ?? "", { shouldDirty: true });
    setValue("content.1", lines[1] ?? "", { shouldDirty: true });

    if (lines.length === 0) {
      setPasteInfo(null);
      return;
    }

    setPasteInfo({
      lines: lines.length,
      tooFew: lines.length < 2,
      tooMany: lines.length > 2,
    });
  };

  const clearPaste = () => {
    setPasteText("");
    setPasteInfo(null);
    setValue("content.0", "", { shouldDirty: true });
    setValue("content.1", "", { shouldDirty: true });
  };

  // ==========================================================
  // Toast Styles
  // ==========================================================

  const showErrorToast = (message: string) => {
    toast.error(message, {
      style: {
        background: "#4A2B2B",
        color: "#FFF3EF",
      },
    });
  };

  const showSuccessToast = (message: string) => {
    toast.success(message, {
      style: {
        background: "#2B4735",
        color: "#FFF3EF",
      },
    });
  };

  // ==========================================================
  // Media Dropzone
  // ==========================================================

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return;
      }

      const remainingSlots =
        MAX_MEDIA_FILES - mediaFiles.length;

      if (remainingSlots <= 0) {
        showErrorToast(
          `زیادہ سے زیادہ ${MAX_MEDIA_FILES} فائلیں اپ لوڈ کی جا سکتی ہیں`
        );
        return;
      }

      const filesToAdd = acceptedFiles.slice(
        0,
        remainingSlots
      );

      if (acceptedFiles.length > remainingSlots) {
        showErrorToast(
          `صرف ${remainingSlots} مزید فائلیں شامل کی جا سکتی ہیں`
        );
      }

      const newFiles: MediaFileWithPreview[] =
        filesToAdd.map((file) => {
          const fileWithPreview =
            file as MediaFileWithPreview;

          Object.defineProperties(fileWithPreview, {
            preview: {
              value: URL.createObjectURL(file),
              writable: true,
              enumerable: true,
            },
            id: {
              value: `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,
              writable: true,
              enumerable: true,
            },
          });

          return fileWithPreview;
        });

      setMediaFiles((prev) => [...prev, ...newFiles]);
    },
    [mediaFiles.length]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    accept: DROPZONE_ACCEPT,
    maxSize: MAX_MEDIA_SIZE,
    multiple: true,

    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(({ file, errors }) => {
        const errorMessage =
          errors[0]?.code === "file-too-large"
            ? `${file.name}: فائل کا سائز ${formatFileSize(
                MAX_MEDIA_SIZE
              )} سے زیادہ ہے`
            : `${file.name}: اس فائل کی قسم کی اجازت نہیں ہے`;

        showErrorToast(errorMessage);
      });
    },
  });

  // ==========================================================
  // Cover Image
  // ==========================================================

  const handleCoverImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showErrorToast(
        "تصویر کا سائز 5MB سے کم ہونا چاہیے"
      );

      event.target.value = "";
      return;
    }

    if (
      !ALLOWED_COVER_TYPES.includes(
        file.type as (typeof ALLOWED_COVER_TYPES)[number]
      )
    ) {
      showErrorToast(
        "صرف JPEG, PNG, WEBP, GIF, JFIF کی اجازت ہے"
      );

      event.target.value = "";
      return;
    }

    setValue("coverImage", file, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;

      if (typeof result === "string") {
        setCoverImagePreview(result);
      }
    };

    reader.readAsDataURL(file);
  };

  // ==========================================================
  // Remove Media
  // ==========================================================

  const removeMediaFile = (id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((item) => item.id === id);

      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  // ==========================================================
  // Media Icon
  // ==========================================================

  const getMediaIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return (
        <svg
          className="h-8 w-8 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    }

    if (file.type.startsWith("video/")) {
      return (
        <svg
          className="h-8 w-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );
    }

    if (file.type.startsWith("audio/")) {
      return (
        <svg
          className="h-8 w-8 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      );
    }

    return (
      <svg
        className="h-8 w-8 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  };

  // ==========================================================
  // File Size
  // ==========================================================

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(
      bytes /
      (1024 * 1024 * 1024)
    ).toFixed(1)} GB`;
  }

  // ==========================================================
  // Submit
  // ==========================================================

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("takhallus", data.takhallus);

      formData.append(
        "content",
        JSON.stringify(data.content)
      );

      formData.append(
        "categories",
        JSON.stringify(data.categories)
      );

      formData.append("coverImage", data.coverImage);

      // Media files
      mediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      // Optional metadata
      if (data.metaTitle?.trim()) {
        formData.append(
          "metaTitle",
          data.metaTitle.trim()
        );
      }

      if (data.metaDescription?.trim()) {
        formData.append(
          "metaDescription",
          data.metaDescription.trim()
        );
      }

      // Featured
      formData.append(
        "featured",
        data.featured ? "true" : "false"
      );

      // Links
      if (data.links && data.links.length > 0) {
        formData.append(
          "links",
          JSON.stringify(data.links)
        );
      }

      const response = await axios.post(
        "/api/admin/dashboard/jadeed/shair",
        formData,
        {
          withCredentials: true,
          timeout: 120000,
        }
      );

      if (response.data?.success) {
        showSuccessToast("شعر تخلیق ہوگیا! 🎉");

        // Revoke media preview URLs
        mediaFiles.forEach((file) => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });

        reset();

        setMediaFiles([]);
        setCoverImagePreview(null);
        setPasteText("");
        setPasteInfo(null);

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        showErrorToast(
          response.data?.message ||
            "کچھ غلط ہو گیا"
        );
      }
    } catch (error: unknown) {
      console.error(
        "Form submission error:",
        error
      );

      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ||
          error.message ||
          "نیٹ ورک کی خرابی";

        showErrorToast(message);
      } else if (error instanceof Error) {
        showErrorToast(error.message);
      } else {
        showErrorToast("کچھ غلط ہو گیا");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // Cleanup Preview URLs
  // ==========================================================

  useEffect(() => {
    return () => {
      mediaFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [mediaFiles]);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="نیا شعر تخلیق کریں"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          dir="rtl"
        >
          {/* ==================================================
              Takhallus
          ================================================== */}

          <div>
            <label
              className="block text-sm font-medium"
              style={{
                color: COLORS.deepForest,
              }}
            >
              تخلص{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              {...register("takhallus")}
              className="mt-1 w-full rounded-lg border px-4 py-2 font-urdu focus:ring-2 focus:outline-none"
              style={{
                borderColor: errors.takhallus
                  ? "#ef4444"
                  : `${COLORS.deepForest}40`,
                background: `${COLORS.warmWhite}40`,
              }}
              placeholder="مثال: رزبؔ تبریز"
            />

            {errors.takhallus?.message && (
              <p className="mt-1 text-sm text-red-500">
                {errors.takhallus.message}
              </p>
            )}
          </div>

          {/* ==================================================
              Quick Paste Panel (Recommended)
          ================================================== */}

          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: `${COLORS.deepForest}30`,
              background: `${COLORS.warmWhite}60`,
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <label
                className="text-sm font-medium"
                style={{ color: COLORS.deepForest }}
              >
                مکمل شعر ایک ساتھ پیسٹ کریں
              </label>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: `${COLORS.deepForest}15`,
                  color: COLORS.deepForest,
                }}
              >
                تجویز کردہ ⭐
              </span>
            </div>

            <p className="mb-2 text-xs text-gray-500">
              دونوں مصرعے پیسٹ کریں (ہر مصرع نئی سطر میں)۔ نیچے دونوں خانے
              خودبخود بھر جائیں گے۔
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              rows={4}
              dir="rtl"
              placeholder={"پہلا مصرع\nدوسرا مصرع"}
              className="w-full rounded-lg border px-4 py-3 font-urdu leading-[2.2] focus:ring-2 focus:outline-none"
              style={{
                borderColor: `${COLORS.deepForest}40`,
                background: "#FFFFFF",
              }}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                {pasteInfo && (
                  <span className="text-gray-600">
                    {pasteInfo.lines} مصرعے
                  </span>
                )}
                {pasteInfo?.tooFew && (
                  <span className="mr-3 text-amber-600">
                    ⚠ صرف 1 مصرع ملا، دوسرا مصرع خالی ہے
                  </span>
                )}
                {pasteInfo?.tooMany && (
                  <span className="mr-3 text-red-500">
                    ⚠ صرف پہلے 2 مصرعے لیے گئے ہیں
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
          </div>

          {/* ==================================================
              Content
          ================================================== */}

          <div>
            <label
              className="block text-sm font-medium"
              style={{
                color: COLORS.deepForest,
              }}
            >
              مصرعے{" "}
              <span className="text-red-500">*</span>{" "}
              (بالکل 2)
            </label>

            <div className="mt-2 space-y-3">
              <input
                {...register("content.0")}
                className="w-full rounded-lg border px-4 py-2 font-urdu focus:ring-2 focus:outline-none"
                style={{
                  borderColor: errors.content?.[0]
                    ? "#ef4444"
                    : `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="پہلا مصرع"
              />

              <input
                {...register("content.1")}
                className="w-full rounded-lg border px-4 py-2 font-urdu focus:ring-2 focus:outline-none"
                style={{
                  borderColor: errors.content?.[1]
                    ? "#ef4444"
                    : `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="دوسرا مصرع"
              />
            </div>

            {errors.content?.root?.message && (
              <p className="mt-1 text-sm text-red-500">
                {errors.content.root.message}
              </p>
            )}

            {errors.content?.[0]?.message && (
              <p className="mt-1 text-sm text-red-500">
                {errors.content[0].message}
              </p>
            )}

            {errors.content?.[1]?.message && (
              <p className="mt-1 text-sm text-red-500">
                {errors.content[1].message}
              </p>
            )}
          </div>

          {/* ==================================================
              Categories
          ================================================== */}

          <div>
            <label
              className="block text-sm font-medium"
              style={{
                color: COLORS.deepForest,
              }}
            >
              زمرہ جات{" "}
              <span className="text-red-500">*</span>{" "}
              (کاما سے الگ کریں)
            </label>

            <Controller
              control={control}
              name="categories"
              render={({ field }) => (
                <input
                  value={field.value.join(", ")}
                  onChange={(event) => {
                    const categories =
                      event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean);

                    field.onChange(categories);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className="mt-1 w-full rounded-lg border px-4 py-2 font-urdu focus:ring-2 focus:outline-none"
                  style={{
                    borderColor: errors.categories
                      ? "#ef4444"
                      : `${COLORS.deepForest}40`,
                    background: `${COLORS.warmWhite}40`,
                  }}
                  placeholder="مثال: کلاسیک, رومانوی"
                />
              )}
            />

            {errors.categories?.message && (
              <p className="mt-1 text-sm text-red-500">
                {errors.categories.message}
              </p>
            )}
          </div>

          {/* ==================================================
              Cover Image
          ================================================== */}

          <div>
            <label
              className="block text-sm font-medium"
              style={{
                color: COLORS.deepForest,
              }}
            >
              سرورق کی تصویر{" "}
              <span className="text-red-500">*</span>{" "}
              (زیادہ سے زیادہ 5MB)
            </label>

            <div
              className="mt-1 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors hover:border-blue-500"
              style={{
                borderColor: errors.coverImage
                  ? "#ef4444"
                  : `${COLORS.deepForest}40`,
                background: `${COLORS.warmWhite}40`,
              }}
              onClick={() =>
                document
                  .getElementById("coverImage")
                  ?.click()
              }
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
                    alt="Cover preview"
                    className="mx-auto max-h-48 object-contain"
                  />

                  <p className="mt-2 text-sm text-gray-600">
                    تصویر تبدیل کرنے کے لیے کلک کریں
                  </p>
                </div>
              ) : (
                <div>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <p className="mt-2 text-sm text-gray-600">
                    سرورق کی تصویر اپ لوڈ کریں
                  </p>

                  <p className="text-xs text-gray-500">
                    JPEG, PNG, WEBP, GIF
                    <br />
                    زیادہ سے زیادہ 5MB
                  </p>
                </div>
              )}
            </div>

            {errors.coverImage?.message && (
              <p className="mt-1 text-sm text-red-500">
                {errors.coverImage.message}
              </p>
            )}
          </div>

          {/* ==================================================
              Media Files
          ================================================== */}

          <div>
            <label
              className="block text-sm font-medium"
              style={{
                color: COLORS.deepForest,
              }}
            >
              میڈیا فائلیں (اختیاری - تصاویر، ویڈیوز،
              آڈیو، دستاویزات)
            </label>

            <div
              {...getRootProps()}
              className={`mt-1 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : ""
              }`}
              style={{
                borderColor: `${COLORS.deepForest}40`,
                background: `${COLORS.warmWhite}40`,
              }}
            >
              <input {...getInputProps()} />

              {isDragActive ? (
                <p className="text-blue-500">
                  فائلیں یہاں ڈراپ کریں...
                </p>
              ) : (
                <div>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <p className="mt-2 text-sm text-gray-600">
                    کلک کریں یا ڈریگ & ڈراپ کریں
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    تصاویر: JPEG, PNG, WEBP, GIF |
                    ویڈیوز: MP4, WEBM, OGG |
                    آڈیو: MP3, WAV, OGG |
                    دستاویزات: PDF, DOC, DOCX, TXT
                  </p>

                  <p className="text-xs text-gray-500">
                    زیادہ سے زیادہ {MAX_MEDIA_FILES} فائلیں،
                    {" "}
                    {formatFileSize(MAX_MEDIA_SIZE)} فی فائل
                  </p>
                </div>
              )}
            </div>

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {mediaFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group relative rounded-lg border p-2"
                    style={{
                      borderColor: `${COLORS.deepForest}20`,
                    }}
                  >
                    <div className="flex h-24 w-full items-center justify-center rounded bg-gray-50">
                      {file.type.startsWith("image/") && (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-full w-full rounded object-cover"
                        />
                      )}

                      {file.type.startsWith("video/") && (
                        <video
                          src={file.preview}
                          className="h-full w-full rounded object-cover"
                          controls={false}
                          muted
                        />
                      )}

                      {file.type.startsWith("audio/") && (
                        <div className="flex flex-col items-center">
                          {getMediaIcon(file)}

                          <div className="mt-1 text-center text-xs text-gray-500">
                            آڈیو
                          </div>
                        </div>
                      )}

                      {!file.type.startsWith("image/") &&
                        !file.type.startsWith("video/") &&
                        !file.type.startsWith("audio/") && (
                          <div className="flex flex-col items-center">
                            {getMediaIcon(file)}

                            <div className="mt-1 text-center text-xs text-gray-500">
                              دستاویز
                            </div>
                          </div>
                        )}
                    </div>

                    {/* File Info */}
                    <div className="mt-1">
                      <p
                        className="truncate text-xs font-medium"
                        title={file.name}
                      >
                        {file.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeMediaFile(file.id);
                      }}
                      className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              Meta Fields
          ================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                className="block text-sm font-medium"
                style={{
                  color: COLORS.deepForest,
                }}
              >
                میٹا ٹائٹل (اختیاری، زیادہ سے زیادہ 60 حروف)
              </label>

              <input
                {...register("metaTitle")}
                className="mt-1 w-full rounded-lg border px-4 py-2 font-urdu focus:ring-2 focus:outline-none"
                style={{
                  borderColor: `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="خودکار جنریٹ ہوگا اگر خالی چھوڑیں"
              />

              {errors.metaTitle?.message && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.metaTitle.message}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium"
                style={{
                  color: COLORS.deepForest,
                }}
              >
                میٹا ڈسکرپشن (اختیاری، زیادہ سے زیادہ 160 حروف)
              </label>

              <input
                {...register("metaDescription")}
                className="mt-1 w-full rounded-lg border px-4 py-2 font-urdu focus:ring-2 focus:outline-none"
                style={{
                  borderColor: `${COLORS.deepForest}40`,
                  background: `${COLORS.warmWhite}40`,
                }}
                placeholder="خودکار جنریٹ ہوگا اگر خالی چھوڑیں"
              />

              {errors.metaDescription?.message && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.metaDescription.message}
                </p>
              )}
            </div>
          </div>

          {/* ==================================================
              Featured
          ================================================== */}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("featured")}
              className="h-4 w-4 rounded"
              style={{
                accentColor: COLORS.deepForest,
              }}
            />

            <label
              className="text-sm font-medium"
              style={{
                color: COLORS.deepForest,
              }}
            >
              نمایاں کریں (Featured)
            </label>
          </div>

          {/* ==================================================
              Links
          ================================================== */}

          <div>
            <div className="flex items-center justify-between">
              <label
                className="block text-sm font-medium"
                style={{
                  color: COLORS.deepForest,
                }}
              >
                لنکس (اختیاری، زیادہ سے زیادہ 5)
              </label>

              {linkFields.length < 5 && (
                <button
                  type="button"
                  onClick={() =>
                    appendLink({
                      title: "",
                      url: "",
                      type: "website",
                    })
                  }
                  className="rounded-full px-3 py-1 text-sm transition-colors"
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
              <div
                key={field.id}
                className="mt-2 rounded-lg border p-3"
                style={{
                  borderColor: `${COLORS.deepForest}20`,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    {...register(
                      `links.${index}.title`
                    )}
                    className="min-w-[100px] flex-1 rounded border px-3 py-1 font-urdu focus:ring-2 focus:outline-none"
                    style={{
                      borderColor: `${COLORS.deepForest}40`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                    placeholder="عنوان"
                  />

                  <input
                    {...register(
                      `links.${index}.url`
                    )}
                    className="min-w-[150px] flex-1 rounded border px-3 py-1 font-urdu focus:ring-2 focus:outline-none"
                    style={{
                      borderColor: `${COLORS.deepForest}40`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                    placeholder="URL"
                  />

                  <select
                    {...register(
                      `links.${index}.type`
                    )}
                    className="rounded border px-3 py-1 focus:ring-2 focus:outline-none"
                    style={{
                      borderColor: `${COLORS.deepForest}40`,
                      background: `${COLORS.warmWhite}40`,
                    }}
                  >
                    <option value="website">
                      Website
                    </option>
                    <option value="spotify">
                      Spotify
                    </option>
                    <option value="youtube">
                      YouTube
                    </option>
                    <option value="wikipedia">
                      Wikipedia
                    </option>
                    <option value="social">
                      Social
                    </option>
                    <option value="other">
                      Other
                    </option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="text-xl text-red-500 hover:text-red-700"
                    aria-label="Remove link"
                  >
                    ×
                  </button>
                </div>

                {errors.links?.[index]?.title
                  ?.message && (
                  <p className="mt-1 text-sm text-red-500">
                    {
                      errors.links[index].title
                        ?.message
                    }
                  </p>
                )}

                {!errors.links?.[index]?.title
                  ?.message &&
                  errors.links?.[index]?.url
                    ?.message && (
                    <p className="mt-1 text-sm text-red-500">
                      {
                        errors.links[index].url
                          ?.message
                      }
                    </p>
                  )}
              </div>
            ))}
          </div>

          {/* ==================================================
              Submit
          ================================================== */}

          <div
            className="sticky bottom-0 mt-4 flex items-center gap-4 border-t pt-4 pb-2"
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
              className="rounded-lg px-6 py-2 font-medium text-black transition-shadow duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${COLORS.deepForest}, ${COLORS.darkEmerald})`,
              }}
            >
              {isSubmitting
                ? "تخلیق ہو رہی ہے..."
                : "تخلیق کریں"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg px-6 py-2 font-medium text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              منسوخ کریں
            </button>

            {mediaFiles.length > 0 && (
              <span className="mr-auto text-sm text-gray-500">
                {mediaFiles.length}{" "}
                {mediaFiles.length > 1
                  ? "فائلیں"
                  : "فائل"}{" "}
                منتخب
              </span>
            )}
          </div>
        </form>
      </Modal>

      {/* ======================================================
          Toast Container
      ====================================================== */}

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