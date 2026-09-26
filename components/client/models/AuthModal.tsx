"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import ThreeBackground from "../layout/ThreeBackground";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  onSuccess?: () => void;
}

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Lock background page scroll while the modal is open, without causing
  // a layout shift when the scrollbar disappears.
  useEffect(() => {
    if (!isOpen) return;

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Subtle GSAP entrance for the inner panel content (adds to the framer-motion
  // container animation rather than fighting it).
  useEffect(() => {
    if (isOpen && panelRef.current) {
      gsap.fromTo(
        panelRef.current.querySelectorAll("[data-gsap-field]"),
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: "power2.out",
          delay: 0.1,
        }
      );
    }
  }, [isOpen, mode]);

  return (
    <AnimatePresence>
      {isOpen && (
        // Fixed, full-viewport overlay. Using h-[100dvh] (with a 100vh fallback
        // via inset-0) guarantees correct height on mobile browsers where 100vh
        // is taller than the visible viewport because of address-bar chrome.
        <motion.div
          key="auth-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-y-auto bg-[#3A211B]/65 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          {/* Click-outside backdrop */}
          <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

          {/* Three.js ambient background, clipped to the overlay */}
          <ThreeBackground className="opacity-40" particleColor="#EA580C" density={500} />

          {/* Centering container — flex + min-h-full guarantees the panel is
              vertically centered and never clipped at the top on short viewports,
              and scrolls internally if content is taller than the screen. */}
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-left">
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                backgroundColor: THEME.strawberryWhite,
                borderColor: THEME.border,
                color: THEME.darkText,
              }}
              className="relative z-10 w-full max-w-md my-8 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-3xl p-6 sm:p-8 shadow-2xl border"
            >
              {/* Close Modal Button */}
              <button
                onClick={onClose}
                style={{ color: THEME.mutedText }}
                className="absolute cursor-pointer top-4 right-4 p-2 rounded-full hover:bg-[#F2D6CF]/50 transition-colors focus:outline-none"
                aria-label="Close Modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Form Toggle */}
              {mode === "login" ? (
                <LoginForm
                  onSwitchToSignUp={() => setMode("signup")}
                  onSuccess={() => {
                    if (onSuccess) onSuccess();
                  }}
                />
              ) : (
                <SignUpForm
                  onSwitchToLogin={() => setMode("login")}
                  onSuccess={() => {
                    if (onSuccess) onSuccess();
                  }}
                />
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}