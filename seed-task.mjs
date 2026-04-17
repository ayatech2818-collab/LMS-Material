import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function generateDummyData() {
  console.log("Spinning up dummy data framework...");

  // 1. Create a Loader User
  const loaderEmail = "loader1@material.com";
  const loaderPassword = "Playstation123!";
  let loaderId = null;

  const { data: loaderData, error: lAuthErr } = await supabaseAdmin.auth.admin.createUser({
    email: loaderEmail,
    password: loaderPassword,
    email_confirm: true,
  });

  if (lAuthErr) {
    if (lAuthErr.message.includes("already registered")) {
       const u = await supabaseAdmin.from('profiles').select('id').eq('email', loaderEmail).single();
       loaderId = u.data?.id;
    } else {
       console.error("Failed to create Loader:", lAuthErr);
       return;
    }
  } else {
    loaderId = loaderData.user.id;
    await supabaseAdmin.from("profiles").insert({
      id: loaderId,
      email: loaderEmail,
      role: "loader",
      sub_role: "script_writer",
      full_name: "John Script"
    });
    console.log("✅ Loader user created.");
  }

  // 2. Create Hierarchy (Board -> Class -> Subject -> Chapter)
  console.log("Generating Curriculum Hierarchy...");
  
  const { data: board } = await supabaseAdmin.from("hierarchies").insert({
    type: "board", name: "CBSE"
  }).select().single();

  const { data: cls } = await supabaseAdmin.from("hierarchies").insert({
    type: "class", name: "Grade 10", parent_id: board.id
  }).select().single();

  const { data: sub } = await supabaseAdmin.from("hierarchies").insert({
    type: "subject", name: "Science", parent_id: cls.id
  }).select().single();

  const { data: chap } = await supabaseAdmin.from("hierarchies").insert({
    type: "chapter", name: "Thermodynamics Basics", parent_id: sub.id
  }).select().single();

  console.log("✅ Hierarchy built.");

  // 3. Create a Task pointed to that hierarchy
  console.log("Injecting Task into Kanban...");
  const { data: task } = await supabaseAdmin.from("tasks").insert({
    board_id: board.id,
    class_id: cls.id,
    subject_id: sub.id,
    chapter_id: chap.id,
    current_status: "assigned"
  }).select().single();

  // 4. Assign the loader to the task
  await supabaseAdmin.from("task_assignments").insert({
    task_id: task.id,
    user_id: loaderId,
    stage: 'assigned'
  });

  await supabaseAdmin.from("task_history").insert({
    task_id: task.id,
    changed_by: loaderId, // System/Loader
    new_status: 'assigned',
    action: 'created'
  });

  console.log(`\n🎉 Task completely injected! Refresh your kanban board.`);
}

generateDummyData();
