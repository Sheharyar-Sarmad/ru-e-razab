// components/admin/layout/GroqChatPageWrapper.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { marked } from "marked";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentIcon,
  PrinterIcon,
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";
import { toast } from "react-toastify";

// ─── Types ──────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string; // ISO string
}

const QUICK_ACTIONS = [
  { label: "Platform Stats", icon: ChartBarIcon, query: "Show me the platform overview and key metrics." },
  { label: "Growth Trends", icon: DocumentTextIcon, query: "What are the monthly trends for content and users?" },
  { label: "Active Users", icon: EyeIcon, query: "How many active users do we have?" },
  { label: "Anomalies", icon: ChatBubbleLeftIcon, query: "Are there any anomalous ghazals?" },
];

marked.setOptions({
  gfm: true,
  breaks: true,
});

// ─── Logger ─────────────────────────────────────────────────────
const logger = {
  info: (c: string, m: string, d?: any) => console.log(`%c[${c}] ${m}`, 'color:#2563eb;font-weight:bold;', d ?? ''),
  success: (c: string, m: string, d?: any) => console.log(`%c[${c}] ✅ ${m}`, 'color:#16a34a;font-weight:bold;', d ?? ''),
  warn: (c: string, m: string, d?: any) => console.warn(`%c[${c}] ⚠️ ${m}`, 'color:#ea580c;font-weight:bold;', d ?? ''),
  error: (c: string, m: string, e?: any) => console.error(`%c[${c}] ❌ ${m}`, 'color:#dc2626;font-weight:bold;', e ?? ''),
  debug: (c: string, m: string, d?: any) => console.debug(`%c[${c}] 🔍 ${m}`, 'color:#7c3aed;font-weight:bold;', d ?? ''),
};

// ─── Date/time helpers ──────────────────────────────────────────
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Format just the time: "11:09 AM" */
const formatTime = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/** Format relative day label for dividers: Today / Yesterday / Mon, Sep 11 */
const formatDayLabel = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = startOfDay(new Date());
  const thatDay = startOfDay(d);
  const diffDays = Math.round((today.getTime() - thatDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: today.getFullYear() === d.getFullYear() ? undefined : "numeric",
  });
};

/** Full tooltip string: "Monday, September 11, 2026 at 11:09:23 AM" */
const formatFullTimestamp = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/** Are two ISO timestamps on the same calendar day? */
const sameDay = (a?: string, b?: string): boolean => {
  if (!a || !b) return true;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return true;
  return startOfDay(da).getTime() === startOfDay(db).getTime();
};

/** Compact time for the message bubble: "11:09 AM" (today) or "Sep 9, 11:09 AM" (older) */
const formatBubbleTime = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = startOfDay(new Date());
  const thatDay = startOfDay(d);
  const isToday = today.getTime() === thatDay.getTime();
  if (isToday) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ─── Strip markdown for TTS ─────────────────────────────────────
const stripMarkdownForSpeech = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/[-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ─── Voice waveform ────────────────────────────────────────────
const VoiceVisualizer = ({ active, color = COLORS.burntRust }: { active: boolean; color?: string }) => {
  const bars = 5;
  return (
    <div className="flex items-center justify-center gap-[3px] h-5">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{ background: color, width: 3, display: "inline-block" }}
          animate={
            active
              ? { height: [6, 16, 10, 20, 8, 14, 6], opacity: [0.6, 1, 0.7, 1, 0.6] }
              : { height: 4, opacity: 0.35 }
          }
          transition={{
            duration: 1.1,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.09,
          }}
        />
      ))}
    </div>
  );
};

// ─── Mic orb ────────────────────────────────────────────────────
const MicOrb = ({
  listening,
  speaking,
  color,
  onClick,
  title,
  children,
}: {
  listening: boolean;
  speaking: boolean;
  color: string;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  const active = listening || speaking;
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative flex items-center justify-center w-12 h-12 rounded-full transition-transform hover:scale-105 active:scale-95"
      style={{
        background: active
          ? `radial-gradient(circle at 30% 30%, ${color}, ${color}cc)`
          : "linear-gradient(135deg, #e5e7eb, #d1d5db)",
        boxShadow: active
          ? `0 0 0 4px ${color}22, 0 0 18px ${color}66, inset 0 0 12px rgba(255,255,255,0.25)`
          : "inset 0 1px 2px rgba(0,0,0,0.06)",
        color: active ? "#fff" : "#4b5563",
      }}
    >
      <AnimatePresence>
        {active && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `2px solid ${color}` }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.7, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `2px solid ${color}` }}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
            />
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `2px solid ${color}` }}
              initial={{ scale: 1, opacity: 0.4 }}
              animate={{ scale: 2.05, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
            />
          </>
        )}
      </AnimatePresence>
      <span className="relative z-10">{children}</span>
    </button>
  );
};

