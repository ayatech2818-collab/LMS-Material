"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type HierarchyType = "board" | "class" | "subject" | "chapter";

// createHierarchy/updateHierarchy/deleteHierarchy use the service-role client (bypasses RLS),
// so this is the only server-side check standing between an authenticated non-admin (e.g. an
// uploader, who the UI only shows a read-only hierarchy browser to) and mutating the hierarchy.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Forbidden: admin only");
}

export async function getHierarchies() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hierarchies")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching hierarchies:", error);
    return [];
  }
  return data;
}

export async function createHierarchy(type: HierarchyType, name: string, parentId: string | null) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hierarchies")
    .insert({
      type,
      name,
      parent_id: parentId,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath("/admin/hierarchy");
  return { success: true, data };
}

export async function deleteHierarchy(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  // ON DELETE CASCADE in Postgres will handle children automatically
  const { error } = await supabase
    .from("hierarchies")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath("/admin/hierarchy");
  return { success: true };
}

export async function updateHierarchy(id: string, name: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("hierarchies")
    .update({ name })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath("/admin/hierarchy");
  return { success: true };
}
