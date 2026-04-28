"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function approveTask(taskId: string, userId: string, currentStatus: string) {
  const supabase = createAdminClient();

  const isScript = currentStatus === "script_generated";

  if (isScript) {
    // Skip the script_approved holding stage — advance directly to video_generated
    // so the task automatically appears in the Video Generated column for the next
    // person to act on, with no manual drag required.
    await supabase.from("tasks").update({ current_status: "video_generated" }).eq("id", taskId);

    await supabase.from("task_history").insert({
      task_id: taskId,
      changed_by: userId,
      new_status: "video_generated",
      action: "qc_approved_script",
      notes: "QC Approved — auto-advanced to video stage"
    });

    // Try to find a dedicated video_audio_generator and reassign to them
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("sub_role", "video_audio_generator")
      .eq("is_active", true)
      .limit(1);

    if (profiles && profiles.length > 0) {
      await supabase.from("task_assignments").delete().eq("task_id", taskId);
      await supabase.from("task_assignments").insert({
        task_id: taskId,
        user_id: profiles[0].id,
        stage: "video_generated"
      });
    }
    // If no dedicated video person exists, the original loader's assignment is
    // kept so they can submit the video work from their board.
  } else {
    // video_edited -> final_approved
    await supabase.from("tasks").update({ current_status: "final_approved" }).eq("id", taskId);

    await supabase.from("task_history").insert({
      task_id: taskId,
      changed_by: userId,
      new_status: "final_approved",
      action: "qc_approved_video",
      notes: "QC Approved"
    });
  }

  revalidatePath("/qc");
  revalidatePath("/qc/kanban");
  revalidatePath("/admin/kanban");
  revalidatePath("/loader");

  return { success: true };
}

export async function rejectTask(taskId: string, userId: string, currentStatus: string, reason: string) {
  const supabase = createAdminClient();

  // Determine the previous phase based on current status
  // script_generated -> goes back to assigned (for script writer)
  // video_edited -> goes back to video_generated (for video editor)
  const isScript = currentStatus === "script_generated";
  const previousPhase = isScript ? "assigned" : "video_generated";

  // Update task to needs_revision with the target phase stored
  await supabase.from("tasks").update({
    current_status: "needs_revision",
    revision_target_status: previousPhase
  }).eq("id", taskId);

  await supabase.from("task_history").insert({
    task_id: taskId,
    changed_by: userId,
    new_status: "needs_revision",
    previous_status: currentStatus,
    action: isScript ? "qc_rejected_script" : "qc_rejected_video",
    notes: reason || "QC Rejected"
  });

  revalidatePath("/qc");
  revalidatePath("/qc/kanban");
  revalidatePath("/admin/kanban");
  revalidatePath("/loader");

  return { success: true };
}
