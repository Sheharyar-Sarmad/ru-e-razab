"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import apiClient from "@/lib/api";
import type { ToastKind } from "./Toast";

const THEME = {
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

function scorePassword(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function SecurityTab({
  showToast,
}: {
  showToast: (kind: ToastKind, title: string, description?: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pwScore = scorePassword(newPassword);
  const pwLabel =
    pwScore <= 2 ? "Weak" : pwScore === 3 ? "Fair" : pwScore === 4 ? "Strong" : "Very Strong";
  const pwColor =
    pwScore <= 2 ? THEME.deepRed : pwScore === 3 ? THEME.darkOrange : THEME.emeraldGreen;

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!currentPassword) next.currentPassword = "Current password is required";

    if (!newPassword) next.newPassword = "New password is required";
    else if (newPassword.length < 8)
      next.newPassword = "Must be at least 8 characters";
    else if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    )
      next.newPassword =
        "Must include uppercase, lowercase, number & special character";

    if (newPassword !== confirmPassword)
      next.confirmPassword = "Passwords do not match";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await apiClient.patch(
        "/api/client/dashboard/settings/account/update",
        { currentPassword, newPassword }
      );

      if (res.data?.success) {
        showToast(
          "success",
          "Password updated",
          "Your password has been changed successfully."
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
      } else {
        showToast(
          "error",
          "Update failed",
          res.data?.message || "Could not change password."
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Could not change password.";
      showToast("error", "Update failed", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
      noValidate
    >
      {/* Info banner */}
      <motion.div
        variants={item}
        className="flex items-start gap-3 rounded-2xl border p-4"
        style={{
          backgroundColor: `${THEME.emeraldGreen}08`,
          borderColor: `${THEME.emeraldGreen}30`,
        }}
      >
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${THEME.emeraldGreen}20` }}
        >
          <ShieldCheck size={16} style={{ color: THEME.emeraldGreen }} />
        </div>
        <div>
          <p
            className="font-outfit text-sm font-semibold"
            style={{ color: THEME.darkText }}
          >
            Keep your account secure
          </p>
          <p
            className="font-outfit mt-0.5 text-xs leading-relaxed"
            style={{ color: THEME.mutedText }}
          >
            Use a strong password with a mix of uppercase, lowercase, numbers
            and symbols. Never reuse passwords across sites.
          </p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <PasswordField
          label="Current Password"
          value={currentPassword}
          onChange={(v) => {
            setCurrentPassword(v);
            if (errors.currentPassword)
              setErrors((prev) => ({ ...prev, currentPassword: "" }));
          }}
          show={showCurrent}
          toggle={() => setShowCurrent((s) => !s)}
          error={errors.currentPassword}
          autoComplete="current-password"
        />
      </motion.div>

      <motion.div variants={item}>
        <PasswordField
          label="New Password"
          value={newPassword}
          onChange={(v) => {
            setNewPassword(v);
            if (errors.newPassword)
              setErrors((prev) => ({ ...prev, newPassword: "" }));
          }}
          show={showNew}
          toggle={() => setShowNew((s) => !s)}
          error={errors.newPassword}
          autoComplete="new-password"
        />

        {/* Strength bar */}
        {newPassword && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ backgroundColor: THEME.border }}
              >
                <motion.div
                  animate={{ width: `${(pwScore / 5) * 100}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: pwColor }}
                />
              </div>
              <span
                className="font-outfit text-[11px] font-semibold"
                style={{ color: pwColor }}
              >
                {pwLabel}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={item}>
        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: "" }));
          }}
          show={showConfirm}
          toggle={() => setShowConfirm((s) => !s)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
      </motion.div>

      <motion.div variants={item} className="flex justify-end pt-2">
        <motion.button
          type="submit"
          disabled={saving}
          whileHover={{ scale: saving ? 1 : 1.03, y: saving ? 0 : -2 }}
          whileTap={{ scale: saving ? 1 : 0.97 }}
          className="font-outfit inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Updating…
            </>
          ) : (
            <>
              <Lock size={16} />
              Update Password
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  toggle,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  error?: string;
  autoComplete?: string;
}) {
  const hasError = !!error;
  return (
    <div>
      <label
        className="font-outfit mb-1.5 block text-xs font-semibold"
        style={{ color: THEME.darkText }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="font-outfit h-11 w-full rounded-xl border px-3.5 pr-11 text-sm outline-none transition-all focus:ring-2"
          style={
            {
              backgroundColor: "#FFFFFF",
              borderColor: hasError ? THEME.deepRed : THEME.border,
              color: THEME.darkText,
              "--tw-ring-color": hasError
                ? `${THEME.deepRed}55`
                : `${THEME.darkOrange}55`,
            } as CSSProperties
          }
        />
        <button
          type="button"
          onClick={toggle}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity hover:opacity-70"
          style={{ color: THEME.mutedText }}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hasError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-outfit mt-1.5 text-[11px]"
          style={{ color: THEME.deepRed }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}