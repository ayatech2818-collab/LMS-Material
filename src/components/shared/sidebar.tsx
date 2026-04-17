"use client";

import Link from "next/link";
import { LayoutDashboard, Users, Layers, LayoutList, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

export function Sidebar({ role }: { role: "admin" | "qc" | "loader" }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
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
    { name: "My Dashboard", href: "/loader", icon: LayoutDashboard },
  ];

  return (
    <div className="hidden md:flex w-[260px] shrink-0 min-h-screen bg-console-black border-r border-[#1f1f1f] flex-col">
      {/* Branding */}
      <div className="p-8 pb-12 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-ps-blue flex items-center justify-center">
          <span className="text-white font-bold text-xl block leading-none px-2 py-1 bg-ps-blue rounded-sm">M</span>
        </div>
        <span className="text-white font-light tracking-wide text-lg mt-0.5">
          Operations
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors ${
                isActive
                  ? "bg-[#1f1f1f] text-ps-cyan border-l-2 border-ps-blue relative -left-[1px]"
                  : "text-mute-gray hover:text-white hover:bg-[#121314]"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className={`text-sm tracking-wide ${isActive ? 'font-medium' : 'font-normal'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-[#1f1f1f]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-4 py-3 text-mute-gray hover:text-warning-red hover:bg-[#121314] rounded-md transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm tracking-wide">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
