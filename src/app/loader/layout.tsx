import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/sidebar";
import { RealtimeListener } from "@/components/shared/realtime-listener";

export default async function LoaderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

  // Loaders and admins can access loader dashboard
  if (profile?.role !== "loader" && profile?.role !== "admin") {
    redirect(profile?.role ? `/${profile.role}` : "/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-console-black">
      <RealtimeListener />
      <Sidebar role="loader" />
      <div className="flex-1 relative bg-paper-white bg-gradient-to-b from-paper-white to-ice-mist min-h-screen">
        <main className="pt-20 h-full overflow-y-auto">
          <div className="p-8 pb-32">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
