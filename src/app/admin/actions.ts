"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const role = formData.get("role") as string;
  const subRole = formData.get("subRole") as string | null;

  if (!fullName || !email || !role) {
    return { error: "Missing required fields" };
  }

  // Generate a random 12-char secure password
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let randomPassword = "";
  for (let i = 0; i < 12; i++) {
    randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;

    const newUserId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUserId,
        email: email,
        role: role,
        sub_role: subRole || null,
        full_name: fullName,
        phone: phone ? `91${phone.replace(/\D/g, '')}` : null,
        plain_password: randomPassword,
      });

    if (profileError) throw profileError;

    revalidatePath("/admin/users");
    
    return { 
      success: true, 
      user: {
        email,
        password: randomPassword,
        phone: phone ? `91${phone.replace(/\D/g, '')}` : null,
      } 
    };

  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
