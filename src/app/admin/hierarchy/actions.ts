"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type HierarchyType = "board" | "class" | "subject" | "chapter";

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
