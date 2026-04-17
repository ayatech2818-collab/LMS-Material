"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function approveTask(taskId: string, userId: string, currentStatus: string) {
  const supabase = createAdminClient();

  // script_generated -> script_approved
  // video_edited -> final_approved
  const isScript = currentStatus === "script_generated";
  const nextStatus = isScript ? "script_approved" : "final_approved";
  const actionName = isScript ? "qc_approved_script" : "qc_approved_video";

  await supabase.from("tasks").update({ current_status: nextStatus }).eq("id", taskId);

  await supabase.from("task_history").insert({
    task_id: taskId,
    changed_by: userId,
    new_status: nextStatus,
    action: actionName,
    notes: "QC Approved"
  });

  // Auto-assign the next pipeline stage
  if (nextStatus === "script_approved") {
    // Try to find a dedicated video_audio_generator
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("sub_role", "video_audio_generator")
      .eq("is_active", true)
      .limit(1);

    if (profiles && profiles.length > 0) {
      // A dedicated video person exists — re-assign to them
      await supabase.from("task_assignments").delete().eq("task_id", taskId);
      await supabase.from("task_assignments").insert({
        task_id: taskId,
        user_id: profiles[0].id,
        stage: "video_generated"
      });
    }
    // If no video_audio_generator is found, keep the existing assignment so
    // the original loader can continue with the video/final stage.
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
