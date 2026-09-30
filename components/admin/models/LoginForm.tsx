"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      toast.error("Please fill in all fields", {
        style: {
          background: "#4A2B2B",
          color: "#FFF3EF",
        },
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("/api/admin/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      if (response.data?.success) {
        toast.success(response.data.message || "Login successful!", {
          style: {
            background: "#2B4735",
            color: "#FFF3EF",
          },
        });

        setTimeout(() => {
          router.push("/admin/dashboard");
          router.refresh();
        }, 1000);
      } else {
        toast.error(response.data?.message || "Login failed", {
          style: {
            background: "#4A2B2B",
            color: "#FFF3EF",
          },
        });
      }
    } catch (error: unknown) {
      console.error("Login error:", error);

      let message = "An unexpected error occurred.";

      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;

          if (status === 429) {
            message =
              "Too many login attempts. Please try again later.";
          } else {
            message =
              error.response.data?.message || "Login failed";
          }
        } else if (error.request) {
          message =
            "Network error. Please check your connection.";
        } else {
          message =
            error.message || "An unexpected error occurred.";
        }
      }

      toast.error(message, {
        style: {
          background: "#4A2B2B",
          color: "#FFF3EF",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ width: "auto", maxWidth: "90%" }}
        toastClassName="custom-toast"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-100"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identifier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Account Name / Email / Phone{" "}
              <span className="text-[#9F3F1C]">*</span>
            </label>

            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-[#9F3F1C] focus:ring-2 focus:ring-[#9F3F1C]/20 transition-all duration-200 outline-none"
                placeholder="Enter account name, email or phone"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password <span className="text-[#9F3F1C]">*</span>
            </label>

            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 rounded-lg border-2 border-gray-200 focus:border-[#9F3F1C] focus:ring-2 focus:ring-[#9F3F1C]/20 transition-all duration-200 outline-none"
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full py-3 rounded-lg text-white font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? "linear-gradient(135deg, #9F3F1C80, #7A2F1580)"
                : "linear-gradient(135deg, #9F3F1C, #7A2F15)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>

                Logging in...
              </span>
            ) : (
              "Login to Dashboard"
            )}
          </motion.button>

          {/* Sign Up */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              href="/admin/sign-up"
              className="font-medium transition-colors hover:underline"
              style={{ color: "#9F3F1C" }}
            >
              Sign up
            </Link>
          </p>
        </form>
      </motion.div>
    </>
  );
}