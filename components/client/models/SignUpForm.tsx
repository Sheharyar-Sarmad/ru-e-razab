"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import apiClient from "@/lib/api";

interface SignUpFormProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}

const THEME = {
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
  inputBg: "#FFFFFF",
};

export default function SignUpForm({ onSwitchToLogin, onSuccess }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    accountname: "",
    firstname: "",
    lastname: "",
    email: "",
    phonenumber: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await apiClient.post("/api/client/auth/sign-up", formData);

      if (res.data?.success) {
        onSuccess();
      } else {
        setErrorMsg(res.data?.message || "Failed to create account");
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "An unexpected error occurred. Please try again.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div data-gsap-field className="text-center">
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="mx-auto w-10 h-10 object-contain mb-1"
        />
        <h2 style={{ color: THEME.darkOrange }} className="text-xl font-bold font-urdu">
          اکاؤنٹ بنائیں
        </h2>
        <p style={{ color: THEME.mutedText }} className="text-xs mt-3">
          Join the Ru-e-Razab community
        </p>
      </div>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: "#FEE2E2",
            borderColor: THEME.deepRed,
            color: THEME.deepRed,
          }}
          className="p-2.5 text-xs border rounded-xl text-center font-medium"
        >
          {errorMsg}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div data-gsap-field className="grid grid-cols-2 gap-2">
          <div>
            <label style={{ color: THEME.darkText }} className="block text-xs font-semibold mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstname"
              required
              value={formData.firstname}
              onChange={handleChange}
              placeholder="John"
              style={{
                backgroundColor: THEME.inputBg,
                borderColor: THEME.border,
                color: THEME.darkText,
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#C2410C] placeholder:text-zinc-400"
            />
          </div>
          <div>
            <label style={{ color: THEME.darkText }} className="block text-xs font-semibold mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastname"
              required
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Doe"
              style={{
                backgroundColor: THEME.inputBg,
                borderColor: THEME.border,
                color: THEME.darkText,
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#C2410C] placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div data-gsap-field>
          <label style={{ color: THEME.darkText }} className="block text-xs font-semibold mb-1">
            Account Name
          </label>
          <input
            type="text"
            name="accountname"
            required
            value={formData.accountname}
            onChange={handleChange}
            placeholder="johndoe123 (lowercase, numbers, _)"
            style={{
              backgroundColor: THEME.inputBg,
              borderColor: THEME.border,
              color: THEME.darkText,
            }}
            className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#C2410C] placeholder:text-zinc-400"
          />
        </div>

        <div data-gsap-field>
          <label style={{ color: THEME.darkText }} className="block text-xs font-semibold mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            style={{
              backgroundColor: THEME.inputBg,
              borderColor: THEME.border,
              color: THEME.darkText,
            }}
            className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#C2410C] placeholder:text-zinc-400"
          />
        </div>

        <div data-gsap-field>
          <label style={{ color: THEME.darkText }} className="block text-xs font-semibold mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="text"
            name="phonenumber"
            value={formData.phonenumber}
            onChange={handleChange}
            placeholder="+1234567890"
            style={{
              backgroundColor: THEME.inputBg,
              borderColor: THEME.border,
              color: THEME.darkText,
            }}
            className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#C2410C] placeholder:text-zinc-400"
          />
        </div>

        <div data-gsap-field>
          <label style={{ color: THEME.darkText }} className="block text-xs font-semibold mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 8 chars (A-Z, a-z, 0-9, @$!%*?&)"
              style={{
                backgroundColor: THEME.inputBg,
                borderColor: THEME.border,
                color: THEME.darkText,
              }}
              className="w-full px-3 py-1.5 pr-9 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#C2410C] placeholder:text-zinc-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{ color: THEME.mutedText }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:text-[#C2410C] focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.964 9.964 0 011.774-3.522M6.343 6.343A9.964 9.964 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.98 9.98 0 01-1.575 2.925M9.878 9.878a3 3 0 104.243 4.243M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <motion.button
          data-gsap-field
          type="submit"
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          style={{
            backgroundColor: THEME.darkOrange,
            color: "#FFFFFF",
          }}
          className="w-full py-2.5 text-sm font-bold rounded-xl transition-colors shadow-md hover:bg-[#EA580C] disabled:opacity-50 mt-2"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </motion.button>
      </form>

      <div data-gsap-field style={{ color: THEME.mutedText }} className="text-center text-xs pt-1">
        Already have an account?{" "}
        <button
          onClick={onSwitchToLogin}
          style={{ color: THEME.darkOrange }}
          className="font-bold hover:underline"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}