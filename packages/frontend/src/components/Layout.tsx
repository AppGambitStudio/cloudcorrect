import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";

export default function Layout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen bg-white">
        <Outlet />
      </main>
    </div>
  );
}
