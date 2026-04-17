import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function seedAdmin() {
  const email = "admin@material.com";
  const password = "Playstation123!";

  console.log(`Checking if admin user exists...`);
  
  // Create user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Super Admin" }
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        console.log(`\n✅ Admin account already exists!`);
        console.log(`Email: ${email}\nPassword: ${password}\n`);
    } else {
        console.error("Error creating user:", authError);
    }
    return;
  }

  const newUserId = authData.user.id;

  // Insert profile for admin
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({ 
      id: newUserId,
      email: email,
      role: "admin", 
      full_name: "Super Admin" 
    });

  if (profileError) {
    if (profileError.code === "23505") {
       console.log("Profile already exists.");
    } else {
       console.error("Error creating profile:", profileError);
    }
  }

  console.log(`\n🎉 Admin user successfully generated!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}\n`);
}

seedAdmin();
