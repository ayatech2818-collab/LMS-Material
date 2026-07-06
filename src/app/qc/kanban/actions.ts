"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function approveTask(taskId: string, userId: string, currentStatus: string) {
  const supabase = createAdminClient();

  const isScript = currentStatus === "script_generated";

  if (isScript) {
    await supabase.from("tasks").update({ current_status: "script_approved" }).eq("id", taskId);

    await supabase.from("task_history").insert({
      task_id: taskId,
      changed_by: userId,
      new_status: "script_approved",
      action: "qc_approved_script",
      notes: "QC Approved"
    });

    // Try to find a dedicated video_audio_generator and reassign to them
    const { data: specialists } = await supabase
      .from("profiles")
      .select("id")
      .eq("sub_role", "video_audio_generator")
      .eq("is_active", true);

    // Always clear old assignment — prevents the old assignee from double-submitting
    await supabase.from("task_assignments").delete().eq("task_id", taskId);

    if (specialists && specialists.length > 0) {
      // Count non-completed active tasks for each
      const counts = await Promise.all(
        specialists.map(async (s) => {
          const { count } = await supabase
            .from("task_assignments")
            .select("id, tasks!inner(current_status)", { count: "exact", head: true })
            .eq("user_id", s.id)
            .neq("tasks.current_status", "final_approved");
          return { id: s.id, count: count ?? 0 };
        })
      );

      // Find minimum; break ties randomly
      const min = Math.min(...counts.map((c) => c.count));
      const tied = counts.filter((c) => c.count === min);
      const selected = tied[Math.floor(Math.random() * tied.length)];

      await supabase.from("task_assignments").insert({
        task_id: taskId,
        user_id: selected.id,
        stage: "script_approved"
      });
    }
    // If no dedicated video person exists, the assignment is cleared for safety.
    // The admin must manually assign a specialist from the Kanban board.
  } else {
    // video_edited -> final_approved
    await supabase.from("tasks").update({ current_status: "final_approved" }).eq("id", taskId);

    // Clear assignment — task is complete
    await supabase.from("task_assignments").delete().eq("task_id", taskId);

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