// ─── Date divider between message groups ────────────────────────
const DateDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 my-4 no-print">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-gray-100">
      {label}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
  </div>
);

// ─── Main component ─────────────────────────────────────────────
export default function GroqChatPageWrapper() {
  const COMPONENT = "GroqChatPageWrapper";

  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm RAZAB AI, your administrative assistant. How can I help you manage Ru-e-Razab today?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOnline] = useState(true);

  // STT
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState("");

  // TTS
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState<boolean | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (isVisible && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isVisible, isMinimized]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setVoiceSupported(false);
      setTtsSupported(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    setVoiceSupported(!!SR);
    if ("speechSynthesis" in window) {
      setTtsSupported(true);
      window.speechSynthesis.getVoices();
    } else {
      setTtsSupported(false);
    }
    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try { window.speechSynthesis.cancel(); } catch {}
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  const speakText = useCallback(
    (rawText: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (!ttsEnabled) return;
      const text = stripMarkdownForSpeech(rawText);
      if (!text) return;
      try { window.speechSynthesis.cancel(); } catch {}

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      try {
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              /en-(US|GB)/i.test(v.lang) &&
              /(Google|Samantha|Daniel|Microsoft|Natural)/i.test(v.name)
          ) ||
          voices.find((v) => /en-(US|GB)/i.test(v.lang)) ||
          voices[0];
        if (preferred) {
          utter.voice = preferred;
          utter.lang = preferred.lang;
        }
      } catch {}

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => { setIsSpeaking(false); utteranceRef.current = null; };
      utter.onerror = () => { setIsSpeaking(false); utteranceRef.current = null; };

      utteranceRef.current = utter;
      try { window.speechSynthesis.speak(utter); } catch { setIsSpeaking(false); }
    },
    [ttsEnabled]
  );

  const initSpeechRecognition = () => {
    if (typeof window === "undefined") return null;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;
    if (!SR) return null;
    try {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.lang = "en-US";
      r.maxAlternatives = 1;
      return r;
    } catch { return null; }
  };

  const startListening = async () => {
    stopSpeaking();
    if (voiceSupported === false) {
      toast.error("Voice recognition is not supported in this browser.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
      });
      return;
    }
    if (isLoading) return;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (permErr: any) {
      const name = permErr?.name || "";
      let msg = "Microphone access is required for voice input.";
      if (name === "NotAllowedError") msg = "Microphone access denied.";
      if (name === "NotFoundError") msg = "No microphone found.";
      if (name === "NotReadableError") msg = "Microphone in use by another app.";
      toast.error(msg, {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
      });
      setVoiceSupported(false);
      return;
    }

    if (!recognitionRef.current) {
      const r = initSpeechRecognition();
      if (!r) return;
      recognitionRef.current = r;
    }
    try { if (recognitionRef.current._isActive) recognitionRef.current.abort(); } catch {}

    const recognition = recognitionRef.current;
    recognition.onstart = () => { setIsListening(true); setTranscript(""); };
    recognition.onspeechend = () => {
      setTimeout(() => {
        try {
          recognitionRef.current?.stop();
          if (recognitionRef.current) recognitionRef.current._isActive = false;
        } catch {}
        setIsListening(false);
      }, 800);
    };
    recognition.onnomatch = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let fin = "", interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) { setInput(interim); setTranscript(interim); }
      if (fin) {
        setInput(fin);
        setTranscript(fin);
        setIsListening(false);
        setTimeout(() => { if (fin.trim()) handleSend(fin.trim()); }, 300);
      }
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "no-speech") {
        toast.info("No speech detected.", {
          style: { background: "#2B4735", color: "#FFF3EF" },
          autoClose: 2000,
        });
      } else if (event.error !== "aborted") {
        toast.error(`Voice error: ${event.error}`, {
          style: { background: "#4A2B2B", color: "#FFF3EF" },
        });
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current._isActive = false;
    };

    try {
      recognition.start();
      recognition._isActive = true;
      toast.info("🎤 Listening...", {
        style: { background: "#2B4735", color: "#FFF3EF" },
        autoClose: 2000,
      });
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current._isActive = false;
      } catch {
        try { recognitionRef.current.stop(); recognitionRef.current._isActive = false; } catch {}
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => (isListening ? stopListening() : startListening());

  const cleanMarkdown = (text: string): string =>
    !text ? "" : text.replace(/<br\s*\/?>/gi, "\n").replace(/\n{3,}/g, "\n\n");

  const renderMarkdown = (content: string): string => {
    try { return marked(content) as string; } catch { return content; }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!", {
        style: { background: "#2B4735", color: "#FFF3EF" },
      });
    } catch {
      toast.error("Failed to copy.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
      });
    }
  };

  const handlePrint = () => { stopSpeaking(); window.print(); };

  const handleSend = async (query?: string) => {
    const messageText = query || input.trim();
    if (!messageText || isLoading) return;
    if (isListening) stopListening();
    stopSpeaking();

    const userMessage: Message = {
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingMessage("");

    try {
      const response = await fetch("/api/admin/dashboard/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let done = false;
      let accumulated = "";
      while (!done) {
        const { value, done: dr } = await reader.read();
        done = dr;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") { done = true; break; }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingMessage(cleanMarkdown(accumulated));
              }
            } catch {}
          }
        }
      }

      if (accumulated) {
        const finalText = cleanMarkdown(accumulated);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalText, createdAt: new Date().toISOString() },
        ]);
        speakText(finalText);
      }
      setStreamingMessage("");
    } catch (error) {
      logger.error(COMPONENT, "Chat error", error);
      toast.error("Failed to get response.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    if (messages.length <= 1) return;
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help you today?",
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const toggleMinimize = () => { stopSpeaking(); setIsMinimized(!isMinimized); };
  const closeChat = () => { stopSpeaking(); stopListening(); setIsVisible(false); };

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    if (!next) stopSpeaking();
    toast.info(next ? "Voice replies enabled" : "Voice replies muted", {
      style: { background: "#2B4735", color: "#FFF3EF" },
      autoClose: 1500,
    });
  };

  // ─── Closed placeholder ────────────────────────────────────────
  if (!isVisible) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center h-[90vh] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4"
          style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
        >
          <SparklesIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Chat Closed</h3>
        <p className="text-gray-500 text-sm max-w-md">
          RAZAB AI Assistant is currently closed. Click the button below to reopen.
        </p>
        <button
          onClick={() => setIsVisible(true)}
          className="mt-6 px-6 py-2.5 text-white rounded-xl hover:shadow-lg transition"
          style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
        >
          Reopen Chat
        </button>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          onClick={() => setIsVisible(true)}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-full text-white shadow-2xl hover:shadow-xl transition"
          style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
        >
          <SparklesIcon className="w-6 h-6" />
        </motion.button>
      </motion.div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #chat-to-print, #chat-to-print * { visibility: visible; }
          #chat-to-print {
            position: fixed; left: 0; top: 0; width: 100%; height: 100%;
            background: white; padding: 2rem; overflow: auto;
          }
          #chat-to-print .no-print { display: none !important; }
        }
        .assistant-content { font-size: 0.875rem; line-height: 1.6; color: #1f2937; }
        .assistant-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
        .assistant-content th, .assistant-content td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; }
        .assistant-content th { background-color: #f3f4f6; font-weight: 600; }
        .assistant-content tbody tr:nth-child(even) { background-color: #f9fafb; }
        .assistant-content ul, .assistant-content ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .assistant-content li { margin: 0.25rem 0; }
        .assistant-content p { margin: 0.5rem 0; }
        .assistant-content strong { font-weight: 600; color: #111827; }
        .assistant-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
        .assistant-content pre { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.8rem; }
        .assistant-content code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.8rem; }
        .assistant-content blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; margin: 0.5rem 0; color: #4b5563; }
      `}</style>

      <AnimatePresence mode="wait">
        <motion.div
          key="chat-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className={`flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all ${
            isMinimized ? "h-[60px]" : "h-[90vh]"
          }`}
          id="chat-to-print"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 pl-16 sm:pl-20 lg:pl-3 border-b border-gray-100 bg-gradient-to-r from-[#FFF3EF] to-white flex-shrink-0 no-print">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 relative"
                style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
              >
                <SparklesIcon className="w-4 h-4" />
                {isSpeaking && (
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ border: `2px solid ${COLORS.burntRust}` }}
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-800 text-sm truncate">RAZAB AI Assistant</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-[10px] text-gray-400">{isOnline ? "Online" : "Offline"}</span>
                  {isListening && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                      <VoiceVisualizer active color={COLORS.burntRust} />
                      Listening
                    </span>
                  )}
                  {isSpeaking && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <VoiceVisualizer active color="#059669" />
                      Speaking
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {ttsSupported && (
                <button
                  onClick={toggleTts}
                  className={`p-1.5 rounded-lg transition-colors ${
                    ttsEnabled ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"
                  }`}
                  title={ttsEnabled ? "Mute voice replies" : "Enable voice replies"}
                >
                  {ttsEnabled ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerXMarkIcon className="w-4 h-4" />}
                </button>
              )}
              <AnimatePresence>
                {isSpeaking && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Stop speaking"
                  >
                    <PauseIcon className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                onClick={handlePrint}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                title="Print / PDF"
              >
                <PrinterIcon className="w-4 h-4" />
              </button>
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                title="Clear chat"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
              <button
                onClick={toggleMinimize}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ArrowsPointingOutIcon className="w-4 h-4" /> : <ArrowsPointingInIcon className="w-4 h-4" />}
              </button>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                title="Close chat"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isMinimized ? (
            <div className="flex-1" />
          ) : (
            <>
              {/* Quick actions */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50/80 border-b border-gray-100 flex-shrink-0 no-print">
                {QUICK_ACTIONS.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(action.query)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-[#A5421D] hover:text-[#A5421D] transition-colors disabled:opacity-50"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, idx) => {
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showDivider = !prev || !sameDay(prev.createdAt, msg.createdAt);
                  return (
                    <div key={idx}>
                      {showDivider && msg.createdAt && (
                        <DateDivider label={formatDayLabel(msg.createdAt)} />
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm relative group ${
                            msg.role === "user"
                              ? "bg-[#A5421D] text-white rounded-br-none"
                              : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <>
                              <div
                                className="assistant-content"
                                dangerouslySetInnerHTML={{
                                  __html: renderMarkdown(cleanMarkdown(msg.content)),
                                }}
                              />
                              <div className="mt-2 flex items-center justify-between gap-3 no-print">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => copyToClipboard(msg.content)}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                                    Copy
                                  </button>
                                  {ttsSupported && (
                                    <button
                                      onClick={() => speakText(msg.content)}
                                      className="text-xs text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Read aloud"
                                    >
                                      <SpeakerWaveIcon className="w-3.5 h-3.5" />
                                      Read
                                    </button>
                                  )}
                                </div>
                                {msg.createdAt && (
                                  <span
                                    className="text-[10px] text-gray-400/90 whitespace-nowrap"
                                    title={formatFullTimestamp(msg.createdAt)}
                                  >
                                    {formatBubbleTime(msg.createdAt)}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {msg.content}
                              </p>
                              {msg.createdAt && (
                                <div className="mt-1 flex justify-end">
                                  <span
                                    className="text-[10px] text-white/70 whitespace-nowrap"
                                    title={formatFullTimestamp(msg.createdAt)}
                                  >
                                    {formatBubbleTime(msg.createdAt)}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}

                {streamingMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm">
                      <div
                        className="assistant-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingMessage) }}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse" />
                        <span className="text-[10px] text-gray-400">
                          {formatTime(new Date().toISOString())}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isLoading && !streamingMessage && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0 no-print">
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isListening
                        ? "Listening..."
                        : isSpeaking
                        ? "Speaking..."
                        : "Ask me anything about the platform..."
                    }
                    disabled={isLoading || isListening}
                    className={`flex-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#A5421D] focus:border-transparent outline-none text-sm transition-colors ${
                      isListening
                        ? "bg-red-50 border-red-300"
                        : isSpeaking
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  />
                  <MicOrb
                    listening={isListening}
                    speaking={false}
                    color={isListening ? "#ef4444" : COLORS.burntRust}
                    onClick={toggleListening}
                    title={isListening ? "Stop listening" : voiceSupported ? "Voice input" : "Voice not supported"}
                  >
                    {isListening ? <VoiceVisualizer active color="#ffffff" /> : <MicrophoneIcon className="w-5 h-5" />}
                  </MicOrb>
                  {isSpeaking && (
                    <MicOrb
                      listening={false}
                      speaking={true}
                      color="#059669"
                      onClick={stopSpeaking}
                      title="Stop speaking"
                    >
                      <StopIcon className="w-5 h-5" />
                    </MicOrb>
                  )}
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || !input.trim() || isListening}
                    className="px-4 py-2.5 bg-[#A5421D] text-white rounded-xl hover:bg-[#8a3618] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2 no-print">
                  <p className="text-[10px] text-gray-400">RAZAB AI – Admin Assistant • v1.0</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {isListening && (
                      <span className="flex items-center gap-1 text-red-500">
                        <VoiceVisualizer active color="#ef4444" />
                        Listening
                      </span>
                    )}
                    {isSpeaking && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <VoiceVisualizer active color="#059669" />
                        Speaking
                      </span>
                    )}
                    {!isListening && !isSpeaking && (
                      <span>{ttsSupported ? "Powered by Groq" : "Voice: Not Supported"}</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}