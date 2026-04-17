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

  // Simple mobile navigation links
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
      <header className="h-20 w-full md:w-[calc(100%-260px)] bg-console-black border-b border-[#1f1f1f] flex items-center justify-between px-6 md:px-8 absolute top-0 z-10 right-0">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <h1 className="text-xl md:text-3xl font-light text-white tracking-[0.1px]">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-white">{role}</span>
            <span className="text-xs text-mute-gray">Verified Access</span>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-white font-medium">
            {initials}
          </div>
        </div>
      </header>
      
      {/* Mobile nav dropdown overlay */}
      {menuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-console-black border-b border-[#1f1f1f] z-20 flex flex-col p-4 shadow-xl">
          {mobileLinks.map(link => (
            <Link 
              key={link.href}
              href={link.href} 
              onClick={() => setMenuOpen(false)}
              className={`p-4 rounded-lg font-medium text-lg ${pathname === link.href ? 'bg-ps-blue text-white' : 'text-body-gray hover:text-white'}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
            <button
              type="button"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="p-4 w-full text-left rounded-lg font-medium text-lg text-warning-red hover:bg-warning-red/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
