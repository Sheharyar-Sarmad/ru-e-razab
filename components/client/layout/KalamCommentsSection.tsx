"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import apiClient from "@/lib/api";
import { isUrduScript } from "./KalamFontUtils";

const THEME = {
  rust: "#9A3412",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emerald: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

const TYPE_SEGMENT: Record<KalamType, string> = {
  ghazal: "ghazal",
  nazm: "nazm",
  qata: "qata",
  shair: "shair",
};

export interface CommentUser {
  _id: string;
  firstname: string;
  lastname: string;
  accountname: string;
}

export interface Comment {
  _id: string;
  user: CommentUser | null;
  content: string;
  createdAt: string;
}

interface Props {
  type: KalamType;
  slug: string;
  onAuthRequired: (message: string) => void;
  onCountChange?: (count: number) => void;
}

/* =========================================================
   TIME AGO — picks Urdu units for Urdu display later
========================================================= */
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isUnauthorized(errOrData: any): boolean {
  if (!errOrData) return false;
  const status = errOrData?.response?.status ?? errOrData?.status;
  const code = errOrData?.response?.data?.err ?? errOrData?.err;
  return status === 401 || code === "UNAUTHORIZED";
}

export default function KalamCommentsSection({
  type,
  slug,
  onAuthRequired,
  onCountChange,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const endpoint = `/api/client/dashboard/deewan/${TYPE_SEGMENT[type]}/${slug}/comments`;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(endpoint, {
        params: { page: 1, limit: 50 },
      });
      if (res.data?.success && res.data?.data?.comments) {
        setComments(res.data.data.comments);
        onCountChange?.(res.data.data.comments.length);
      }
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, onCountChange]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post(endpoint, {
        content: newComment.trim(),
      });
      if (res.data?.success && res.data?.data?.comment) {
        setComments((prev) => [res.data.data.comment, ...prev]);
        setNewComment("");
        onCountChange?.(comments.length + 1);
        toast.success("Comment posted");
      } else if (isUnauthorized(res.data)) {
        onAuthRequired("تبصرہ کرنے کے لیے لاگ ان کریں۔");
      }
    } catch (err: any) {
      if (isUnauthorized(err)) {
        onAuthRequired("تبصرہ کرنے کے لیے لاگ ان کریں۔");
      } else {
        toast.error("Could not post comment");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* Detect whether the composer draft is Urdu or Roman */
  const draftIsUrdu = isUrduScript(newComment);

  return (
    <section
      id="comments"
      className="scroll-mt-24 overflow-hidden rounded-3xl border shadow-sm"
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: THEME.border,
      }}
    >
      {/* ============ HEADER ============ */}
      <div
        className="flex items-center gap-3 border-b px-6 py-4"
        style={{ borderColor: THEME.border }}
        dir="rtl"
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${THEME.rust}10` }}
        >
          <svg
            className="h-4 w-4"
            style={{ color: THEME.rust }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <div>
          <h2
            className="font-urdu text-lg font-bold leading-[1.8]"
            style={{ color: THEME.darkText }}
          >
            تبصرے
          </h2>
          <p
            className="font-outfit text-[10px] uppercase tracking-widest"
            style={{ color: THEME.mutedText }}
            dir="ltr"
          >
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </p>
        </div>
      </div>

      {/* ============ COMPOSER ============ */}
      <div className="border-b p-6" style={{ borderColor: THEME.border }}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="اپنی رائے لکھیں…"
          maxLength={500}
          rows={3}
          // ✅ Font + direction switch based on what user is typing
          dir={draftIsUrdu || newComment === "" ? "rtl" : "ltr"}
          className={`${
            newComment && !draftIsUrdu ? "font-outfit" : "font-urdu"
          } w-full resize-none rounded-2xl border px-4 py-3 text-base leading-[2] outline-none transition-colors focus:border-[#9A3412]`}
          style={{
            borderColor: THEME.border,
            color: THEME.darkText,
            backgroundColor: "#FFF",
          }}
        />
        <div className="mt-3 flex items-center justify-between" dir="ltr">
          <span
            className="font-outfit text-xs"
            style={{ color: THEME.mutedText }}
          >
            {newComment.length}/500
          </span>
          <motion.button
            whileHover={{ scale: submitting || !newComment.trim() ? 1 : 1.04 }}
            whileTap={{ scale: submitting || !newComment.trim() ? 1 : 0.96 }}
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="font-outfit rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: THEME.rust }}
          >
            {submitting ? "Posting…" : "Post Comment"}
          </motion.button>
        </div>
      </div>

      {/* ============ LIST ============ */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 w-full animate-pulse rounded-2xl"
                style={{ backgroundColor: `${THEME.border}60` }}
              />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center" dir="rtl">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${THEME.orangeGlow}10` }}
            >
              <svg
                className="h-6 w-6"
                style={{ color: THEME.orangeGlow }}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p
              className="font-urdu text-base leading-[2]"
              style={{ color: THEME.mutedText }}
            >
              ابھی تک کوئی تبصرہ نہیں — پہلا تبصرہ آپ کریں
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {comments.map((c, i) => {
                // ✅ Auto-detect script per comment
                const commentIsUrdu = isUrduScript(c.content);
                const nameIsUrdu = isUrduScript(
                  c.user
                    ? `${c.user.firstname} ${c.user.lastname}`
                    : ""
                );

                return (
                  <motion.div
                    key={c._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.04 }}
                    className="flex gap-3 rounded-2xl border p-4"
                    style={{
                      borderColor: THEME.border,
                      backgroundColor: "#FFF",
                    }}
                    // ✅ Direction follows the comment body script
                    dir={commentIsUrdu ? "rtl" : "ltr"}
                  >
                    {/* Avatar */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-outfit text-sm font-bold text-white"
                      style={{ backgroundColor: THEME.rust }}
                    >
                      {c.user?.firstname?.[0]?.toUpperCase() || "U"}
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      {/* Name + time row */}
                      <div
                        className="flex flex-wrap items-baseline gap-2"
                        dir={commentIsUrdu ? "rtl" : "ltr"}
                      >
                        <span
                          className={`${
                            nameIsUrdu ? "font-urdu" : "font-outfit"
                          } text-sm font-semibold`}
                          style={{ color: THEME.darkText }}
                        >
                          {c.user
                            ? `${c.user.firstname} ${c.user.lastname}`
                            : "Anonymous"}
                        </span>
                        <span
                          className="font-outfit text-xs"
                          style={{ color: THEME.mutedText }}
                          dir="ltr"
                        >
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>

                      {/* Comment body — auto font */}
                      <p
                        className={`${
                          commentIsUrdu
                            ? "font-urdu leading-[2.1]"
                            : "font-outfit leading-relaxed"
                        } mt-1.5 text-sm`}
                        style={{ color: THEME.mutedText }}
                        dir={commentIsUrdu ? "rtl" : "ltr"}
                      >
                        {c.content}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}