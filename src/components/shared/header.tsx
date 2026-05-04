"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header({ title }: { title: string }) {
  const [initials, setInitials] = useState("A");
  const [role, setRole] = useState("User");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setInitials(user.email.substring(0, 1).toUpperCase());
      }
      if (user?.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'admin') setRole('Administrator');
        if (profile?.role === 'qc') setRole('Quality Control');
        if (profile?.role === 'loader') setRole('Content Loader');
      }
    };
    fetchUser();
  }, []);

  const mobileLinks = role === "Administrator" ? [
    { label: "Dashboard", href: "/admin" },
    { label: "Master Kanban", href: "/admin/kanban" },
    { label: "Hierarchy", href: "/admin/hierarchy" },
    { label: "Team Staff", href: "/admin/users" }
  ] : role === "Quality Control" ? [
    { label: "Metrics", href: "/qc" },
    { label: "Queue Kanban", href: "/qc/kanban" }
  ] : [
    { label: "My Tasks", href: "/loader" }
  ];

  return (
    <>
      <header className="h-16 w-full md:w-[calc(100%-260px)] bg-[#000] border-b border-[#3c3c3c] flex items-center justify-between px-5 md:px-8 absolute top-0 z-10 right-0">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="text-base md:text-xl font-bold text-white tracking-[2px] uppercase">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white tracking-[1px] uppercase">{role}</span>
            <span className="text-xs text-[#7e7e7e]">Verified Access</span>
          </div>
          <div className="h-9 w-9 shrink-0 bg-[#1a1a1a] border border-[#3c3c3c] flex items-center justify-center text-white font-bold text-sm tracking-wider">
            {initials}
          </div>
        </div>
      </header>

      {/* Mobile full-screen overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-[#000] z-20 flex flex-col">
          {/* M-stripe at top */}
          <div className="m-stripe" />

          <nav className="flex-1 flex flex-col p-6 space-y-1">
            {mobileLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-4 font-bold text-base tracking-[1.5px] uppercase transition-colors border-l-[3px] ${
                  pathname === link.href
                    ? 'text-white bg-[#1a1a1a] border-[#0066b1]'
                    : 'text-[#7e7e7e] hover:text-white hover:bg-[#1a1a1a] border-transparent'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="p-6 border-t border-[#3c3c3c]">
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="w-full px-4 py-4 text-left font-bold text-base tracking-[1.5px] uppercase text-[#e22718] hover:bg-[#e22718]/10 border-l-[3px] border-transparent transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
