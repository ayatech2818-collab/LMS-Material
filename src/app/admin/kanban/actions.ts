"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// task_history actions that represent a stage actually being completed and handed on.
// The most recent of these is a task's "latest completed date".
const COMPLETION_ACTIONS = ["submitted", "qc_approved_script", "qc_approved_video"];

export async function getKanbanTasks() {
  const supabase = createAdminClient();

  // We need to fetch tasks along with their hierarchy names and assigned profiles
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *, revision_target_status,
      board:board_id(name),
      class:class_id(name),
      subject:subject_id(name),
      chapter:chapter_id(name),
      task_assignments(
        stage,
        user:user_id(full_name, avatar_url, sub_role)
      ),
      task_history(
        proof_url,
        created_at,
        action,
        contributor:changed_by(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  // Derive each task's latest completed date + the loaders who worked on it directly from
  // task_history, so the value updates automatically every time a loader completes a stage
  // (final-approved tasks have their assignments cleared, so this is the only reliable source).
  type HistoryRow = {
    proof_url: string | null;
    created_at: string;
    action: string | null;
    contributor: { full_name: string } | null;
  };

  return (data ?? []).map((task) => {
    const history = (task.task_history ?? []) as HistoryRow[];

    let lastCompletedAt: string | null = null;
    for (const h of history) {
      if (h.action && COMPLETION_ACTIONS.includes(h.action)) {
        if (!lastCompletedAt || new Date(h.created_at) > new Date(lastCompletedAt)) {
          lastCompletedAt = h.created_at;
        }
      }
    }

    const contributors = Array.from(
      new Set(
        history
          .filter((h) => h.action === "submitted" && h.contributor?.full_name)
          .map((h) => h.contributor!.full_name)
      )
    );

    return { ...task, last_completed_at: lastCompletedAt, contributors };
  });
}

export async function reorderTaskWithinColumn(_taskId: string, _newOrderPosition: number) {
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = createAdminClient();
  // task_assignments and task_history both have ON DELETE CASCADE on task_id
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  return { success: !error, error: error?.message };
}

export async function moveTaskStatus(taskId: string, newStatus: string, userId?: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tasks")
    .update({ current_status: newStatus })
    .eq("id", taskId);

  if (!error && userId) {
    await supabase.from("task_history").insert({
      task_id: taskId,
      changed_by: userId,
      new_status: newStatus,
      action: 'kanban_drag'
    });
  }

  return { success: !error };
}

export async function getLoaders() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, sub_role")
    .eq("role", "loader");

  if (error) return [];
  return data;
}

export async function assignLoaderToTask(taskId: string, loaderId: string, stage: string) {
  const supabase = createAdminClient();

  // Delete ALL existing assignments for this task (only one person per task)
  const { error: deleteError } = await supabase
    .from("task_assignments")
    .delete()
    .eq("task_id", taskId);

  if (deleteError) return { error: deleteError.message };

  // Insert the new assignment
  const { error } = await supabase
    .from("task_assignments")
    .insert({ task_id: taskId, user_id: loaderId, stage });

  if (error) return { error: error.message };
  return { success: true };
}

type CreateTaskParams = {
  board_id: string;
  class_id: string;
  subject_id: string;
  chapter_id: string;
  loader_id: string;
};

export async function createTask({ board_id, class_id, subject_id, chapter_id, loader_id }: CreateTaskParams) {
  const supabase = createAdminClient();

  // 1. Check if a task already exists for this chapter
  const { data: existingTask } = await supabase
    .from("tasks")
    .select("id, current_status")
    .eq("chapter_id", chapter_id)
    .neq("current_status", "final_approved")
    .maybeSingle();

  let taskId: string;

  if (existingTask) {
    // Task already exists for this chapter — replace the assignment
    taskId = existingTask.id;

    // Delete old assignments
    await supabase.from("task_assignments").delete().eq("task_id", taskId);

    // Reset status back to assigned
    await supabase.from("tasks").update({ current_status: "assigned" }).eq("id", taskId);
  } else {
    // 2. Create a new task pointing to the chapter
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        board_id,
        class_id,
        subject_id,
        chapter_id,
        current_status: "assigned"
      })
      .select()
      .single();

    if (taskError) return { error: taskError.message };
    taskId = task.id;
  }

  // 3. Assign the Loader (only one person per task)
  const { error: assignError } = await supabase
    .from("task_assignments")
    .insert({
      task_id: taskId,
      user_id: loader_id,
      stage: "assigned"
    });

  if (assignError) return { error: assignError.message };

  // 4. Log History
  await supabase.from("task_history").insert({
    task_id: taskId,
    changed_by: loader_id,
    previous_status: existingTask?.current_status ?? null,
    new_status: "assigned",
    action: existingTask ? "admin_reset_reassigned" : "created"
  });

  return { success: true };
}
