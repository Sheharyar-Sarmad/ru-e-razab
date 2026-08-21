// app/admin/dashboard/ai-chat/page.tsx
import { Metadata } from "next";
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import GroqChatPageWrapper from "@/components/admin/layout/GroqChatPageWrapper";

export const metadata: Metadata = {
  title: "AI Assistant | Admin Dashboard | Ru-e-Razab",
  description: "Chat with RAZAB AI – your administrative assistant for Ru-e-Razab.",
  robots: "noindex, nofollow",
};

export default function AIChatPage() {
  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#FFF3EF] min-h-screen">
        <GroqChatPageWrapper />
      </main>
    </div>
  );
}