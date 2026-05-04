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
          <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">Task Pipeline</h2>
          <p className="text-[#bbbbbb] text-sm">Live tracking of all educational materials.</p>
        </div>

        <KanbanWrapper tasks={tasks} userId={user?.id ?? ""} />

        <CreateTaskButton />
      </div>
    </>
  );
}
