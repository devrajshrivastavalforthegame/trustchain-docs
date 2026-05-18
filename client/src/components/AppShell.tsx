import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export const AppShell = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-grid-dark bg-[size:32px_32px]">
        <Navbar />
        <div className="p-5 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);
