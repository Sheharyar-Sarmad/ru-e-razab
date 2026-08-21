// components/admin/jadeed-kalam/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop – full viewport, behind content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 1 }}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{
              background: `linear-gradient(145deg, ${COLORS.warmWhite}, #fff)`,
              border: `1px solid ${COLORS.deepForest}20`,
              zIndex: 2,
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between p-4 border-b font-urdu"
              style={{
                background: `linear-gradient(135deg, ${COLORS.warmWhite}, ${COLORS.deepForest}08)`,
                borderColor: `${COLORS.deepForest}20`,
              }}
            >
              <h2 className="text-xl font-bold" style={{ color: COLORS.deepForest }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-colors hover:bg-black/5"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" style={{ color: COLORS.deepForest }} />
              </button>
            </div>

            {/* Content – apply Urdu font & RTL */}
            <div className="p-6 font-urdu" dir="rtl">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}