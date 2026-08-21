// app/admin/login/page.tsx
import Image from "next/image";
import Logo from "@/public/logo.png";
import LoginForm from "@/components/admin/models/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login | Ru-e-Razab",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen w-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, #FFF3EF 0%, #FFF3EF 60%, #f5e8e4 100%)`,
      }}
    >
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Brand Section */}
        <div className="hidden lg:flex flex-col items-start space-y-6">
          <div className="relative w-24 h-24">
            <Image 
              src={Logo}
              alt="Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          
          <div>
            <h1 
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#9F3F1C" }}
            >
              Razab Tabraiz
            </h1>
            <p className="text-gray-600 mt-1">
              Admin Management Portal
            </p>
          </div>

          <div className="w-16 h-1 rounded-full" style={{ background: "#9F3F1C" }}></div>
          
          <p className="text-sm text-gray-500 max-w-sm">
            Welcome back! Please login to your administrator account to manage your content.
          </p>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="mb-6">
            <h2 
              className="text-2xl font-bold"
              style={{ color: "#9F3F1C" }}
            >
              Welcome Back
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Login to your administrator account
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}