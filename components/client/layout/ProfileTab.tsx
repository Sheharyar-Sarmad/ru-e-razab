"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Save, Loader2 } from "lucide-react";
import apiClient from "@/lib/api";
import type { ToastKind } from "./Toast";

const THEME = {
  strawberryWhite: "#FFF7F4",
  darkOrange: "#C2410C",
  orangeGlow: "#EA580C",
  deepRed: "#B91C1C",
  emeraldGreen: "#047857",
  darkText: "#3A211B",
  mutedText: "#76584F",
  border: "#F2D6CF",
};

const NAME_REGEX = /^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/;
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PHONE_REGEX = /^(\+\d{1,3}[- ]?)?\d{10,14}$/;

export interface UserData {
  id: string;
  accountname: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FieldErrors {
  firstname?: string;
  lastname?: string;
  email?: string;
  phonenumber?: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function ProfileTab({
  user,
  onUserUpdate,
  showToast,
}: {
  user: UserData;
  onUserUpdate: (u: UserData) => void;
  showToast: (kind: ToastKind, title: string, description?: string) => void;
}) {
  const [form, setForm] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    phonenumber: user.phonenumber || "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset if user changes externally
  useEffect(() => {
    setForm({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      phonenumber: user.phonenumber || "",
    });
    setErrors({});
    setDirty(false);
  }, [user]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!form.firstname.trim()) next.firstname = "First name is required";
    else if (form.firstname.length < 2 || form.firstname.length > 50)
      next.firstname = "Must be 2–50 characters";
    else if (!NAME_REGEX.test(form.firstname))
      next.firstname = "Only letters, spaces, hyphens, apostrophes";

    if (!form.lastname.trim()) next.lastname = "Last name is required";
    else if (form.lastname.length < 2 || form.lastname.length > 50)
      next.lastname = "Must be 2–50 characters";
    else if (!NAME_REGEX.test(form.lastname))
      next.lastname = "Only letters, spaces, hyphens, apostrophes";

    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(form.email)) next.email = "Enter a valid email";

    if (form.phonenumber.trim() && !PHONE_REGEX.test(form.phonenumber))
      next.phonenumber = "Enter a valid phone (10–14 digits)";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, string> = {};
    if (form.firstname !== user.firstname) payload.firstname = form.firstname.trim();
    if (form.lastname !== user.lastname) payload.lastname = form.lastname.trim();
    if (form.email !== user.email) payload.email = form.email.toLowerCase().trim();
    if ((form.phonenumber || "") !== (user.phonenumber || ""))
      payload.phonenumber = form.phonenumber.trim();

    if (Object.keys(payload).length === 0) {
      showToast("info", "Nothing to update", "You haven't changed any fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.patch(
        "/api/client/dashboard/settings/account/update",
        payload
      );

      if (res.data?.success) {
        const updatedUser: UserData = {
          ...user,
          ...payload,
          phonenumber: payload.phonenumber ?? user.phonenumber,
        };
        onUserUpdate(updatedUser);
        setDirty(false);
        showToast(
          "success",
          "Profile updated",
          "Your changes have been saved successfully."
        );
      } else {
        showToast(
          "error",
          "Update failed",
          res.data?.message || "Something went wrong."
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Could not save changes.";
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
      {/* Name row */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field
          label="First Name"
          icon={<User size={16} />}
          value={form.firstname}
          onChange={(v) => update("firstname", v)}
          error={errors.firstname}
          placeholder="John"
          autoComplete="given-name"
        />
        <Field
          label="Last Name"
          icon={<User size={16} />}
          value={form.lastname}
          onChange={(v) => update("lastname", v)}
          error={errors.lastname}
          placeholder="Doe"
          autoComplete="family-name"
        />
      </motion.div>

      {/* Account name (read-only) */}
      <motion.div variants={item}>
        <label
          className="font-outfit mb-1.5 block text-xs font-semibold"
          style={{ color: THEME.darkText }}
        >
          Account Name
        </label>
        <div
          className="flex h-11 items-center rounded-xl border px-3.5 text-sm"
          style={{
            backgroundColor: "rgba(255, 247, 244, 0.6)",
            borderColor: THEME.border,
            color: THEME.mutedText,
          }}
        >
          <span className="font-outfit">{user.accountname}</span>
          <span
            className="ml-auto text-[10px] uppercase tracking-widest opacity-60"
          >
            Immutable
          </span>
        </div>
      </motion.div>

      {/* Email */}
      <motion.div variants={item}>
        <Field
          label="Email"
          icon={<Mail size={16} />}
          value={form.email}
          onChange={(v) => update("email", v)}
          error={errors.email}
          placeholder="john@example.com"
          type="email"
          autoComplete="email"
        />
      </motion.div>

      {/* Phone */}
      <motion.div variants={item}>
        <Field
          label="Phone Number (Optional)"
          icon={<Phone size={16} />}
          value={form.phonenumber}
          onChange={(v) => update("phonenumber", v)}
          error={errors.phonenumber}
          placeholder="+1234567890"
          type="tel"
          autoComplete="tel"
        />
      </motion.div>

      {/* Submit */}
      <motion.div variants={item} className="flex justify-end pt-2">
        <motion.button
          type="submit"
          disabled={saving || !dirty}
          whileHover={{ scale: saving || !dirty ? 1 : 1.03, y: saving || !dirty ? 0 : -2 }}
          whileTap={{ scale: saving || !dirty ? 1 : 0.97 }}
          className="font-outfit inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${THEME.darkOrange}, #7C2D12)`,
            boxShadow: dirty && !saving ? `0 12px 28px -12px ${THEME.orangeGlow}90` : undefined,
          }}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  const hasError = !!error;

  return (
    <div>
      <label
        className="font-outfit mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: THEME.darkText }}
      >
        <span style={{ color: THEME.mutedText }}>{icon}</span>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="font-outfit h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition-all focus:ring-2"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: hasError ? THEME.deepRed : THEME.border,
          color: THEME.darkText,
          // @ts-ignore — css var
          "--tw-ring-color": hasError ? `${THEME.deepRed}55` : `${THEME.darkOrange}55`,
        }}
      />
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