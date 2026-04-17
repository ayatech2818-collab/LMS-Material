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

  // Build a helper to apply optional date range to a query
  // We apply date filters on task_history using created_at

  // Awaiting Review — no date filter (these are current, not historical)
  const { count: awaitingReview } = await adminSupabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("current_status", ["script_generated", "video_edited"]);

  // My Approved — filtered by date if provided
  let approvedQuery = adminSupabase
    .from("task_history")
    .select("*", { count: "exact", head: true })
    .eq("changed_by", user?.id)
    .in("action", ["qc_approved_script", "qc_approved_video"]);
  if (fromDate) approvedQuery = approvedQuery.gte("created_at", fromDate.toISOString());
  if (toDate) approvedQuery = approvedQuery.lte("created_at", toDate.toISOString());
  const { count: myApproved } = await approvedQuery;

  // My Rejected — filtered by date if provided
  let rejectedQuery = adminSupabase
    .from("task_history")
    .select("*", { count: "exact", head: true })
    .eq("changed_by", user?.id)
    .in("action", ["qc_rejected_script", "qc_rejected_video"]);
  if (fromDate) rejectedQuery = rejectedQuery.gte("created_at", fromDate.toISOString());
  if (toDate) rejectedQuery = rejectedQuery.lte("created_at", toDate.toISOString());
  const { count: myRejected } = await rejectedQuery;

  // Quick Access: tasks currently awaiting review
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
      <div className="max-w-[1920px] mx-auto space-y-8">
        
        {/* Header & Date Filter */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="text-3xl font-light text-display-ink tracking-wide mb-1">
              Quality Assurance
            </h2>
            <p className="text-body-gray">
              Monitor your review performance and pipeline health.
            </p>
          </div>
          <Suspense fallback={<div className="h-9 w-48 bg-[#f3f3f3] rounded-[6px] animate-pulse" />}>
            <DateRangePicker />
          </Suspense>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[24px] border border-[#f3f3f3] shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-body-gray font-medium">Awaiting Review</h3>
              <div className="p-3 bg-commerce-orange/10 rounded-full">
                <FileSearch className="h-6 w-6 text-commerce-orange" />
              </div>
            </div>
            <p className="text-[40px] font-light text-display-ink">{awaitingReview || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-[#f3f3f3] shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-body-gray font-medium">My Approved</h3>
              <div className="p-3 bg-[#2e7d32]/10 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-[#2e7d32]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-display-ink">{myApproved || 0}</p>
          </div>
          
          <div className="bg-white p-6 rounded-[24px] border border-[#f3f3f3] shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-body-gray font-medium">My Rejected</h3>
              <div className="p-3 bg-warning-red/10 rounded-full">
                <XCircle className="h-6 w-6 text-warning-red" />
              </div>
            </div>
            <p className="text-[40px] font-light text-display-ink">{myRejected || 0}</p>
          </div>
        </section>

        {/* Quick Access */}
        <section className="bg-white border border-[#f3f3f3] rounded-[24px] overflow-hidden shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
          <div className="p-6 border-b border-[#f3f3f3] flex justify-between items-center bg-ice-mist">
            <h3 className="font-semibold text-deep-charcoal text-lg">Priority Review Queue</h3>
            <Link href="/qc/kanban" className="text-sm font-medium text-ps-blue hover:text-ps-blue/80 transition-colors">
              View QC Kanban →
            </Link>
          </div>
          <div className="p-0">
            {pendingTasks && pendingTasks.length > 0 ? (
              <ul className="divide-y divide-[#f3f3f3]">
                {pendingTasks.map((task: any) => (
                  <li key={task.id} className="p-6 hover:bg-ice-mist transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-medium text-deep-charcoal mb-1">{task.title}</p>
                      <p className="text-sm text-body-gray">
                        Chapter: {task.chapter?.name || "Unknown"} • Stage: <span className="text-commerce-orange">{task.current_status.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                    <Link 
                      href="/qc/kanban" 
                      className="px-6 py-2 bg-white border border-[#e5e5e5] rounded-full text-sm font-medium text-deep-charcoal hover:border-black transition-colors"
                    >
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center text-body-gray">
                <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You have cleared the review queue. Excellent work!</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </>
  );
}
