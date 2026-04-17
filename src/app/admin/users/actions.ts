"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function toggleUserStatus(userId: string, newStatus: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: newStatus })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}

export async function sendPasswordReset(email: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  const supabase = createAdminClient();

  try {
    // Delete from Supabase Auth (cascade will remove profile via FK)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
