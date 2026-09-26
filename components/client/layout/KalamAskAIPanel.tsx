"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import apiClient from "@/lib/api";

const THEME = {
  darkBg: "#1A0F0B",
  surface: "#231610",
  surfaceHi: "#2D1D15",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  emeraldGreen: "#047857",
  creamText: "#FFF7F4",
  creamMuted: "rgba(255, 247, 244, 0.72)",
  border: "#3D2820",
  borderHi: "#5A3B2C",
};

export type KalamType = "ghazal" | "nazm" | "qata" | "shair";

const TYPE_URDU: Record<KalamType, string> = {
  ghazal: "غزل",
  nazm: "نظم",
  qata: "قطعہ",
  shair: "شعر",
};

const SUGGESTIONS: Record<KalamType, string[]> = {
  ghazal: [
    "اس غزل کا مرکزی موضوع کیا ہے؟",
    "What is the meaning of the first shair?",
    "اس غزل میں کون سے ادبی محاسن ہیں؟",
  ],
  nazm: [
    "اس نظم کا پیغام کیا ہے؟",
    "What imagery does the poet use?",
    "اس نظم کا مرکزی خیال بیان کریں",
  ],
  qata: [
    "اس قطعے کا مطلب کیا ہے؟",
    "Explain the two shairs",
    "اس قطعے میں کون سا موضوع ہے؟",
  ],
  shair: [
    "اس شعر کی تشریح کریں",
    "What does this couplet mean?",
    "اس شعر میں کون سی صنف ہے؟",
  ],
};

interface Props {
  type: KalamType;
  slug: string;
  title?: string;
  firstLine?: string;
  isOpen: boolean;
  onClose: () => void;
}

