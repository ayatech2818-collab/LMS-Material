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
  const PAGE_SIZE = 1000;

  // 1. Check exact total count first
  const { count, error: countErr } = await supabase
    .from("hierarchies")
    .select("*", { count: "exact", head: true });

  if (countErr || count === null) {
    // Fallback if count query fails: fetch sequentially
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from("hierarchies")
        .select("*")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        console.error("Error fetching hierarchies:", error);
        return allData;
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < PAGE_SIZE) hasMore = false;
        else from += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
    return allData;
  }

  // 2. If fits in a single page, fetch directly
  if (count <= PAGE_SIZE) {
    const { data, error } = await supabase
      .from("hierarchies")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching hierarchies:", error);
      return [];
    }
    return data || [];
  }

  // 3. For multi-page hierarchies, fetch all batches concurrently in parallel
  const totalPages = Math.ceil(count / PAGE_SIZE);
  const pagePromises = Array.from({ length: totalPages }, (_, page) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    return supabase
      .from("hierarchies")
      .select("*")
      .order("created_at", { ascending: true })
      .range(from, to);
  });

  const results = await Promise.all(pagePromises);
  const allData: any[] = [];
  for (const res of results) {
    if (res.error) {
      console.error("Error in batch fetch:", res.error);
    } else if (res.data) {
      allData.push(...res.data);
    }
  }

  return allData;
}

export async function createHierarchy(type: HierarchyType, name: string, parentId: string | null) {
  await requireAdmin();
  const supabase = createAdminClient();
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Name cannot be empty" };
  }

  const { data, error } = await supabase
    .from("hierarchies")
    .insert({
      type,
      name: trimmedName,
      parent_id: parentId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || error.message?.includes("hierarchies_type_name_parent_id_key")) {
      return { error: `An item with the name "${trimmedName}" already exists under this section.` };
    }
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
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { error: "Name cannot be empty" };
  }

  const { error } = await supabase
    .from("hierarchies")
    .update({ name: trimmedName })
    .eq("id", id);

  if (error) {
    if (error.code === "23505" || error.message?.includes("hierarchies_type_name_parent_id_key")) {
      return { error: `An item with the name "${trimmedName}" already exists under this section.` };
    }
    return { error: error.message };
  }
  
  revalidatePath("/admin/hierarchy");
  return { success: true };
}
