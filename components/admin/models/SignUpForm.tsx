// /@components/admin/models/SignUpForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  EnvelopeIcon,
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import axios from "axios";
import { COLORS } from "@/lib/colors";

interface FormData {
  accountname: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  accountname?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phonenumber?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    accountname: "",
    firstname: "",
    lastname: "",
    email: "",
    phonenumber: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isAllowed, setIsAllowed] = useState(true);

  useEffect(() => {
    const checkAllowed = async () => {
      try {
        const response = await axios.get("/api/admin/auth/count-admin");
        if (response.data.success) {
          if (!response.data.data.isAllowed) {
            setIsAllowed(false);
            toast.error("Maximum admin accounts reached!");
          }
        }
      } catch (error) {
        console.error("Failed to check admin count:", error);
      }
    };
    checkAllowed();
  }, []);

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "accountname":
        if (!value || value.trim() === "") return "Account name is required";
        if (value.length < 3) return "Account name must be at least 3 characters";
        if (value.length > 20) return "Account name must be less than 20 characters";
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Account name can only contain letters, numbers, and underscores";
        return undefined;

      case "firstname":
        if (!value || value.trim() === "") return "First name is required";
        if (value.length < 2) return "First name must be at least 2 characters";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "First name can only contain letters";
        return undefined;

      case "lastname":
        if (!value || value.trim() === "") return "Last name is required";
        if (value.length < 2) return "Last name must be at least 2 characters";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "Last name can only contain letters";
        return undefined;

      case "email":
        if (!value || value.trim() === "") return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
        return undefined;

      case "phonenumber":
        if (!value || value.trim() === "") return "Phone number is required";
        if (!/^[0-9+\-\s()]+$/.test(value)) return "Please enter a valid phone number";
        if (value.replace(/[\s\-()]/g, "").length < 10) return "Phone number must be at least 10 digits";
        return undefined;

      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter";
        if (!/[0-9]/.test(value)) return "Password must contain at least one number";
        if (!/[!@#$%^&*]/.test(value)) return "Password must contain at least one special character (!@#$%^&*)";
        return undefined;

      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
        return undefined;

      default:
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));

    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FormErrors = {};
    let hasError = false;

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof FormData]);
      if (error) {
        newErrors[key as keyof FormErrors] = error;
        hasError = true;
      }
    });

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      const errorFields = Object.keys(newErrors).join(", ");
      toast.error(`Please fix the following fields: ${errorFields}`);
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await axios.post("/api/admin/auth/sign-up", submitData);

      if (response.data.success) {
        toast.success(response.data.message || "Account created successfully!");
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Signup error:", error);

      if (error.response) {
        const errorMessage = error.response.data?.message || "Signup failed";
        toast.error(errorMessage);

        if (error.response.data?.err === "ACCOUNT_CREATION_FAILED") {
          toast.error("Account name, email, or phone number already exists");
        }
      } else if (error.request) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return "#E13C67";
    if (passwordStrength < 75) return "#BF7303";
    return "#50C878";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 50) return "Weak";
    if (passwordStrength < 75) return "Medium";
    return "Strong";
  };

  if (!isAllowed) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center border-2 border-[#A5421D]/20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF3EF" }}>
          <ExclamationCircleIcon className="w-8 h-8" style={{ color: "#A5421D" }} />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "#A5421D" }}>
          Sign Up Not Allowed
        </h2>
        <p className="text-gray-600">Maximum number of admin accounts (3) has been reached.</p>
        <a
          href="/admin/login"
          className="mt-4 inline-block px-6 py-2 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          style={{
            background: `linear-gradient(135deg, #A5421D, #8a3618)`,
          }}
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{
          background: `linear-gradient(135deg, #A5421D, #8a3618)`,
          color: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(165, 66, 29, 0.3)",
        }}
        className="custom-toast"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-[#A5421D]/10"
      >
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {/* Account Name */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Account Name <span className="text-[#A5421D]">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserCircleIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
              </div>
              <input
                type="text"
                name="accountname"
                value={formData.accountname}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                  errors.accountname
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                } text-gray-900`}
                placeholder="Enter account name"
                disabled={isLoading}
              />
            </div>
            {errors.accountname && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.accountname}
              </motion.p>
            )}
          </motion.div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <label className="block text-sm font-medium mb-1 text-gray-700">
                First Name <span className="text-[#A5421D]">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IdentificationIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
                </div>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                    errors.firstname
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                  } text-gray-900`}
                  placeholder="First name"
                  disabled={isLoading}
                />
              </div>
              {errors.firstname && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-xs text-red-500"
                >
                  {errors.firstname}
                </motion.p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Last Name <span className="text-[#A5421D]">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
                </div>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                    errors.lastname
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                  } text-gray-900`}
                  placeholder="Last name"
                  disabled={isLoading}
                />
              </div>
              {errors.lastname && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-xs text-red-500"
                >
                  {errors.lastname}
                </motion.p>
              )}
            </motion.div>
          </div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Email Address <span className="text-[#A5421D]">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                  errors.email
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                } text-gray-900`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.email}
              </motion.p>
            )}
          </motion.div>

          {/* Phone Number */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Phone Number <span className="text-[#A5421D]">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PhoneIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
              </div>
              <input
                type="tel"
                name="phonenumber"
                value={formData.phonenumber}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                  errors.phonenumber
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                } text-gray-900`}
                placeholder="Enter phone number"
                disabled={isLoading}
              />
            </div>
            {errors.phonenumber && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.phonenumber}
              </motion.p>
            )}
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Password <span className="text-[#A5421D]">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                  errors.password
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                } text-gray-900`}
                placeholder="Create a strong password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-[#A5421D] transition-colors" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-[#A5421D] transition-colors" />
                )}
              </button>
            </div>
            {formData.password && (
              <div className="mt-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${passwordStrength}%`,
                        background: getPasswordStrengthColor(),
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {getPasswordStrengthText()}
                  </span>
                </div>
              </div>
            )}
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.password}
              </motion.p>
            )}
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Confirm Password <span className="text-[#A5421D]">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400 group-hover:text-[#A5421D] transition-colors" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-2.5 rounded-xl border-2 transition-all duration-300 focus:ring-0 ${
                  errors.confirmPassword
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#A5421D] hover:border-[#A5421D]/50"
                } text-gray-900`}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-[#A5421D] transition-colors" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-[#A5421D] transition-colors" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-xs text-red-500"
              >
                {errors.confirmPassword}
              </motion.p>
            )}
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            style={{
              background: isLoading
                ? `linear-gradient(135deg, #A5421D80, #8a361880)`
                : `linear-gradient(135deg, #A5421D, #8a3618)`,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </div>
            ) : (
              <span>Create Admin Account</span>
            )}
          </motion.button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a
              href="/admin/login"
              className="font-medium transition-colors hover:underline"
              style={{ color: "#A5421D" }}
            >
              Sign in here
            </a>
          </p>
        </form>

        <style jsx global>{`
          .custom-toast .Toastify__toast {
            background: linear-gradient(135deg, #A5421D, #8a3618) !important;
            color: white !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 20px rgba(165, 66, 29, 0.3) !important;
          }
          .custom-toast .Toastify__toast-icon {
            color: white !important;
          }
          .custom-toast .Toastify__close-button {
            color: white !important;
          }
          .custom-toast .Toastify__progress-bar {
            background: #FFF3EF !important;
          }
          .custom-toast .Toastify__toast-body {
            color: white !important;
          }
        `}</style>
      </motion.div>
    </>
  );
}