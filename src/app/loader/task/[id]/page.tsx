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

  // Get the latest QC rejection reason if task is in needs_revision
  const latestRejection = history?.find(
    (h) => h.new_status === "needs_revision" && h.notes
  );

  if (!task) return <div>Task not found.</div>;

  return (
    <>
      <Header title={profile?.role === 'qc' ? "Quality Review" : "Task Execution"} />
      <div className="max-w-[1200px] mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

        {/* Left Column: Context & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* QC Rejection Alert - Show prominently if task needs revision */}
          {task.current_status === "needs_revision" && latestRejection && (
            <div className="bg-warning-red/5 border-2 border-warning-red/30 rounded-[24px] p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-warning-red/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-warning-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-warning-red mb-2">Task Needs Revision</h2>
                  <p className="text-body-gray text-sm mb-4">
                    QC has reviewed your submission and requested changes. Please address the following:
                  </p>
                  <div className="bg-white rounded-xl p-4 border border-warning-red/20">
                    <p className="text-sm font-semibold text-deep-charcoal mb-1">QC Feedback:</p>
                    <p className="text-deep-charcoal whitespace-pre-wrap">{latestRejection.notes}</p>
                    <p className="text-xs text-body-gray mt-3">
                      Reviewed by: {latestRejection.profiles?.full_name} • {new Date(latestRejection.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[24px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3]">
            <h2 className="text-sm uppercase tracking-wider text-body-gray font-semibold mb-2">Target Chapter</h2>
            <h1 className="text-3xl font-light text-display-ink mb-6">{task.chapter?.name}</h1>
            <p className="text-body-gray">Please complete your assigned workload and submit the proof of work URL below.</p>
          </div>

          <div className="bg-white rounded-[24px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-[#f3f3f3]">
            <h3 className="text-xl font-light text-display-ink mb-6">Task Audit Log</h3>
            <div className="space-y-6">
              {history?.map((h) => {
                const isRejection = h.action?.includes("rejected");
                const isApproval = h.action?.includes("approved");
                const borderColor = isRejection ? "border-warning-red" : isApproval ? "border-[#2e7d32]" : "border-divider-tint";

                return (
                  <div key={h.id} className={`flex gap-4 border-l-2 ${borderColor} pl-4`}>
                    <div className="flex-1">
                      <p className="text-sm text-body-gray">{new Date(h.created_at).toLocaleString()}</p>
                      <p className="font-medium text-deep-charcoal mt-1">
                        {h.profiles?.full_name} marked as{" "}
                        <span className={`uppercase text-xs px-2 py-0.5 rounded font-semibold ${isRejection ? "bg-warning-red/10 text-warning-red" :
                            isApproval ? "bg-[#2e7d32]/10 text-[#2e7d32]" :
                              "bg-ice-mist text-body-gray"
                          }`}>
                          {h.new_status?.replace(/_/g, " ")}
                        </span>
                      </p>
                      {h.notes && (
                        <p className={`text-sm mt-2 p-2 rounded ${isRejection ? "bg-warning-red/5 text-warning-red font-medium" : "text-body-gray italic"
                          }`}>
                          &ldquo;{h.notes}&rdquo;
                        </p>
                      )}
                      {h.proof_url && (
                        <a
                          href={h.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-ps-blue mt-2 inline-flex items-center gap-1 hover:underline"
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
              {history?.length === 0 && <p className="text-sm text-body-gray">No history yet.</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Submission Form */}
        <div>
          {profile?.role === 'qc' ? (
            <div className="bg-white rounded-[24px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-ps-blue/20">
              <h3 className="text-xl font-light text-display-ink mb-6">Review Action</h3>
              {(task.current_status === 'script_generated' || task.current_status === 'video_edited') ? (
                <QCActionButtons 
                  taskId={task.id} 
                  userId={user!.id} 
                  currentStatus={task.current_status} 
                />
              ) : (
                <div className="p-4 bg-ice-mist rounded-xl text-center text-body-gray text-sm">
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
