import { Header } from "@/components/shared/header";
import { createAdminClient } from "@/lib/supabase/admin";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ProductivityTable } from "@/components/dashboard/productivity-table";
import { formatSubRole } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  // 1. Fetch KPI metrics
  const [{ count: activeTasks }, { count: completedTasks }, { count: creators }] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("current_status", "final_approved"),
    // Count all team members (loaders + qc) — everyone who is not an admin
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin")
  ]);

  // 2. Fetch Bar Chart Data
  const { data: rawTasks } = await supabase.from("tasks").select("current_status");
  const statusCounts: Record<string, number> = {};
  if (rawTasks) {
    rawTasks.forEach(task => {
      statusCounts[task.current_status] = (statusCounts[task.current_status] || 0) + 1;
    });
  }
  const chartData = [
    { status: "Assigned", count: statusCounts["assigned"] || 0 },
    { status: "Script Done", count: statusCounts["script_generated"] || 0 },
    { status: "Script App.", count: statusCounts["script_approved"] || 0 },
    { status: "Video Done", count: statusCounts["video_generated"] || 0 },
    { status: "Edited", count: statusCounts["video_edited"] || 0 },
    { status: "Final", count: statusCounts["final_approved"] || 0 },
  ];

  // 3. Fetch Productivity Table
  const { data: users } = await supabase.from("profiles").select("id, full_name, role, sub_role");
  const { data: assignments } = await supabase.from("task_assignments").select("user_id");
  
  const productivityData = (users || []).map(u => {
    const handles = (assignments || []).filter(a => a.user_id === u.id).length;
    return {
      fullName: u.full_name,
      role: u.role,
      subRole: formatSubRole(u.sub_role),
      tasksAssigned: handles
    };
  }).sort((a,b) => b.tasksAssigned - a.tasksAssigned);

  // 4. Fetch Recent Activity
  const { data: recentHistory } = await supabase
    .from("task_history")
    .select(`
      *,
      task:task_id(title, board:board_id(name), chapter:chapter_id(name))
    `)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <>
      <Header title="Overview" />
      
      <div className="max-w-[1920px] mx-auto">
        {/* Gallery-pace padding inside modules */}
        <section className="mb-16">
          <h2 className="text-3xl font-light text-display-ink mb-8 tracking-wide">
            Project Metrics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard title="Total Tasks Assigned" value={activeTasks || 0} />
            <StatCard title="Total Tasks Completed" value={completedTasks || 0} />
            <StatCard title="Total Creators" value={creators || 0} />
          </div>
        </section>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="bg-white rounded-[24px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3] h-full">
               <h2 className="text-2xl font-light text-display-ink mb-2">Pipeline Health</h2>
               <p className="text-body-gray text-sm">Volume of tasks distributed across pipeline stages.</p>
               <BarChart data={chartData} />
            </div>
          </section>

          <section>
            <div className="bg-white rounded-[24px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3] h-full">
               <h2 className="text-2xl font-light text-display-ink mb-2">Team Productivity</h2>
               <p className="text-body-gray text-sm mb-8">Performance metrics highlighting task assignments by employee.</p>
               <ProductivityTable data={productivityData} />
            </div>
          </section>
        </div>

        <section className="mt-16">
          <h2 className="text-3xl font-light text-display-ink mb-8 tracking-wide">
            Recent Activity
          </h2>
          <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3]">
            <div className="divide-y divide-[#f3f3f3]">
              {recentHistory?.map((event) => (
                <div key={event.id} className="p-6 hover:bg-ice-mist/50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-ps-blue" />
                    <div>
                      <p className="text-sm font-medium text-display-ink">
                        Task <span className="font-bold">#{event.task_id.slice(0, 5)}</span> moved to <span className="text-ps-blue font-semibold uppercase">{event.new_status.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-body-gray mt-0.5">
                        {event.task?.board?.name} • {event.task?.chapter?.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-mute-gray">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {(!recentHistory || recentHistory.length === 0) && (
                <div className="p-12 text-center text-body-gray italic">No recent activity found.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-[19px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3] hover:shadow-[0_5px_9px_0_rgba(0,0,0,0.16)] transition-shadow duration-200">
      <h3 className="text-body-gray text-base font-medium mb-4">{title}</h3>
      <p className="text-[44px] font-light text-display-ink tracking-[0.1px] leading-none mb-2">
        {value}
      </p>
    </div>
  );
}
