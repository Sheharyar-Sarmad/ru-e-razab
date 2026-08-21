// app/admin/sign-up/page.tsx
import { redirect } from "next/navigation";
import { ConnectDB } from "@/db/connect.db";
import EnvSecrets from "@/config/env.secrets";
import AdminAccountModel from "@/models/auth/admin.account.model";
import SignUpForm from "@/components/admin/models/SignUpForm";
import Image from "next/image";
import Logo from "@/public/logo.png";
import { Metadata } from "next";

export default async function SignUpPage() {
  let isAllowed = false;
  let adminCount = 0;
  const maxAdminCount = 3;

  try {
    await ConnectDB(EnvSecrets.mongoUri as string);
    adminCount = await AdminAccountModel.countDocuments();
    isAllowed = adminCount < maxAdminCount;
  } catch (error) {
    console.error("Failed to fetch admin count:", error);
  }

  if (!isAllowed) {
    redirect("/admin/login");
  }

  return (
    <div
      className="h-[100dvh] w-screen overflow-hidden flex items-center justify-center p-2 sm:p-4 md:p-6"
      style={{
        background: `linear-gradient(135deg, #FFF3EF, #FFF3EF 50%, #f5e8e4)`,
      }}
    >
      <div className="w-full max-w-7xl h-full max-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-center py-2 md:py-4">
        {/* Left Side - Logo & Info */}
        <div className="hidden lg:flex flex-col items-center justify-center space-y-3 md:space-y-4 h-full min-h-0 overflow-hidden">
          <div className="relative w-32 h-32 md:w-32 md:h-32 lg:w-48 lg:h-48 xl:w-64 xl:h-64 animate-float shrink-0">
            <Image src={Logo} alt="Logo" fill className="object-contain" priority />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold tracking-tight text-center" style={{ color: "#9F3F1C" }}>
            Razab Tabraiz
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-600 text-center">Admin Panel</p>
          <div className="mt-1 px-4 md:px-6 py-1.5 md:py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-emerald-600/20 shrink-0">
            <span className="text-xs md:text-sm font-medium text-emerald-600">
              {adminCount} of {maxAdminCount} admin accounts created
            </span>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="flex flex-col justify-center w-full max-w-md mx-auto lg:mx-0 lg:ml-auto h-full min-h-0 overflow-hidden">
          <div className="mb-2 md:mb-4 shrink-0">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: "#9F3F1C" }}>
              Admin Sign Up
            </h2>
            <p className="text-sm md:text-base text-gray-600">Create your admin account</p>
            <p className="text-xs md:text-sm mt-1 font-medium lg:hidden text-emerald-600">
              {adminCount} of {maxAdminCount} admin accounts created
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <SignUpForm />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Admin SignUp | Ru-e-Razab",
  robots: {
    index: false,
    follow: false,
  },
};