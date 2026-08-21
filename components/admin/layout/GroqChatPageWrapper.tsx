// components/admin/layout/GroqChatPageWrapper.tsx
"use client";

import { useState, useRef, useEffect } from "react";
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
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";
import { toast } from "react-toastify";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Platform Stats", icon: ChartBarIcon, query: "Show me the platform overview and key metrics." },
  { label: "Growth Trends", icon: DocumentTextIcon, query: "What are the monthly trends for content and users?" },
  { label: "Active Users", icon: EyeIcon, query: "How many active users do we have?" },
  { label: "Anomalies", icon: ChatBubbleLeftIcon, query: "Are there any anomalous ghazals?" },
];

// Configure marked for tables and GFM
marked.setOptions({
  gfm: true,
  breaks: true,
  tables: true,
});

// ─── Logger utility ──────────────────────────────────────────────
const logger = {
  info: (component: string, message: string, data?: any) => {
    console.log(
      `%c[${component}] ${message}`,
      'color: #2563eb; font-weight: bold;',
      data ? data : ''
    );
  },
  success: (component: string, message: string, data?: any) => {
    console.log(
      `%c[${component}] ✅ ${message}`,
      'color: #16a34a; font-weight: bold;',
      data ? data : ''
    );
  },
  warn: (component: string, message: string, data?: any) => {
    console.warn(
      `%c[${component}] ⚠️ ${message}`,
      'color: #ea580c; font-weight: bold;',
      data ? data : ''
    );
  },
  error: (component: string, message: string, error?: any) => {
    console.error(
      `%c[${component}] ❌ ${message}`,
      'color: #dc2626; font-weight: bold;',
      error || ''
    );
  },
  debug: (component: string, message: string, data?: any) => {
    console.debug(
      `%c[${component}] 🔍 ${message}`,
      'color: #7c3aed; font-weight: bold;',
      data ? data : ''
    );
  }
};

