"use client";

import { KanbanBoard, type Task } from "@/components/kanban/kanban-board";

export function KanbanWrapper({ tasks, userId }: { tasks: Task[]; userId: string }) {
  return (
    <div className="w-full min-w-0">
      <KanbanBoard initialTasks={tasks} userId={userId} />
    </div>
  );
}
