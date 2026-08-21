// components/admin/layout/SettingsClient.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { COLORS } from "@/lib/colors";
import axios from "axios";

interface AdminData {
  _id: string;
  accountname: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsClientProps {
  initialAdmin: AdminData | null;
}

export default function SettingsClient({ initialAdmin }: SettingsClientProps) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminData | null>(initialAdmin);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ─── Form fields ──────────────────────────────────────────────
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ─── Populate form when admin data loads ─────────────────────
  useEffect(() => {
    if (admin) {
      setFirstname(admin.firstname || "");
      setLastname(admin.lastname || "");
      setEmail(admin.email || "");
      setPhonenumber(admin.phonenumber || "");
    }
  }, [admin]);

  // ─── Handle form submission ──────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!firstname.trim() || !lastname.trim() || !email.trim()) {
      toast.error("Please fill in all required fields (Name, Email).", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
      return;
    }

    // Validate password change
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.", {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
      return;
    }

    // Prepare update data
    const updateData: any = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      email: email.trim(),
      phonenumber: phonenumber.trim() || undefined,
    };

    if (newPassword) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    setLoading(true);

    try {
      const response = await axios.patch(
        "/api/admin/dashboard/settings/account/update",
        updateData
      );

      if (response.data.success) {
        toast.success("Account updated successfully!", {
          style: { background: "#2B4735", color: "#FFF3EF" },
          progressStyle: { background: "#A964FF" },
        });

        // Update local admin data
        setAdmin(response.data.data);

        // Clear password fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Refresh the page to update sidebar / user info
        router.refresh();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update account.";
      toast.error(message, {
        style: { background: "#4A2B2B", color: "#FFF3EF" },
        progressStyle: { background: "#BD4D23" },
      });
    } finally {
      setLoading(false);
    }
  };

  const required = <span className="text-red-500 ml-1">*</span>;

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ width: "auto", maxWidth: "90%" }}
        toastClassName="custom-toast"
      />

      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: COLORS.deepForest }}>
            Account Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Update your admin account information</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ─── Account Name (read‑only) ───────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={admin?.accountname || "—"}
                  disabled
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Account name cannot be changed.</p>
            </div>

            {/* ─── First & Last Name ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name {required}
                </label>
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name {required}
                </label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* ─── Email ────────────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address {required}
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            {/* ─── Phone Number ────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
                <span className="text-gray-400 text-xs ml-1">(optional, use +923001234567 format)</span>
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phonenumber}
                  onChange={(e) => setPhonenumber(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                  placeholder="+923001234567"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* ─── Password Section ─────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Change Password</h3>
              <div className="space-y-4">
                {newPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password {required}
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required={!!newPassword}
                        className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showCurrentPassword ? (
                          <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <EyeIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                    <span className="text-gray-400 text-xs ml-1">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                </div>

                {newPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password {required}
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required={!!newPassword}
                        className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Submit ───────────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  if (admin) {
                    setFirstname(admin.firstname || "");
                    setLastname(admin.lastname || "");
                    setEmail(admin.email || "");
                    setPhonenumber(admin.phonenumber || "");
                  }
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.burntRust}, ${COLORS.richMustard})`,
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* ─── Account Info Footer ────────────────────────────────────── */}
        <div className="mt-6 text-xs text-gray-400 text-center space-y-1">
          <p>Account created: {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "—"}</p>
          <p>Last updated: {admin?.updatedAt ? new Date(admin.updatedAt).toLocaleDateString() : "—"}</p>
        </div>
      </div>

      <style jsx global>{`
        .custom-toast .Toastify__toast {
          border-radius: 12px !important;
        }
        .custom-toast .Toastify__toast--success {
          background: #2B4735 !important;
          color: #FFF3EF !important;
        }
        .custom-toast .Toastify__toast--success .Toastify__progress-bar {
          background: #A964FF !important;
        }
        .custom-toast .Toastify__toast--error {
          background: #4A2B2B !important;
          color: #FFF3EF !important;
        }
        .custom-toast .Toastify__toast--error .Toastify__progress-bar {
          background: #BD4D23 !important;
        }
        .custom-toast .Toastify__toast-body {
          color: #FFF3EF !important;
        }
        .custom-toast .Toastify__close-button {
          color: #FFF3EF !important;
        }
      `}</style>
    </>
  );
}