import { getKanbanTasks } from "@/app/admin/kanban/actions";
import { KanbanWrapper } from "@/components/kanban/kanban-wrapper";
import { CreateTaskButton } from "@/components/kanban/create-task-button";
import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function AdminKanbanPage() {
  const [tasks, supabase] = await Promise.all([
    getKanbanTasks(),
    createClient()
  ]);
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <Header title="Master Kanban" />

      <div className="flex flex-col gap-5 min-w-0">
        <div>
          <h2 className="text-3xl font-light text-display-ink mb-1">Task Pipeline</h2>
          <p className="text-body-gray text-sm">Live tracking of all educational materials.</p>
        </div>

        <KanbanWrapper tasks={tasks} userId={user?.id ?? ""} />

        <CreateTaskButton />
      </div>
    </>
  );
}