export default function GroqChatPageWrapper() {
  const COMPONENT = 'GroqChatPageWrapper';
  
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm RAZAB AI, your administrative assistant. How can I help you manage Ru-e-Razab today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOnline] = useState(true);

  // ─── Voice recognition state ────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState("");

  logger.info(COMPONENT, 'Component mounted');

  // ─── Auto‑scroll ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // ─── Focus input ───────────────────────────────────────────────
  useEffect(() => {
    if (isVisible && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
        logger.debug(COMPONENT, 'Input focused');
      }, 100);
    }
  }, [isVisible, isMinimized]);

  // ─── Check browser support on mount ──────────────────────────
  useEffect(() => {
    logger.info(COMPONENT, 'Checking browser speech recognition support');
    
    if (typeof window === "undefined") {
      logger.warn(COMPONENT, 'Window is undefined (SSR environment)');
      setVoiceSupported(false);
      return;
    }

    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (SpeechRecognition) {
      logger.success(COMPONENT, 'Speech recognition is supported', { 
        browser: navigator.userAgent,
        hasSpeechRecognition: !!SpeechRecognition
      });
      setVoiceSupported(true);
    } else {
      logger.warn(COMPONENT, 'Speech recognition is NOT supported in this browser', {
        browser: navigator.userAgent,
        availableAPIs: {
          SpeechRecognition: !!(window as any).SpeechRecognition,
          webkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
          mozSpeechRecognition: !!(window as any).mozSpeechRecognition,
          msSpeechRecognition: !!(window as any).msSpeechRecognition,
        }
      });
      setVoiceSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        logger.info(COMPONENT, 'Cleaning up recognition instance');
        try {
          recognitionRef.current.abort();
          logger.success(COMPONENT, 'Recognition cleaned up successfully');
        } catch (e) {
          logger.warn(COMPONENT, 'Error during recognition cleanup', e);
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  // ─── Initialize Speech Recognition ───────────────────────────
  const initSpeechRecognition = () => {
    logger.info(COMPONENT, 'Initializing speech recognition');
    
    if (typeof window === "undefined") {
      logger.warn(COMPONENT, 'Cannot initialize in SSR environment');
      return null;
    }

    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      logger.error(COMPONENT, 'No SpeechRecognition API found');
      setVoiceSupported(false);
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;
      
      logger.success(COMPONENT, 'Speech recognition initialized successfully', {
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        lang: recognition.lang,
        maxAlternatives: recognition.maxAlternatives
      });
      
      return recognition;
    } catch (error) {
      logger.error(COMPONENT, 'Failed to initialize speech recognition', error);
      return null;
    }
  };

  // ─── Start voice recognition ──────────────────────────────────
  const startListening = () => {
    logger.info(COMPONENT, 'startListening called');
    
    if (voiceSupported === false) {
      logger.warn(COMPONENT, 'Voice not supported, showing error toast');
      toast.error("Voice recognition is not supported in this browser.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
      return;
    }

    if (isLoading) {
      logger.warn(COMPONENT, 'Cannot start listening while loading');
      return;
    }

    // Initialize recognition if not already created
    if (!recognitionRef.current) {
      logger.info(COMPONENT, 'Creating new recognition instance');
      const recognition = initSpeechRecognition();
      if (!recognition) {
        logger.error(COMPONENT, 'Failed to create recognition instance');
        setVoiceSupported(false);
        toast.error("Failed to initialize voice recognition.", {
          style: { background: "#4A2B2B", color: "#FFF3EF" },
          progressStyle: { background: "#BD4D23" },
        });
        return;
      }
      recognitionRef.current = recognition;
    }

    // Clean up any existing recognition session
    try {
      if (recognitionRef.current._isActive) {
        logger.info(COMPONENT, 'Aborting previous recognition session');
        recognitionRef.current.abort();
      }
    } catch (e) {
      logger.debug(COMPONENT, 'No active session to abort', e);
    }

    // Set up event handlers
    const recognition = recognitionRef.current;
    logger.info(COMPONENT, 'Setting up event handlers');

    recognition.onstart = () => {
      logger.success(COMPONENT, '🎤 Recognition started - microphone is active');
      setIsListening(true);
      setTranscript("");
    };

    recognition.onaudiostart = () => {
      logger.debug(COMPONENT, 'Audio capture started');
    };

    recognition.onaudioend = () => {
      logger.debug(COMPONENT, 'Audio capture ended');
    };

    recognition.onsoundstart = () => {
      logger.debug(COMPONENT, 'Sound detected');
    };

    recognition.onsoundend = () => {
      logger.debug(COMPONENT, 'Sound ended');
    };

    recognition.onspeechstart = () => {
      logger.debug(COMPONENT, 'Speech started');
    };

    recognition.onspeechend = () => {
      logger.debug(COMPONENT, 'Speech ended - auto-stopping after 1s');
      setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
            logger.info(COMPONENT, 'Auto-stopped recognition after speech ended');
          } catch (e) {
            logger.warn(COMPONENT, 'Error auto-stopping recognition', e);
          }
        }
        setIsListening(false);
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      logger.debug(COMPONENT, 'Result event received', { 
        resultCount: event.results.length,
        resultIndex: event.resultIndex
      });
      
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        const confidence = result[0].confidence;
        
        logger.debug(COMPONENT, `Result ${i}:`, { 
          transcript: transcriptText,
          confidence: confidence,
          isFinal: result.isFinal
        });
        
        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      if (interimTranscript) {
        logger.debug(COMPONENT, 'Interim transcript updated', { transcript: interimTranscript });
        setInput(interimTranscript);
        setTranscript(interimTranscript);
      }

      if (finalTranscript) {
        logger.success(COMPONENT, '🎤 Final transcript received', { transcript: finalTranscript });
        setInput(finalTranscript);
        setTranscript(finalTranscript);
        setIsListening(false);
        
        // Send the message after a short delay
        setTimeout(() => {
          if (finalTranscript.trim()) {
            logger.info(COMPONENT, 'Sending voice message', { message: finalTranscript.trim() });
            handleSend(finalTranscript.trim());
          } else {
            logger.warn(COMPONENT, 'Empty transcript - not sending');
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      logger.error(COMPONENT, 'Recognition error occurred', {
        error: event.error,
        message: event.message,
        type: event.type
      });
      
      setIsListening(false);
      
      // Handle specific error types
      switch(event.error) {
        case 'no-speech':
          logger.warn(COMPONENT, 'No speech detected - user didn\'t speak');
          setInput(transcript || "");
          toast.info("No speech detected. Please try again.", {
            style: { background: "#2B4735", color: "#FFF3EF" },
            progressStyle: { background: "#A964FF" },
            autoClose: 2000,
          });
          break;
        case 'aborted':
          logger.info(COMPONENT, 'Recognition aborted by user');
          break;
        case 'not-allowed':
          logger.error(COMPONENT, 'Microphone permission denied');
          toast.error("Microphone access denied. Please allow microphone access.", {
            style: { background: "#4A2B2B", color: "#FFF3EF" },
            progressStyle: { background: "#BD4D23" },
          });
          break;
        case 'audio-capture':
          logger.error(COMPONENT, 'No microphone found');
          toast.error("No microphone found. Please check your audio device.", {
            style: { background: "#4A2B2B", color: "#FFF3EF" },
            progressStyle: { background: "#BD4D23" },
          });
          break;
        case 'network':
          logger.error(COMPONENT, 'Network error during recognition');
          toast.error("Network error. Please check your connection.", {
            style: { background: "#4A2B2B", color: "#FFF3EF" },
            progressStyle: { background: "#BD4D23" },
          });
          break;
        default:
          logger.error(COMPONENT, 'Unhandled recognition error', event.error);
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            toast.error(`Voice error: ${event.error}`, {
              style: { background: "#4A2B2B", color: "#FFF3EF" },
              progressStyle: { background: "#BD4D23" },
            });
          }
      }
    };

    recognition.onend = () => {
      logger.info(COMPONENT, 'Recognition ended');
      setIsListening(false);
    };

    // Start listening
    try {
      logger.info(COMPONENT, 'Attempting to start recognition');
      recognition.start();
      recognition._isActive = true;
      logger.success(COMPONENT, 'Recognition started successfully');
      
      toast.info("🎤 Listening... Speak now.", {
        style: { background: "#2B4735", color: "#FFF3EF" },
        progressStyle: { background: "#A964FF" },
        autoClose: 3000,
      });
    } catch (error) {
      logger.error(COMPONENT, 'Failed to start recognition', error);
      setIsListening(false);
      toast.error("Failed to start voice recognition. Please try again.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
    }
  };

  // ─── Stop voice recognition ──────────────────────────────────
  const stopListening = () => {
    logger.info(COMPONENT, 'Stopping voice recognition');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current._isActive = false;
        logger.success(COMPONENT, 'Recognition stopped successfully');
      } catch (e) {
        logger.warn(COMPONENT, 'Error stopping recognition', e);
        try {
          recognitionRef.current.stop();
          recognitionRef.current._isActive = false;
          logger.success(COMPONENT, 'Recognition stopped via stop()');
        } catch (err) {
          logger.error(COMPONENT, 'Failed to stop recognition', err);
        }
      }
    } else {
      logger.warn(COMPONENT, 'No recognition instance to stop');
    }
    
    setIsListening(false);
  };

  // ─── Toggle voice listening ──────────────────────────────────
  const toggleListening = () => {
    logger.info(COMPONENT, 'toggleListening called', { currentState: isListening });
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ─── Clean markdown ───────────────────────────────────────────
  const cleanMarkdown = (text: string): string => {
    if (!text) return "";
    let cleaned = text;
    cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned;
  };

  // ─── Convert markdown to HTML ────────────────────────────────
  const renderMarkdown = (content: string): string => {
    try {
      return marked(content);
    } catch (e) {
      logger.error(COMPONENT, 'Markdown parsing error', e);
      return content;
    }
  };

  // ─── Copy to clipboard ─────────────────────────────────────────
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logger.success(COMPONENT, 'Copied to clipboard');
      toast.success("Copied to clipboard!", {
        style: { background: "#2B4735", color: "#FFF3EF" },
        progressStyle: { background: "#A964FF" },
      });
    } catch (error) {
      logger.error(COMPONENT, 'Failed to copy to clipboard', error);
      toast.error("Failed to copy.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
    }
  };

  // ─── Print ─────────────────────────────────────────────────────
  const handlePrint = () => {
    logger.info(COMPONENT, 'Print requested');
    window.print();
  };

  // ─── Send message ──────────────────────────────────────────────
  const handleSend = async (query?: string) => {
    const messageText = query || input.trim();
    logger.info(COMPONENT, 'handleSend called', { 
      hasQuery: !!query,
      messageLength: messageText.length,
      isLoading 
    });
    
    if (!messageText || isLoading) {
      logger.warn(COMPONENT, 'Send blocked', { 
        isEmpty: !messageText, 
        isLoading 
      });
      return;
    }

    // Stop listening if active
    if (isListening) {
      logger.info(COMPONENT, 'Stopping listening before sending');
      stopListening();
    }

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingMessage("");
    
    logger.info(COMPONENT, 'Sending message to API', { 
      messageCount: messages.length + 1,
      messagePreview: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : '')
    });

    try {
      const response = await fetch("/api/admin/dashboard/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        logger.error(COMPONENT, 'API response not OK', { status: response.status });
        throw new Error(`Failed to get response: ${response.status}`);
      }

      logger.success(COMPONENT, 'API response received, starting stream');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let done = false;
      let accumulated = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              logger.info(COMPONENT, 'Stream complete');
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingMessage(cleanMarkdown(accumulated));
              }
            } catch (e) {
              logger.debug(COMPONENT, 'Error parsing stream data', e);
            }
          }
        }
      }

      if (accumulated) {
        logger.success(COMPONENT, 'Message received successfully', {
          length: accumulated.length
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cleanMarkdown(accumulated) },
        ]);
      } else {
        logger.warn(COMPONENT, 'No content received from API');
      }
      setStreamingMessage("");
    } catch (error) {
      logger.error(COMPONENT, 'Chat error', error);
      toast.error("Failed to get response from AI.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingMessage("");
      logger.debug(COMPONENT, 'Loading state reset');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      logger.debug(COMPONENT, 'Enter key pressed, sending message');
      handleSend();
    }
  };

  const clearChat = () => {
    if (messages.length <= 1) {
      logger.debug(COMPONENT, 'Chat clear blocked - only system message exists');
      return;
    }
    logger.info(COMPONENT, 'Clearing chat', { messageCount: messages.length });
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help you today?",
      },
    ]);
  };

  const toggleMinimize = () => {
    logger.debug(COMPONENT, 'Toggle minimize', { current: isMinimized });
    setIsMinimized(!isMinimized);
  };
  
  const closeChat = () => {
    logger.info(COMPONENT, 'Closing chat');
    setIsVisible(false);
  };

  // ─── Placeholder when closed ──────────────────────────────────
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
          style={{
            background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
          }}
        >
          <SparklesIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Chat Closed</h3>
        <p className="text-gray-500 text-sm max-w-md">
          RAZAB AI Assistant is currently closed. Click the button below to reopen and continue your conversation.
        </p>
        <button
          onClick={() => {
            logger.info(COMPONENT, 'Reopening chat from closed state');
            setIsVisible(true);
          }}
          className="mt-6 px-6 py-2.5 text-white rounded-xl hover:shadow-lg transition"
          style={{
            background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
          }}
        >
          Reopen Chat
        </button>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          onClick={() => {
            logger.info(COMPONENT, 'Reopening chat from FAB');
            setIsVisible(true);
          }}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-full text-white shadow-2xl hover:shadow-xl transition"
          style={{
            background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
          }}
        >
          <SparklesIcon className="w-6 h-6" />
        </motion.button>
      </motion.div>
    );
  }

  // ─── Main chat panel ──────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #chat-to-print,
          #chat-to-print * {
            visibility: visible;
          }
          #chat-to-print {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white;
            padding: 2rem;
            overflow: auto;
          }
          #chat-to-print .no-print {
            display: none !important;
          }
          #chat-to-print .message-bubble {
            border: 1px solid #ddd;
            margin-bottom: 1rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
          }
          #chat-to-print .assistant-message {
            background: #f9f9f9;
          }
          #chat-to-print .user-message {
            background: #fff3ef;
          }
        }

        /* Markdown styles for assistant messages */
        .assistant-content {
          font-size: 0.875rem;
          line-height: 1.6;
          color: #1f2937;
        }
        .assistant-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.875rem;
        }
        .assistant-content th,
        .assistant-content td {
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .assistant-content th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        .assistant-content tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .assistant-content ul,
        .assistant-content ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .assistant-content li {
          margin: 0.25rem 0;
        }
        .assistant-content p {
          margin: 0.5rem 0;
        }
        .assistant-content strong {
          font-weight: 600;
          color: #111827;
        }
        .assistant-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1rem 0;
        }
        .assistant-content pre {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-size: 0.8rem;
        }
        .assistant-content code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8rem;
        }
        .assistant-content blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1rem;
          margin: 0.5rem 0;
          color: #4b5563;
        }
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
          {/* ─── Header ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gradient-to-r from-[#FFF3EF] to-white flex-shrink-0 no-print">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
                }}
              >
                <SparklesIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 text-sm">RAZAB AI Assistant</h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-[10px] text-gray-400">
                    {isOnline ? "Online" : "Offline"}
                  </span>
                  {voiceSupported !== null && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      voiceSupported ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {voiceSupported ? "🎤 Voice Ready" : "🚫 No Voice"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
                {isMinimized ? (
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                ) : (
                  <ArrowsPointingInIcon className="w-4 h-4" />
                )}
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
              {/* ─── Quick Actions ──────────────────────────────────────── */}
              <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50/80 border-b border-gray-100 flex-shrink-0 no-print">
                {QUICK_ACTIONS.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        logger.debug(COMPONENT, 'Quick action clicked', { action: action.label });
                        handleSend(action.query);
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-[#A5421D] hover:text-[#A5421D] transition-colors disabled:opacity-50"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ─── Messages ────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
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
                          <button
                            onClick={() => copyToClipboard(msg.content)}
                            className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 no-print cursor-pointer"
                          >
                            <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                            Copy
                          </button>
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {streamingMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm">
                      <div
                        className="assistant-content"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(streamingMessage),
                        }}
                      />
                      <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1" />
                    </div>
                  </motion.div>
                )}

                {isLoading && !streamingMessage && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm">
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

              {/* ─── Input ────────────────────────────────────────────────── */}
              <div className="p-4 border-t border-gray-100 bg-white flex-shrink-0 no-print">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      logger.debug(COMPONENT, 'Input changed', { 
                        length: e.target.value.length 
                      });
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "🎤 Listening..." : "Ask me anything about the platform..."}
                    disabled={isLoading || isListening}
                    className={`flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A5421D] focus:border-transparent outline-none text-sm ${
                      isListening ? "bg-red-50 border-red-300 animate-pulse" : "bg-gray-50"
                    }`}
                  />
                  {/* ─── Voice button ────────────────────────────────────── */}
                  <button
                    onClick={() => {
                      logger.debug(COMPONENT, 'Voice button clicked', { isListening });
                      toggleListening();
                    }}
                    disabled={isLoading || voiceSupported === false}
                    className={`px-3 py-2.5 rounded-xl transition-all ${
                      isListening
                        ? "bg-red-500 text-white scale-110 shadow-lg"
                        : voiceSupported === false
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300 hover:scale-105"
                    } disabled:opacity-50`}
                    title={isListening ? "Stop listening" : voiceSupported ? "Voice input" : "Voice not supported"}
                  >
                    {isListening ? (
                      <StopIcon className="w-5 h-5" />
                    ) : (
                      <MicrophoneIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      logger.debug(COMPONENT, 'Send button clicked');
                      handleSend();
                    }}
                    disabled={isLoading || !input.trim() || isListening}
                    className="px-4 py-2.5 bg-[#A5421D] text-white rounded-xl hover:bg-[#8a3618] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2 no-print">
                  <p className="text-[10px] text-gray-400">
                    RAZAB AI – Admin Assistant • v1.0
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {isListening ? "🎤 Listening..." : voiceSupported ? "Powered by Groq" : "Voice: Not Supported"}
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}