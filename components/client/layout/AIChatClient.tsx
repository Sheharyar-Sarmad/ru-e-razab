// app/ai/chat/AIChatClient.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SVGProps,
} from "react";
import * as THREE from "three";
import axios from "axios";
import apiClient from "@/lib/api";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

type Role = "user" | "assistant";
type SpokenLanguage = "ur" | "en";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  speech?: string;
  ts: number;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/* =========================================================
   UTILITIES
========================================================= */

const URDU_RANGE = /[\u0600-\u06FF\u0750-\u077F]/;

function containsUrdu(text: string): boolean {
  return URDU_RANGE.test(text);
}

function detectSpeechLang(text: string): SpokenLanguage {
  const urduChars = text.match(new RegExp(URDU_RANGE, "g"))?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  return urduChars > latinChars ? "ur" : "en";
}

function sortVoicesForPriority(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.toLowerCase();
    if (lang.startsWith("ur")) return 0;
    if (lang.startsWith("hi")) return 1;
    if (lang.startsWith("ar")) return 2;
    if (lang.startsWith("en")) return 3;
    return 4;
  };
  return [...voices].sort((a, b) => score(a) - score(b));
}

function pickDefaultVoice(
  voices: SpeechSynthesisVoice[],
  lang: SpokenLanguage
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const prefix = lang === "ur" ? "ur" : "en";
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("hi")) ||
    voices[0]
  );
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "خوش آمدید — main RAZAB AI hoon. RAZAB Tabraiz ki ghazlon, shairon aur nazmon ke baare mein poochhiye — likh kar ya mic dabakar bol kar.",
  ts: Date.now(),
};

/* =========================================================
   ICONS
========================================================= */

function MicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="m4 12 16-7-6.5 16-2.5-6.5L4 12Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =========================================================
   ACCOUNT SETTINGS MATCHING THREE.JS SQUARE EMBER BACKGROUND
========================================================= */

function createSquareEmberTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#E5532B"; // Vibrant Rust Ember Color
    ctx.fillRect(8, 8, 48, 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function initSettingsMatchScene(container: HTMLDivElement): () => void {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const squareTexture = createSquareEmberTexture();

  const count = prefersReducedMotion ? 0 : 85;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 18;
    positions[i * 3 + 1] = Math.random() * 12 - 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

    velocities[i * 3] = (Math.random() - 0.5) * 0.008;
    velocities[i * 3 + 1] = Math.random() * 0.015 + 0.005;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 0.18,
    map: squareTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const emberParticles = new THREE.Points(geometry, material);
  scene.add(emberParticles);

  function resize() {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  }
  resize();

  const target = { x: 0, y: 0 };
  function handlePointerMove(event: PointerEvent) {
    const { clientWidth, clientHeight } = container;
    target.x = (event.clientX / clientWidth - 0.5) * 0.25;
    target.y = (event.clientY / clientHeight - 0.5) * -0.15;
  }

  const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(container);
  window.addEventListener("resize", resize);
  if (!prefersReducedMotion) {
    window.addEventListener("pointermove", handlePointerMove);
  }

  let rafId = 0;
  let isVisible = true;
  const clock = new THREE.Clock();

  function renderFrame() {
    const elapsed = clock.getElapsedTime();
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3] += Math.sin(elapsed * 1.2 + i) * 0.002 + velocities[i * 3];

      if (posArray[i * 3 + 1] > 6) {
        posArray[i * 3 + 1] = -6;
        posArray[i * 3] = (Math.random() - 0.5) * 18;
      }
    }
    posAttr.needsUpdate = true;

    camera.position.x += (target.x - camera.position.x) * 0.02;
    camera.position.y += (target.y - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function loop() {
    if (!isVisible) return;
    renderFrame();
    rafId = requestAnimationFrame(loop);
  }

  function handleVisibilityChange() {
    isVisible = document.visibilityState === "visible";
    if (isVisible && !prefersReducedMotion) {
      rafId = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(rafId);
    }
  }
  document.addEventListener("visibilitychange", handleVisibilityChange);

  if (prefersReducedMotion) {
    renderFrame();
  } else {
    loop();
  }

  return function cleanup() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    resizeObserver?.disconnect();

    geometry.dispose();
    material.dispose();
    squareTexture.dispose();
    renderer.dispose();

    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}

/* =========================================================
   TEXT RENDERER HELPER
========================================================= */

function FormattedMessageText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const regex = /([\u0600-\u06FF\u0750-\u077F]+[\u0600-\u06FF\u0750-\u077F\s\p{P}]*)/gu;
    const result: { text: string; isUrdu: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({
          text: text.slice(lastIndex, match.index),
          isUrdu: false,
        });
      }
      result.push({
        text: match[0],
        isUrdu: true,
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({
        text: text.slice(lastIndex),
        isUrdu: false,
      });
    }

    return result;
  }, [text]);

  if (!containsUrdu(text)) {
    return <span className="font-outfit text-sm font-medium">{text}</span>;
  }

  return (
    <>
      {parts.map((part, index) =>
        part.isUrdu ? (
          <span
            key={index}
            dir="rtl"
            className="font-urdu text-xl sm:text-2xl font-medium leading-[2.0] tracking-normal inline-block py-0.5 px-0.5"
          >
            {part.text}
          </span>
        ) : (
          <span
            key={index}
            dir="ltr"
            className="font-outfit text-sm font-medium leading-relaxed inline-block"
          >
            {part.text}
          </span>
        )
      )}
    </>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function AIChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputLang, setInputLang] = useState<SpokenLanguage>("ur");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [micSupported, setMicSupported] = useState(false);

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const bgContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bgContainerRef.current) return;
    return initSettingsMatchScene(bgContainerRef.current);
  }, []);

  useEffect(() => {
    setMicSupported(
      typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!ttsSupported) return;
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available.length) return;
      const sorted = sortVoicesForPriority(available);
      setVoices(sorted);
      setSelectedVoiceURI((prev) => prev || sorted[0]?.voiceURI || "");
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const stopSpeaking = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [ttsSupported]);

  const speakText = useCallback(
    (text: string, id: string) => {
      if (!ttsSupported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const lang = detectSpeechLang(text);
      const chosenVoice =
        voices.find((v) => v.voiceURI === selectedVoiceURI) || pickDefaultVoice(voices, lang);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang;
      } else {
        utterance.lang = lang === "ur" ? "ur-PK" : "en-US";
      }
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.onstart = () => setSpeakingId(id);
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    },
    [ttsSupported, voices, selectedVoiceURI]
  );

  const toggleSpeakMessage = useCallback(
    (message: ChatMessage) => {
      if (speakingId === message.id) {
        stopSpeaking();
      } else {
        speakText(message.speech || message.content, message.id);
      }
    },
    [speakingId, speakText, stopSpeaking]
  );

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setError("Is browser mein awaz se likhna support nahi hai. Type karke poochh lijiye.");
      return;
    }
    const recognition = new RecognitionCtor();
    recognition.lang = inputLang === "ur" ? "ur-PK" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }
      if (finalText) {
        setInput((prev) => (prev ? `${prev} ${finalText}`.trim() : finalText.trim()));
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };
    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [inputLang, isListening]);

  /* ---- Axios Integration via apiClient ---- */
  const sendMessage = useCallback(
    async (raw?: string) => {
      const content = (raw ?? input).trim();
      if (!content || isSending) return;

      stopSpeaking();
      setError(null);

      const userMessage: ChatMessage = { id: createId(), role: "user", content, ts: Date.now() };
      const history = [...messages, userMessage];
      setMessages(history);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setIsSending(true);

      try {
        const response = await apiClient.post("/api/client/ai/chat", {
          message: content,
          messages: history.slice(-6).map(({ role, content: c }) => ({ role, content: c })),
          voiceMode: ttsEnabled,
          language: inputLang,
        });

        const data = response.data;
        if (!data?.success && !data?.data) {
          throw new Error(data?.message || "RAZAB AI abhi jawab nahi de saka.");
        }

        const resData = data.data || data;
        const assistantMessage: ChatMessage = {
          id: createId(),
          role: "assistant",
          content: resData.response || resData.content,
          speech: resData.speech,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (ttsEnabled) speakText(assistantMessage.speech || assistantMessage.content, assistantMessage.id);
      } catch (err: unknown) {
        const errorMsg =
          axios.isAxiosError(err)
            ? err.response?.data?.message || err.message
            : err instanceof Error
            ? err.message
            : "Kuch masla ho gaya, dobara koshish karein.";
        setError(errorMsg);
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, messages, ttsEnabled, inputLang, speakText, stopSpeaking]
  );

  /* ---- Export Handlers ---- */
  const downloadAsTXT = useCallback(() => {
    const textContent = messages
      .map(
        (m) =>
          `[${new Date(m.ts).toLocaleTimeString()}] ${m.role === "user" ? "User" : "RAZAB AI"}:\n${m.content}\n`
      )
      .join("\n----------------------------------------\n\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RAZAB-AI-Chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [messages]);

  const downloadAsPDF = useCallback(async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxLineWidth = pageWidth - margin * 2;
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(180, 58, 38);
      doc.text("RAZAB AI - Chat Transcript", margin, y);

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, y);

      y += 10;
      doc.setDrawColor(220, 200, 195);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      messages.forEach((m) => {
        const sender = m.role === "user" ? "User" : "RAZAB AI";
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);

        if (m.role === "user") {
          doc.setTextColor(180, 58, 38);
        } else {
          doc.setTextColor(150, 40, 55);
        }

        if (y + 10 > pageHeight - margin) {
          doc.addPage();
          y = margin + 5;
        }

        doc.text(`${sender}:`, margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40, 30, 30);

        const lines = doc.splitTextToSize(m.content, maxLineWidth);
        lines.forEach((line: string) => {
          if (y + 6 > pageHeight - margin) {
            doc.addPage();
            y = margin + 5;
          }
          doc.text(line, margin, y);
          y += 5;
        });

        y += 6;
      });

      doc.save(`RAZAB-AI-Chat-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setError("PDF export fail ho gaya. Koshish karein ke jspdf package installed ho.");
    }
  }, [messages]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const voiceOptions = useMemo(
    () =>
      voices.map((v) => ({
        uri: v.voiceURI,
        label: `${v.name} (${v.lang})`,
      })),
    [voices]
  );

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col items-center justify-start px-4 py-6 sm:py-10">
      {/* THREE.JS SQUARE EMBER PARTICLES BACKGROUND CANVAS */}
      <div
        ref={bgContainerRef}
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      />

      {/* HEADER SECTION */}
      <header className="relative z-10 mb-6 flex w-full max-w-2xl flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#B43A26]/20 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2 leading-tight">
            <span className="font-urdu text-3xl mb-5 sm:text-4xl font-bold text-[#B43A26]">
              مصنوعی ذہانت
            </span>
            <span className="font-outfit text-xl sm:text-2xl font-extrabold text-[#B43A26]">
              AI
            </span>
          </div>
          <p className="font-outfit text-xs font-semibold text-[#661D15] leading-snug">
            RAZAB Tabraiz ki shayari se guftagu — likh kar ya bol kar
          </p>
        </div>

        {/* DOWNLOAD ACTION BUTTONS */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={downloadAsTXT}
            title="Download TXT"
            className="font-outfit inline-flex items-center gap-1.5 rounded-xl border border-[#B43A26]/40 bg-white/70 px-3 py-1 text-xs font-bold text-[#B43A26] shadow-sm backdrop-blur-md transition-colors hover:bg-[#B43A26] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26]"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            <span>TXT</span>
          </button>
          <button
            type="button"
            onClick={downloadAsPDF}
            title="Download PDF"
            className="font-outfit inline-flex items-center gap-1.5 rounded-xl border border-[#B43A26] bg-[#B43A26] px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#8F2E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26]"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex w-full max-w-2xl flex-col gap-5">
        {/* MESSAGES FEED */}
        <div className="flex flex-col gap-4 p-1" aria-live="polite" aria-atomic="false">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm transition-all ${
                  isAssistant
                    ? "self-start border border-[#B43A26]/30 bg-white/85 text-[#2B0E12]"
                    : "self-end border border-[#B43A26] bg-[#B43A26] text-white"
                }`}
              >
                <div className="flex flex-col gap-1 overflow-visible">
                  <FormattedMessageText text={message.content} />
                </div>

                {isAssistant && ttsSupported && (
                  <div className="mt-2 pt-1.5 border-t border-[#B43A26]/20">
                    <button
                      type="button"
                      onClick={() => toggleSpeakMessage(message)}
                      aria-pressed={speakingId === message.id}
                      aria-label={speakingId === message.id ? "Awaz rokein" : "Yeh jawab suniye"}
                      className={`font-outfit inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26] ${
                        speakingId === message.id
                          ? "border-[#B43A26] bg-[#B43A26] text-white"
                          : "border-[#B43A26]/40 text-[#B43A26] hover:bg-[#B43A26]/10"
                      }`}
                    >
                      {speakingId === message.id ? <StopIcon className="h-3 w-3" /> : <PlayIcon className="h-3 w-3" />}
                      <span>{speakingId === message.id ? "Rok dein" : "Suniye"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div
              className="self-start rounded-2xl border border-[#B43A26]/30 bg-white/70 px-3.5 py-2.5"
              aria-label="RAZAB AI likh raha hai"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#B43A26]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#B43A26] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#B43A26] [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ERROR STATE */}
        {error && (
          <p
            role="alert"
            className="font-outfit rounded-xl border border-red-300 bg-red-100/90 p-2.5 text-xs font-semibold text-red-900"
          >
            {error}
          </p>
        )}

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
          <div className="flex items-center gap-2.5">
            {/* Urdu / English Language Selector */}
            <div
              className="inline-flex items-center rounded-full border border-[#B43A26]/30 bg-white/80 p-0.5 shadow-sm backdrop-blur-md"
              role="group"
              aria-label="Zabaan"
            >
              <button
                type="button"
                onClick={() => setInputLang("ur")}
                className={`font-urdu rounded-full px-3 py-0.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26] ${
                  inputLang === "ur" ? "bg-[#B43A26] text-white" : "text-[#661D15] hover:text-[#B43A26]"
                }`}
              >
                اردو
              </button>
              <button
                type="button"
                onClick={() => setInputLang("en")}
                className={`font-outfit rounded-full px-3 py-0.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26] ${
                  inputLang === "en" ? "bg-[#B43A26] text-white" : "text-[#661D15] hover:text-[#B43A26]"
                }`}
              >
                English
              </button>
            </div>

            {/* Read Aloud Checkbox */}
            <label className="font-outfit inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#3D1E1A]">
              <input
                type="checkbox"
                checked={ttsEnabled}
                disabled={!ttsSupported}
                onChange={(e) => {
                  setTtsEnabled(e.target.checked);
                  if (!e.target.checked) stopSpeaking();
                }}
                className="h-3.5 w-3.5 rounded accent-[#B43A26] focus:ring-[#B43A26]"
              />
              Jawab awaz mein sunein
            </label>
          </div>

          {/* Voice Selector */}
          {ttsEnabled && ttsSupported && voiceOptions.length > 0 && (
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              aria-label="Awaz chunein"
              className="font-outfit max-w-[180px] rounded-lg border border-[#B43A26]/30 bg-white/90 px-2 py-0.5 text-xs font-medium text-[#3D1E1A] shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26]"
            >
              {voiceOptions.map((option) => (
                <option key={option.uri} value={option.uri}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* INPUT FORM WITH PERFECT ALIGNMENT */}
        <form
          className="flex items-center gap-2.5 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              dir={inputLang === "ur" ? "rtl" : "ltr"}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={inputLang === "ur" ? "اپنا سوال یہاں لکھیں…" : "Ask about RAZAB Tabraiz's poetry…"}
              aria-label="Apna sawal likhein"
              className={`w-full h-12 max-h-36 resize-none rounded-2xl border border-[#B43A26]/30 bg-white/90 px-4 py-2.5 text-[#2B0E12] shadow-sm backdrop-blur-md placeholder:text-[#661D15]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26] ${
                inputLang === "ur"
                  ? "font-urdu text-lg font-medium leading-normal"
                  : "font-outfit text-sm font-normal leading-normal"
              }`}
              style={{ overflowY: 'hidden', resize: 'none' }}
            />
            {interimTranscript && (
              <p className="font-outfit pointer-events-none absolute -bottom-5 left-2 text-xs italic font-semibold text-[#661D15]">
                {interimTranscript}
              </p>
            )}
          </div>

          {/* Mic Button */}
          {micSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              aria-pressed={isListening}
              aria-label={isListening ? "Sunna band karein" : "Bol kar poochhein"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors shadow-sm backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26] ${
                isListening
                  ? "animate-pulse border-[#B43A26] bg-[#B43A26] text-white"
                  : "border-[#B43A26]/30 bg-white/90 text-[#3D1E1A] hover:bg-[#B43A26] hover:text-white"
              }`}
            >
              <MicIcon className="h-5 w-5" />
            </button>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="font-outfit inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#D68878] px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#B43A26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B43A26] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
            <span>Bhejein</span>
          </button>
        </form>
      </main>
    </div>
  );
}