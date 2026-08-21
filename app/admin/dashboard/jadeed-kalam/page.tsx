// app/admin/dashboard/jadeed-kalam/page.tsx
import AdminSidebar from "@/components/admin/navigation/AdminSidebar";
import JadeedKalamManager from "@/components/admin/layout/JadeedKalamManager";

export const metadata = {
  title: "Jadeed Kalam | Ru-e-Razab",
  description: "Create new Ghazal, Nazm, Qata, or Shair",
};

export default function JadeedKalamPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar – no children passed */}
      <AdminSidebar />
      
      {/* Main content – outside the sidebar */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 font-urdu">
        <JadeedKalamManager />
      </div>
    </div>
  );
}