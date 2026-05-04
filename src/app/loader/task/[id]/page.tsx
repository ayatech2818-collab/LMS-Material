import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitWorkForm } from "./submit-form";
import { QCActionButtons } from "@/app/qc/kanban/qc-action-buttons";


export default async function TaskExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", user?.id)
    .single();

  const { data: task } = await adminClient
    .from("tasks")
    .select("*, chapter:chapter_id(name)")
    .eq("id", id)
    .single();

  const { data: history } = await adminClient
    .from("task_history")
    .select("*, profiles(full_name)")
    .eq("task_id", id)
    .order("created_at", { ascending: false });

  const latestRejection = history?.find(
    (h) => h.new_status === "needs_revision" && h.notes
  );

  if (!task) return <div className="text-white p-8">Task not found.</div>;

  return (
    <>
      <Header title={profile?.role === 'qc' ? "Quality Review" : "Task Execution"} />
      <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 mt-4">

        {/* Left Column: Context & History */}
        <div className="lg:col-span-2 space-y-5">
          {/* QC Rejection Alert */}
          {task.current_status === "needs_revision" && latestRejection && (
            <div className="bg-[#e22718]/5 border border-[#e22718]/30 p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#e22718]/10 border border-[#e22718]/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#e22718]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-[#e22718] tracking-[1.5px] uppercase mb-2">Task Needs Revision</h2>
                  <p className="text-[#bbbbbb] text-sm mb-4">
                    QC has reviewed your submission and requested changes. Please address the following:
                  </p>
                  <div className="bg-[#262626] border border-[#e22718]/20 p-4">
                    <p className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px] mb-2">QC Feedback:</p>
                    <p className="text-[#e6e6e6] whitespace-pre-wrap text-sm">{latestRejection.notes}</p>
                    <p className="text-[10px] text-[#7e7e7e] mt-3">
                      Reviewed by: {latestRejection.profiles?.full_name} •{" "}
                      {new Date(latestRejection.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
            <p className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[2px] mb-2">Target Chapter</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-[1px] mb-4">{task.chapter?.name}</h1>
            <p className="text-[#bbbbbb] text-sm">Please complete your assigned workload and submit the proof of work URL below.</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
            <h3 className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[2px] mb-6">Task Audit Log</h3>
            <div className="space-y-5">
              {history?.map((h) => {
                const isRejection = h.action?.includes("rejected");
                const isApproval = h.action?.includes("approved");
                const borderColor = isRejection ? "border-[#e22718]" : isApproval ? "border-[#0fa336]" : "border-[#3c3c3c]";

                return (
                  <div key={h.id} className={`flex gap-4 border-l-2 ${borderColor} pl-4`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#7e7e7e]">{new Date(h.created_at).toLocaleString()}</p>
                      <p className="font-medium text-[#e6e6e6] mt-1 text-sm">
                        {h.profiles?.full_name} marked as{" "}
                        <span className={`uppercase text-[10px] px-2 py-0.5 font-bold tracking-[1px] border ${
                          isRejection ? "bg-[#e22718]/10 text-[#e22718] border-[#e22718]/30" :
                          isApproval ? "bg-[#0fa336]/10 text-[#0fa336] border-[#0fa336]/30" :
                          "bg-[#262626] text-[#bbbbbb] border-[#3c3c3c]"
                        }`}>
                          {h.new_status?.replace(/_/g, " ")}
                        </span>
                      </p>
                      {h.notes && (
                        <p className={`text-sm mt-2 p-2 ${
                          isRejection ? "bg-[#e22718]/5 text-[#e22718] font-medium border border-[#e22718]/20" : "text-[#bbbbbb] italic"
                        }`}>
                          &ldquo;{h.notes}&rdquo;
                        </p>
                      )}
                      {h.proof_url && (
                        <a
                          href={h.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0066b1] mt-2 inline-flex items-center gap-1 hover:text-[#1c69d4] hover:underline transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Attachment
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              {history?.length === 0 && <p className="text-sm text-[#7e7e7e]">No history yet.</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Submission Form */}
        <div>
          {profile?.role === 'qc' ? (
            <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
              <h3 className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[2px] mb-6">Review Action</h3>
              {(task.current_status === 'script_generated' || task.current_status === 'video_edited') ? (
                <QCActionButtons
                  taskId={task.id}
                  userId={user!.id}
                  currentStatus={task.current_status}
                />
              ) : (
                <div className="p-4 bg-[#262626] border border-[#3c3c3c] text-center text-[#7e7e7e] text-sm">
                  This task is not currently awaiting review.
                </div>
              )}
            </div>
          ) : (
            <SubmitWorkForm taskId={task.id} userId={user!.id} userName={profile?.full_name || "Unknown Identity"} />
          )}
        </div>

      </div>
    </>
  );
}
