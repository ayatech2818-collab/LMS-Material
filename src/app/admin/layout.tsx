import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/sidebar";
import { RealtimeListener } from "@/components/shared/realtime-listener";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect(profile?.role ? `/${profile.role}` : "/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-console-black">
      <RealtimeListener />
      <Sidebar role="admin" />
      
      <div className="flex-1 relative bg-paper-white bg-gradient-to-b from-paper-white to-ice-mist min-h-screen overflow-hidden">
        <main className="pt-20 h-full overflow-y-auto overflow-x-hidden">
          <div className="p-8 pb-32 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
