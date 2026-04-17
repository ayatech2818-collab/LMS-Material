"use client";

import { useState } from "react";
import { X, ExternalLink, MessageSquare, Link as LinkIcon } from "lucide-react";
import { QCActionButtons } from "./qc-action-buttons";

// ── Stage badge ───────────────────────────────────────────────────────────────

/** Derive stage from a task's current_status OR from the QC action name. */
function getQCStage(status?: string, action?: string): "script" | "final" {
  if (status === "script_generated") return "script";
  if (status === "video_edited")     return "final";
  if (action?.includes("script"))    return "script";
  return "final";
}

function QCStageBadge({ stage }: { stage: "script" | "final" }) {
  if (stage === "script") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-ps-blue/10 text-ps-blue border border-ps-blue/20 uppercase">
        1st QC · Script
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 uppercase">
      2nd QC · Final
    </span>
  );
}

// ── QC Board ──────────────────────────────────────────────────────────────────

export function QCBoard({ userId, pendingTasks, approvedTasks, rejectedTasks }: any) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // ── Card: Pending Review ──────────────────────────────────────────────────

  const renderPendingCard = (task: any) => {
    const stage = getQCStage(task.current_status);
    return (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="bg-white border text-left border-divider-tint rounded-xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-ps-blue cursor-pointer transition-all"
      >
        {/* Stage badge + proof URL indicator */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <QCStageBadge stage={stage} />
          {task.proof_url && (
            <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-semibold shrink-0">
              <LinkIcon className="w-2.5 h-2.5" /> URL
            </span>
          )}
        </div>

        {/* Board + Subject */}
        {(task.board?.name || task.subject?.name) && (
          <p className="text-xs font-semibold text-deep-charcoal mb-0.5 truncate">
            {[task.board?.name, task.subject?.name].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Chapter */}
        <p className="text-xs text-body-gray mb-1 font-medium truncate">
          {task.chapter?.name || task.title || "Untitled Task"}
        </p>

        {/* Submitted date */}
        {task.submitted_at ? (
          <p className="text-[10px] text-body-gray mt-2">
            Submitted: {new Date(task.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : (
          <p className="text-[10px] text-body-gray mt-2">
            Created: {new Date(task.created_at).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>
    );
  };

  // ── Card: History (Approved / Rejected) ──────────────────────────────────

  const renderHistoryCard = (historyItem: any) => {
    const t = historyItem.tasks;
    const isApproved = historyItem.action.includes("approved");
    const stage = getQCStage(undefined, historyItem.action);

    return (
      <div
        key={historyItem.id}
        onClick={() => setSelectedTask(historyItem)}
        className="bg-white border text-left border-divider-tint rounded-xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-ps-blue cursor-pointer transition-all"
      >
        {/* Stage badge + action badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <QCStageBadge stage={stage} />
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
            isApproved
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-orange-50 text-orange-600 border-orange-200"
          }`}>
            {isApproved ? "Approved" : "Rejected"}
          </span>
        </div>

        {/* Board + Subject from full task join */}
        {(t?.board?.name || t?.subject?.name) && (
          <p className="text-xs font-semibold text-deep-charcoal mb-0.5 truncate">
            {[t?.board?.name, t?.subject?.name].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Chapter */}
        <p className="text-xs text-body-gray mb-1 font-medium truncate">
          {t?.chapter?.name || t?.title || "Task Document"}
        </p>

        {/* Proof URL indicator */}
        {historyItem.proof_url && (
          <span className="inline-flex items-center gap-1 text-[10px] text-green-700">
            <LinkIcon className="w-2.5 h-2.5" /> Has proof URL
          </span>
        )}

        {/* Review date */}
        <p className="text-[10px] text-body-gray mt-1">
          Reviewed: {new Date(historyItem.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    );
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const isHistoryItem = !!selectedTask?.action;

  // For pending tasks, use submitted_at; for history items use the review date
  const displayDate = isHistoryItem
    ? selectedTask?.created_at
    : (selectedTask?.submitted_at || selectedTask?.created_at);

  const displayDateLabel = isHistoryItem ? "Reviewed On" : (selectedTask?.submitted_at ? "Submitted" : "Created");

  // Resolve task data (direct for pending, nested for history)
  const modalTask = isHistoryItem ? selectedTask?.tasks : selectedTask;
  const modalStage = isHistoryItem
    ? getQCStage(undefined, selectedTask?.action)
    : getQCStage(selectedTask?.current_status);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* Pending Review */}
        <div className="flex flex-col bg-ice-mist rounded-[20px] p-4 h-full border border-[#f3f3f3]">
          <h3 className="font-semibold text-deep-charcoal mb-4 flex justify-between items-center">
            Pending Review
            <span className="text-ps-blue bg-ps-blue/10 text-xs px-2.5 py-1 rounded-full font-bold">
              {pendingTasks.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {pendingTasks.map((t: any) => renderPendingCard(t))}
            {pendingTasks.length === 0 && (
              <p className="text-sm text-body-gray text-center mt-6">Queue clear!</p>
            )}
          </div>
        </div>

        {/* Approved */}
        <div className="flex flex-col bg-ice-mist rounded-[20px] p-4 h-full border border-[#f3f3f3]">
          <h3 className="font-semibold text-deep-charcoal mb-4 flex justify-between items-center">
            Approved
            <span className="text-green-700 bg-green-100 text-xs px-2.5 py-1 rounded-full font-bold">
              {approvedTasks.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {approvedTasks.map((t: any) => renderHistoryCard(t))}
            {approvedTasks.length === 0 && (
              <p className="text-sm text-body-gray text-center mt-6">No approvals yet</p>
            )}
          </div>
        </div>

        {/* Rejected */}
        <div className="flex flex-col bg-ice-mist rounded-[20px] p-4 h-full border border-[#f3f3f3]">
          <h3 className="font-semibold text-deep-charcoal mb-4 flex justify-between items-center">
            Rejected
            <span className="text-orange-600 bg-orange-50 text-xs px-2.5 py-1 rounded-full font-bold">
              {rejectedTasks.length}
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {rejectedTasks.map((t: any) => renderHistoryCard(t))}
            {rejectedTasks.length === 0 && (
              <p className="text-sm text-body-gray text-center mt-6">No rejections yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[#f3f3f3] flex justify-between items-start bg-ice-mist">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-xl font-medium text-deep-charcoal truncate">
                  {modalTask?.board?.name || modalTask?.title || "Task Quality Review"}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <QCStageBadge stage={modalStage} />
                  {isHistoryItem && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedTask.action.includes("approved")
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-orange-50 text-orange-600 border-orange-200"
                    }`}>
                      {selectedTask.action.includes("approved") ? "Approved" : "Rejected"}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                aria-label="Close"
                className="p-2 hover:bg-black/5 rounded-full text-body-gray shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Task Information */}
              <div className="bg-ice-mist p-4 rounded-xl border border-[#e5e5e5]">
                <h4 className="text-sm font-semibold text-body-gray uppercase tracking-wider mb-3">
                  Task Information
                </h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <p className="text-deep-charcoal">
                    <span className="font-semibold">Board:</span>{" "}
                    <span className="font-light">{modalTask?.board?.name || "N/A"}</span>
                  </p>
                  <p className="text-deep-charcoal">
                    <span className="font-semibold">Class:</span>{" "}
                    <span className="font-light">{modalTask?.class?.name || "N/A"}</span>
                  </p>
                  <p className="text-deep-charcoal">
                    <span className="font-semibold">Subject:</span>{" "}
                    <span className="font-light">{modalTask?.subject?.name || "N/A"}</span>
                  </p>
                  <p className="text-deep-charcoal">
                    <span className="font-semibold">Chapter:</span>{" "}
                    <span className="font-light">{modalTask?.chapter?.name || "N/A"}</span>
                  </p>
                  <p className="text-deep-charcoal col-span-2">
                    <span className="font-semibold">Review Stage:</span>{" "}
                    <span className="font-medium">
                      {modalStage === "script" ? "1st QC — Script / Plan" : "2nd QC — Final Product"}
                    </span>
                  </p>
                  {displayDate && (
                    <p className="text-deep-charcoal col-span-2">
                      <span className="font-semibold">{displayDateLabel}:</span>{" "}
                      <span className="font-light">
                        {new Date(displayDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Proof URL */}
              {selectedTask.proof_url ? (
                <div className="bg-ps-blue/5 p-4 rounded-xl border border-ps-blue/20">
                  <h4 className="text-sm font-semibold text-ps-blue flex items-center gap-2 mb-3">
                    <ExternalLink className="w-4 h-4" /> Proof of Work
                  </h4>
                  <div className="flex items-center gap-3">
                    <p className="text-ps-blue font-medium text-sm break-all flex-1">
                      {selectedTask.proof_url}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(selectedTask.proof_url, "_blank", "noopener,noreferrer")
                      }
                      className="shrink-0 flex items-center gap-2 bg-ps-blue text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-ps-cyan transition-colors hover:scale-[1.03] active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#f9f9f9] p-4 rounded-xl border border-[#e5e5e5]">
                  <p className="text-sm text-body-gray text-center">No proof URL provided.</p>
                </div>
              )}

              {/* Handoff Notes from Loader (pending tasks only) */}
              {!isHistoryItem && selectedTask.notes && (
                <div className="bg-ice-mist p-4 rounded-xl border border-[#e5e5e5]">
                  <h4 className="text-sm font-semibold text-body-gray flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4" /> Handoff Notes from Loader
                  </h4>
                  <p className="text-deep-charcoal whitespace-pre-wrap text-sm">{selectedTask.notes}</p>
                </div>
              )}

              {/* Rejection reason (history items) */}
              {isHistoryItem && selectedTask.action?.includes("rejected") && selectedTask.notes && (
                <div className="bg-warning-red/5 p-4 rounded-xl border border-warning-red/20">
                  <h4 className="text-sm font-semibold text-warning-red flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4" /> Rejection Reason
                  </h4>
                  <p className="text-deep-charcoal whitespace-pre-wrap text-sm">{selectedTask.notes}</p>
                </div>
              )}
            </div>

            {/* Action buttons (pending only) */}
            {!isHistoryItem && (
              <div className="p-6 bg-white border-t border-[#f3f3f3]">
                <QCActionButtons
                  taskId={selectedTask.id}
                  userId={userId}
                  currentStatus={selectedTask.current_status}
                  onComplete={() => setSelectedTask(null)}
                />
              </div>
            )}

            {/* Status footer (history items) */}
            {isHistoryItem && (
              <div className="p-5 bg-ice-mist border-t border-[#f3f3f3] text-center">
                <p className="text-sm font-medium text-body-gray">
                  You{" "}
                  <span className={selectedTask.action.includes("approved") ? "text-green-700 font-semibold" : "text-orange-600 font-semibold"}>
                    {selectedTask.action.includes("approved") ? "approved" : "rejected"}
                  </span>{" "}
                  this task.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
