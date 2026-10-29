import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "./Sidebar.jsx";
import TopNavigation from "./TopNavigation.jsx";
import Icon from "../components/Icon.jsx";

export default function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar />
      </div>
      <div className="lg:pl-64">
        <TopNavigation onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-9">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          />
          <div className="relative h-full shadow-2xl">
            <Sidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
            <button
              aria-label="Close navigation menu"
              className="absolute left-[calc(min(19rem,88vw)_+_0.75rem)] top-4 rounded-lg bg-white/10 p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              onClick={() => setMobileMenuOpen(false)}
              type="button"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
