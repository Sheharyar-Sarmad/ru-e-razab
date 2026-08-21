// components/shared/NotFoundClient.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { COLORS } from "@/lib/colors";
import { motion } from "framer-motion";

interface NotFoundClientProps {
  isAdminRoute: boolean;
}

export default function NotFoundClient({ isAdminRoute }: NotFoundClientProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: COLORS.warmWhite }}>
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="relative w-24 h-24">
            <Image
              src="/logo.png"
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

        {/* 404 Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-8xl font-bold tracking-tight"
          style={{ color: COLORS.burntRust }}
        >
          404
        </motion.h1>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4"
        >
          <h2 className="text-2xl font-semibold" style={{ color: COLORS.deepForest }}>
            Page Not Found
          </h2>
          <p className="mt-2 text-gray-600">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href="/"
            className="px-6 py-3 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})` }}
          >
            Go Home
          </Link>
          {isAdminRoute && (
            <Link
              href="/admin/dashboard"
              className="px-6 py-3 font-medium rounded-xl border-2 transition-all duration-300 hover:bg-opacity-10"
              style={{
                borderColor: COLORS.deepForest,
                color: COLORS.deepForest,
                background: "transparent",
              }}
            >
              Dashboard
            </Link>
          )}
        </motion.div>

        {/* Decorative Line */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 h-0.5 max-w-xs mx-auto"
          style={{ background: COLORS.dustyRose }}
        />

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 text-sm text-gray-400"
        >
          If you think this is a mistake, please contact support.
        </motion.p>
      </div>
    </div>
  );
}