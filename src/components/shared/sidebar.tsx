"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Layers, LayoutList, LogOut, BarChart3, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useLoading } from "@/context/loading-context";

export function Sidebar({ role }: { role: "admin" | "qc" | "loader" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setIsLoading } = useLoading();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
  };

  const navItems = role === "admin" ? [
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "Hierarchy Setup", href: "/admin/hierarchy", icon: Layers },
    { name: "Master Kanban", href: "/admin/kanban", icon: LayoutList },
  ] : role === "qc" ? [
    { name: "QC Dashboard", href: "/qc", icon: LayoutDashboard },
    { name: "QC Kanban", href: "/qc/kanban", icon: LayoutList },
  ] : [
    { name: "Dashboard", href: "/loader", icon: LayoutDashboard },
    { name: "My History", href: "/loader/history", icon: BarChart3 },
  ];

  const NavContent = () => (
    <>
      {/* Branding */}
      <div className="p-8 pb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0066b1] flex items-center justify-center">
          <span className="text-white font-bold text-sm tracking-widest">M</span>
        </div>
        <span className="text-white font-bold tracking-[2px] text-sm uppercase">
          Operations
        </span>
      </div>

      {/* M-stripe divider */}
      <div className="m-stripe mx-0 mb-6" />

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`flex items-center gap-4 px-4 py-3 transition-colors relative ${
                isActive
                  ? "bg-[#1a1a1a] text-white border-l-[3px] border-[#0066b1]"
                  : "text-[#7e7e7e] hover:text-white hover:bg-[#1a1a1a] border-l-[3px] border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className={`text-sm tracking-[1px] uppercase ${isActive ? "font-bold" : "font-normal"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-[#3c3c3c]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-4 py-3 text-[#7e7e7e] hover:text-[#e22718] hover:bg-[#1a1a1a] transition-colors border-l-[3px] border-transparent"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="text-sm tracking-[1px] uppercase">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <div className="hidden md:flex w-[260px] shrink-0 min-h-screen bg-[#000] border-r border-[#3c3c3c] flex-col">
        <NavContent />
      </div>

      {/* ── Mobile Hamburger Button ───────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#0d0d0d] border border-[#3c3c3c] text-[#7e7e7e] hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Mobile Sidebar Drawer ─────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-[#000] border-r border-[#3c3c3c] flex flex-col animate-in slide-in-from-left duration-200">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#7e7e7e] hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <NavContent />
          </div>
        </>
      )}
    </>
  );
}
