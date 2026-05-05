import { Header } from "@/components/shared/header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FileSearch, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { Suspense } from "react";

export const revalidate = 0;

export default async function QCDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const resolvedParams = await searchParams;
  const fromDate = resolvedParams.from ? new Date(resolvedParams.from + "T00:00:00Z") : null;
  const toDate = resolvedParams.to ? new Date(resolvedParams.to + "T23:59:59Z") : null;

  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { count: awaitingReview } = await adminSupabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("current_status", ["script_generated", "video_edited"]);

  let approvedQuery = adminSupabase
    .from("task_history")
    .select("*", { count: "exact", head: true })
    .eq("changed_by", user?.id)
    .in("action", ["qc_approved_script", "qc_approved_video"]);
  if (fromDate) approvedQuery = approvedQuery.gte("created_at", fromDate.toISOString());
  if (toDate) approvedQuery = approvedQuery.lte("created_at", toDate.toISOString());
  const { count: myApproved } = await approvedQuery;

  let rejectedQuery = adminSupabase
    .from("task_history")
    .select("*", { count: "exact", head: true })
    .eq("changed_by", user?.id)
    .in("action", ["qc_rejected_script", "qc_rejected_video"]);
  if (fromDate) rejectedQuery = rejectedQuery.gte("created_at", fromDate.toISOString());
  if (toDate) rejectedQuery = rejectedQuery.lte("created_at", toDate.toISOString());
  const { count: myRejected } = await rejectedQuery;

  const { data: pendingTasks } = await adminSupabase
    .from("tasks")
    .select(`
      *,
      chapter:hierarchies!tasks_chapter_id_fkey(name)
    `)
    .in("current_status", ["script_generated", "video_edited"])
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <>
      <Header title="QC Dashboard" />
      <div className="max-w-[1920px] mx-auto space-y-6 md:space-y-8">

        {/* Header & Date Filter */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">
              Quality Assurance
            </h2>
            <p className="text-[#bbbbbb] text-sm">
              Monitor your review performance and pipeline health.
            </p>
          </div>
          <Suspense fallback={<div className="h-9 w-48 bg-[#1a1a1a] border border-[#3c3c3c] animate-pulse" />}>
            <DateRangePicker />
          </Suspense>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Awaiting Review</h3>
              <div className="p-2 bg-[#e22718]/10 border border-[#e22718]/20">
                <FileSearch className="h-5 w-5 text-[#e22718]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-white leading-none">{awaitingReview || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">My Approved</h3>
              <div className="p-2 bg-[#0fa336]/10 border border-[#0fa336]/20">
                <CheckCircle2 className="h-5 w-5 text-[#0fa336]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-white leading-none">{myApproved || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">My Rejected</h3>
              <div className="p-2 bg-[#e22718]/10 border border-[#e22718]/20">
                <XCircle className="h-5 w-5 text-[#e22718]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-white leading-none">{myRejected || 0}</p>
          </div>
        </section>

        {/* Quick Access */}
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#0d0d0d]">
            <h3 className="text-xs font-bold text-white tracking-[2px] uppercase">Priority Review Queue</h3>
            <Link href="/qc/kanban" className="text-xs font-bold text-[#0066b1] hover:text-[#1c69d4] tracking-[1px] uppercase transition-colors">
              View Kanban →
            </Link>
          </div>
          <div>
            {pendingTasks && pendingTasks.length > 0 ? (
              <ul className="divide-y divide-[#3c3c3c]">
                {pendingTasks.map((task: any) => (
                  <li key={task.id} className="px-5 md:px-6 py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#e6e6e6] text-sm mb-1 truncate">{task.chapter?.name || "Untitled Chapter"}</p>
                      <p className="text-xs text-[#7e7e7e]">
                        Chapter: {task.chapter?.name || "Unknown"} •{" "}
                        <span className="text-[#e22718] uppercase font-bold">{task.current_status.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                    <Link
                      href="/qc/kanban"
                      className="shrink-0 px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center text-[#7e7e7e]">
                <FileSearch className="h-10 w-10 mx-auto mb-4 opacity-40" />
                <p className="text-sm">You have cleared the review queue. Excellent work!</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </>
  );
}