/* =========================================================
   URDU DETECTION
========================================================= */
function containsUrdu(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/* =========================================================
   MARKDOWN-LITE RENDERER
   Parses: headings, bold, hr, bullets, numbered lists,
   tables, blockquotes, and code blocks. Renders as React.
========================================================= */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Handle **bold** and `code`
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      nodes.push(
        <strong key={`${keyBase}-b-${i++}`} style={{ fontWeight: 700 }}>
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      nodes.push(
        <code
          key={`${keyBase}-c-${i++}`}
          className="font-outfit rounded px-1.5 py-0.5 text-xs"
          style={{
            backgroundColor: `${THEME.orangeGlow}20`,
            color: THEME.orangeGlow,
          }}
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length > 0 ? nodes : [text];
}

function ParsedAnswer({ text }: { text: string }) {
  const lines = text.split("\n");

  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    /* ---------- Code block ---------- */
    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre
          key={`code-${i}`}
          className="font-urdu my-4 overflow-x-auto rounded-xl border p-4 text-sm leading-[2]"
          style={{
            backgroundColor: THEME.surface,
            borderColor: THEME.borderHi,
            color: THEME.creamText,
          }}
          dir="rtl"
        >
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    /* ---------- Horizontal rule ---------- */
    if (/^---+$/.test(trimmed)) {
      blocks.push(
        <hr
          key={`hr-${i}`}
          className="my-5 border-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${THEME.borderHi}, transparent)`,
          }}
        />
      );
      i++;
      continue;
    }

    /* ---------- Headings ---------- */
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4
          key={`h3-${i}`}
          className="font-urdu mt-5 mb-2 text-lg font-bold leading-[1.9]"
          style={{ color: THEME.orangeGlow }}
          dir={containsUrdu(trimmed) ? "rtl" : "ltr"}
        >
          {renderInline(trimmed.slice(4), `h3-${i}`)}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3
          key={`h2-${i}`}
          className="font-urdu mt-6 mb-2 text-xl font-bold leading-[1.9]"
          style={{ color: THEME.orangeGlow }}
          dir={containsUrdu(trimmed) ? "rtl" : "ltr"}
        >
          {renderInline(trimmed.slice(3), `h2-${i}`)}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2
          key={`h1-${i}`}
          className="font-urdu mt-6 mb-3 text-2xl font-bold leading-[1.9]"
          style={{ color: THEME.orangeGlow }}
          dir={containsUrdu(trimmed) ? "rtl" : "ltr"}
        >
          {renderInline(trimmed.slice(2), `h1-${i}`)}
        </h2>
      );
      i++;
      continue;
    }

    /* ---------- Table ---------- */
    if (trimmed.startsWith("|") && lines[i + 1]?.trim().match(/^\|[\s\-:|]+\|$/)) {
      const headerCells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(
          lines[i]
            .trim()
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );
        i++;
      }
      blocks.push(
        <div
          key={`table-${i}`}
          className="my-4 overflow-x-auto rounded-xl border"
          style={{ borderColor: THEME.borderHi }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: `${THEME.orangeGlow}10` }}>
                {headerCells.map((h, hi) => (
                  <th
                    key={hi}
                    className="font-urdu border-b px-3 py-2 text-right font-bold"
                    style={{
                      borderColor: THEME.borderHi,
                      color: THEME.orangeGlow,
                    }}
                    dir={containsUrdu(h) ? "rtl" : "ltr"}
                  >
                    {renderInline(h, `th-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="font-urdu border-b px-3 py-2 leading-[2]"
                      style={{
                        borderColor: THEME.border,
                        color: THEME.creamText,
                      }}
                      dir={containsUrdu(cell) ? "rtl" : "ltr"}
                    >
                      {renderInline(cell, `td-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    /* ---------- Bullets ---------- */
    if (/^[-*] /.test(trimmed)) {
      blocks.push(
        <div
          key={`ul-${i}`}
          className="my-1.5 flex items-start gap-2"
          dir={containsUrdu(trimmed) ? "rtl" : "ltr"}
        >
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: THEME.orangeGlow }}
          />
          <p
            className="font-urdu flex-1 leading-[2]"
            style={{ color: THEME.creamText }}
          >
            {renderInline(trimmed.slice(2), `ul-${i}`)}
          </p>
        </div>
      );
      i++;
      continue;
    }

    /* ---------- Numbered list ---------- */
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push(
        <div
          key={`ol-${i}`}
          className="my-1.5 flex items-start gap-2"
          dir={containsUrdu(trimmed) ? "rtl" : "ltr"}
        >
          <span
            className="font-outfit mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{
              backgroundColor: `${THEME.orangeGlow}20`,
              color: THEME.orangeGlow,
            }}
          >
            {numMatch[1]}
          </span>
          <p
            className="font-urdu flex-1 leading-[2]"
            style={{ color: THEME.creamText }}
          >
            {renderInline(numMatch[2], `ol-${i}`)}
          </p>
        </div>
      );
      i++;
      continue;
    }

    /* ---------- Blockquote ---------- */
    if (trimmed.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={`bq-${i}`}
          className="font-urdu my-3 border-r-3 py-1 pr-4 leading-[2]"
          style={{
            borderRight: `3px solid ${THEME.orangeGlow}`,
            color: THEME.creamMuted,
            fontStyle: "italic",
          }}
          dir="rtl"
        >
          {renderInline(trimmed.slice(2), `bq-${i}`)}
        </blockquote>
      );
      i++;
      continue;
    }

    /* ---------- Blank line ---------- */
    if (trimmed === "") {
      i++;
      continue;
    }

    /* ---------- Paragraph ---------- */
    blocks.push(
      <p
        key={`p-${i}`}
        className="font-urdu my-2 leading-[2.1]"
        style={{ color: THEME.creamText }}
        dir={containsUrdu(trimmed) ? "rtl" : "ltr"}
      >
        {renderInline(trimmed, `p-${i}`)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{blocks}</div>;
}

/* =========================================================
   MAIN PANEL
========================================================= */
export default function KalamAskAIPanel({
  type,
  slug,
  title,
  firstLine,
  isOpen,
  onClose,
}: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const headerTitle = useMemo(
    () => title || firstLine || "اس کلام",
    [title, firstLine]
  );

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);

    try {
      const res = await apiClient.post(`/api/client/ai/analyze/${type}`, {
        slug,
        question: q.trim(),
      });
      if (res.data?.success && res.data?.data?.answer) {
        setHistory((prev) => [
          ...prev,
          { q: q.trim(), a: res.data.data.answer },
        ]);
        setQuestion("");
      } else {
        toast.error(res.data?.message || "Could not get a response");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "AI request failed. Please retry.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed bottom-0 right-0 top-0 z-[91] flex w-full max-w-lg flex-col border-l shadow-2xl"
            style={{
              backgroundColor: THEME.darkBg,
              borderColor: THEME.border,
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* Top accent */}
            <div
              className="h-[3px] w-full shrink-0"
              style={{
                background: `linear-gradient(90deg, transparent, ${THEME.emeraldGreen}, ${THEME.orangeGlow}, ${THEME.darkOrange}, transparent)`,
              }}
              aria-hidden="true"
            />

            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: THEME.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: `${THEME.emeraldGreen}15`,
                    borderColor: `${THEME.emeraldGreen}40`,
                  }}
                >
                  <svg
                    className="h-5 w-5"
                    style={{ color: THEME.emeraldGreen }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.9}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3
                    className="font-urdu truncate text-lg font-semibold leading-[1.7]"
                    style={{ color: THEME.creamText }}
                  >
                    ادبی دوست
                  </h3>
                  <p
                    className="font-outfit truncate text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: THEME.creamMuted }}
                    dir="ltr"
                  >
                    {TYPE_URDU[type]} · Powered by Groq
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full p-2 transition-opacity hover:opacity-70"
                style={{ color: THEME.creamMuted }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Kalam context card */}
            <div
              className="mx-5 mt-4 rounded-2xl border p-4"
              style={{
                backgroundColor: THEME.surface,
                borderColor: THEME.borderHi,
              }}
              dir="rtl"
            >
              <p
                className="font-outfit text-[10px] font-bold uppercase tracking-[0.25em]"
                style={{ color: THEME.orangeGlow }}
                dir="ltr"
              >
                Analyzing
              </p>
              <p
                className="font-urdu mt-1 line-clamp-2 text-sm leading-[2]"
                style={{ color: THEME.creamText }}
              >
                {headerTitle}
              </p>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              {history.length === 0 && (
                <div className="mb-6 text-center" dir="rtl">
                  <p
                    className="font-urdu text-sm leading-[2.2]"
                    style={{ color: THEME.creamMuted }}
                  >
                    اس کلام کے بارے میں کوئی بھی سوال پوچھیں — معنی، تشریح،
                    ادبی محاسن
                  </p>
                </div>
              )}

              {history.length === 0 && (
                <div className="space-y-2">
                  {SUGGESTIONS[type].map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ scale: 1.02, x: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => ask(s)}
                      className="font-urdu w-full rounded-2xl border px-4 py-3 text-right text-sm leading-[2] transition-all"
                      style={{
                        borderColor: THEME.borderHi,
                        color: THEME.creamText,
                        backgroundColor: THEME.surface,
                      }}
                      dir="rtl"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              )}

              <div className="space-y-6">
                {history.map((h, i) => (
                  <div key={i} className="space-y-3">
                    {/* User question bubble */}
                    <div className="flex justify-end">
                      <div
                        className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
                          color: "#FFF7F4",
                        }}
                        dir="rtl"
                      >
                        <p className="font-urdu text-sm leading-[2]">{h.q}</p>
                      </div>
                    </div>

                    {/* AI answer bubble — full width, professional */}
                    <div className="flex justify-start">
                      <div
                        className="w-full max-w-full rounded-2xl rounded-tl-sm border p-4 shadow-lg"
                        style={{
                          borderColor: THEME.borderHi,
                          backgroundColor: THEME.surface,
                        }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{
                              background: `linear-gradient(135deg, ${THEME.emeraldGreen}, #065F46)`,
                            }}
                          >
                            AI
                          </span>
                          <span
                            className="font-outfit text-[10px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: THEME.emeraldGreen }}
                            dir="ltr"
                          >
                            ادبی دوست
                          </span>
                        </div>

                        <ParsedAnswer text={h.a} />
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="flex items-center gap-3 rounded-2xl rounded-tl-sm border px-4 py-3"
                      style={{
                        borderColor: THEME.borderHi,
                        backgroundColor: THEME.surface,
                      }}
                    >
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: THEME.orangeGlow }}
                          />
                        ))}
                      </span>
                      <span
                        className="font-urdu text-xs"
                        style={{ color: THEME.creamMuted }}
                        dir="rtl"
                      >
                        غور کر رہے ہیں…
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div
              className="border-t p-4"
              style={{
                borderColor: THEME.border,
                backgroundColor: THEME.surface,
              }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(question);
                    }
                  }}
                  placeholder="اپنا سوال لکھیں…"
                  maxLength={300}
                  rows={2}
                  dir="rtl"
                  className="font-urdu flex-1 resize-none rounded-2xl border px-4 py-3 text-sm leading-[2] outline-none transition-colors"
                  style={{
                    borderColor: THEME.borderHi,
                    color: THEME.creamText,
                    backgroundColor: THEME.surfaceHi,
                  }}
                />
                <motion.button
                  whileHover={{
                    scale: loading || !question.trim() ? 1 : 1.05,
                  }}
                  whileTap={{
                    scale: loading || !question.trim() ? 1 : 0.95,
                  }}
                  onClick={() => ask(question)}
                  disabled={loading || !question.trim()}
                  aria-label="Send"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${THEME.darkOrange}, ${THEME.orangeGlow})`,
                    boxShadow: `0 8px 20px -8px ${THEME.orangeGlow}80`,
                  }}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </motion.button>
              </div>
              <p
                className="font-outfit mt-2 text-[10px]"
                style={{ color: THEME.creamMuted, opacity: 0.6 }}
                dir="ltr"
              >
                Press Enter to send · Shift+Enter for new line · {question.length}/300
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}