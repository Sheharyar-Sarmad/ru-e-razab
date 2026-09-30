"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const THEME = {
  darkOrange: "#9A3412",
  orangeGlow: "#EA580C",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

interface Props {
  title: string;
  text: string;
  url: string;
}

const platforms = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    labelUrdu: "واٹس ایپ",
    color: "#25D366",
    build: (u: string, t: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${t}\n\n${u}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    ),
  },
  {
    key: "x",
    label: "X",
    labelUrdu: "ایکس",
    color: "#000000",
    build: (u: string, t: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    labelUrdu: "فیس بک",
    color: "#1877F2",
    build: (u: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    labelUrdu: "ٹیلیگرام",
    color: "#0088cc",
    build: (u: string, t: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

export default function KalamShareMenu({ title, text, url }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const shareVia = (buildUrl: (u: string, t: string) => string) => {
    const shareUrl = buildUrl(url, text);
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      toast.success("Link copied to clipboard");
      setOpen(false);
    } catch {
      toast.error("Could not copy");
    }
  };

  const nativeShare = () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      navigator.share({ title, text, url }).catch(() => {
        /* user cancelled */
      });
    } else {
      setOpen((o) => !o);
    }
  };
  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={nativeShare}
        aria-label="Share"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-outfit font-semibold shadow-sm transition-all"
        style={{
          borderColor: THEME.border,
          backgroundColor: open
            ? `${THEME.darkOrange}10`
            : "rgba(255,255,255,0.85)",
          color: THEME.darkText,
        }}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md"
            style={{
              backgroundColor: "rgba(255, 252, 250, 0.98)",
              borderColor: THEME.border,
              boxShadow: `0 20px 40px -16px ${THEME.darkOrange}55`,
            }}
          >
            {platforms.map((p) => (
              <button
                key={p.key}
                onClick={() => shareVia(p.build)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F2D6CF]/40"
                dir="ltr"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.icon}
                </span>
                <span
                  className="flex-1 font-outfit text-sm font-medium"
                  style={{ color: THEME.darkText }}
                >
                  {p.label}
                </span>
                <span
                  className="font-urdu text-xs"
                  style={{ color: THEME.mutedText }}
                  dir="rtl"
                >
                  {p.labelUrdu}
                </span>
              </button>
            ))}

            <div className="border-t" style={{ borderColor: THEME.border }}>
              <button
                onClick={copyLink}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F2D6CF]/40"
                dir="ltr"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${THEME.darkOrange}15`,
                    color: THEME.darkOrange,
                  }}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </span>
                <span
                  className="flex-1 font-outfit text-sm font-medium"
                  style={{ color: THEME.darkText }}
                >
                  Copy Link
                </span>
                <span
                  className="font-urdu text-xs"
                  style={{ color: THEME.mutedText }}
                  dir="rtl"
                >
                  کاپی
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
