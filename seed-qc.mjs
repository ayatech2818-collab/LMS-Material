import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function seedQC() {
  const email = "qc1@material.com";
  const password = "Playstation123!";

  console.log(`Setting up QC user...`);
  
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Sarah Quality" }
  });

  if (authError) {
    console.error("Error creating user:", authError);
    return;
  }

  const newUserId = authData.user.id;

  await supabaseAdmin.from("profiles").insert({ 
    id: newUserId,
    email: email,
    role: "qc", 
    full_name: "Sarah Quality",
    password: password
  });

  console.log("QC created successfully.");
}

seedQC();
