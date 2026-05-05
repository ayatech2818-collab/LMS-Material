"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function submitTaskWork(taskId: string, userId: string, proofUrl: string, notes: string) {
  const supabase = createAdminClient();

  // 1. Get current task (include revision_target_status for rejection routing)
  const { data: task } = await supabase
    .from("tasks")
    .select("current_status, revision_target_status")
    .eq("id", taskId)
    .single();
  if (!task) return { error: "Task not found" };

  // 2. Determine next status based on the full state machine:
  //
  //  FULL PIPELINE:
  //
  //    [Admin] assigns script_writer
  //         ↓
  //    assigned  ──[script_writer submits]──► script_generated  ──► QC 1st review
  //                                                                       ↓
  //                                                              script_approved
  //                                                        + AUTO-ASSIGN video_audio_generator
  //                                                                       ↓
  //                                            [video_audio_generator submits]
  //                                                                       ↓
  //                                                              video_generated
  //                                                        + AUTO-ASSIGN video_editor
  //                                                                       ↓
  //                                                       [video_editor submits]
  //                                                                       ↓
  //                                                              video_edited  ──► QC 2nd review
  //                                                                       ↓
  //                                                              final_approved  ✓ DONE
  //
  //  REVISION PATHS (needs_revision → determined by revision_target_status):
  //    revision_target_status = "assigned"        → re-submit goes to script_generated  (QC 1st)
  //    revision_target_status = "video_generated" → re-submit goes to video_edited       (QC 2nd)
  let nextStatus: string;
  const revisionTargetStatus = (task as { current_status: string; revision_target_status?: string | null }).revision_target_status;

  switch (task.current_status) {
    case "needs_revision": {
      // Map the revision_target_status (where loader works) forward to the QC review stage
      const revisionForwardMap: Record<string, string> = {
        "assigned": "script_generated",       // script rejected → re-submit script for QC
        "video_generated": "video_edited",    // video rejected  → re-submit video for QC
      };
      nextStatus = revisionForwardMap[revisionTargetStatus ?? ""] ?? "script_generated";
      break;
    }
    case "script_approved":
      nextStatus = "video_generated";
      break;
    case "video_generated":
      // video_editor finished editing; task goes to QC for final (2nd) review
      nextStatus = "video_edited";
      break;
    default:
      // "assigned" and any unexpected status → script_generated (1st QC review)
      nextStatus = "script_generated";
  }

  // 3. Update task (clear revision_target_status when submitting)
  await supabase.from("tasks").update({
    current_status: nextStatus,
    revision_target_status: null,
  }).eq("id", taskId);

  // 4. Log history with the previous status for the audit trail
  await supabase.from("task_history").insert({
    task_id: taskId,
    changed_by: userId,
    previous_status: task.current_status,
    new_status: nextStatus,
    action: "submitted",
    proof_url: proofUrl,
    notes: notes
  });

  // script_approved → video_generated:
  // video_audio_generator has finished generating the video.
  // Auto-assign the least-busy video_editor so they can edit it next.
  if (task.current_status === "script_approved") {
    // Always clear old assignment — prevents the old assignee from double-submitting
    await supabase.from("task_assignments").delete().eq("task_id", taskId);

    const { data: specialists } = await supabase
      .from("profiles")
      .select("id")
      .eq("sub_role", "video_editor")
      .eq("is_active", true);

    if (specialists && specialists.length > 0) {
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

      const min = Math.min(...counts.map((c) => c.count));
      const tied = counts.filter((c) => c.count === min);
      const selected = tied[Math.floor(Math.random() * tied.length)];

      await supabase.from("task_assignments").insert({
        task_id: taskId,
        user_id: selected.id,
        stage: "video_generated",
      });
    }
  }

  // video_generated → video_edited:
  // video_editor has finished editing and submitted. Task now awaits QC 2nd review.
  // No auto-assignment needed — QC handles approve/reject from here.
  // On QC approval → final_approved (pipeline complete).

  revalidatePath("/loader");
  revalidatePath("/loader/task/" + taskId);
  revalidatePath("/admin/kanban");
  revalidatePath("/qc/kanban");
  revalidatePath("/qc");

  return { success: true };
}
