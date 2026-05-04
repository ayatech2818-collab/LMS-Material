"use client";

import { useState } from "react";
import { X, ExternalLink, MessageSquare, Link as LinkIcon } from "lucide-react";
import { QCActionButtons } from "./qc-action-buttons";

function getQCStage(status?: string, action?: string): "script" | "final" {
  if (status === "script_generated") return "script";
  if (status === "video_edited")     return "final";
  if (action?.includes("script"))    return "script";
  return "final";
}

function QCStageBadge({ stage }: { stage: "script" | "final" }) {
  if (stage === "script") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-[1px] bg-[#0066b1]/10 text-[#0066b1] border border-[#0066b1]/30 uppercase">
        1st QC · Script
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-[1px] bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/30 uppercase">
      2nd QC · Final
    </span>
  );
}

export function QCBoard({ userId, pendingTasks, approvedTasks, rejectedTasks }: any) {
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const renderPendingCard = (task: any) => {
    const stage = getQCStage(task.current_status);
    return (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="bg-[#262626] border border-[#3c3c3c] text-left p-4 hover:border-[#0066b1] cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <QCStageBadge stage={stage} />
          {task.proof_url && (
            <span className="flex items-center gap-1 text-[10px] text-[#0fa336] bg-[#0fa336]/10 px-2 py-0.5 border border-[#0fa336]/30 font-bold shrink-0">
              <LinkIcon className="w-2.5 h-2.5" /> URL
            </span>
          )}
        </div>

        {(task.board?.name || task.subject?.name) && (
          <p className="text-xs font-bold text-[#e6e6e6] mb-0.5 truncate">
            {[task.board?.name, task.subject?.name].filter(Boolean).join(" · ")}
          </p>
        )}

        <p className="text-xs text-[#bbbbbb] mb-1 font-medium truncate">
          {task.chapter?.name || task.title || "Untitled Task"}
        </p>

        {task.submitted_at ? (
          <p className="text-[10px] text-[#7e7e7e] mt-2">
            Submitted: {new Date(task.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : (
          <p className="text-[10px] text-[#7e7e7e] mt-2">
            Created: {new Date(task.created_at).toLocaleDateString("en-IN")}
          </p>
        )}
      </div>
    );
  };

  const renderHistoryCard = (historyItem: any) => {
    const t = historyItem.tasks;
    const isApproved = historyItem.action.includes("approved");
    const stage = getQCStage(undefined, historyItem.action);

    return (
      <div
        key={historyItem.id}
        onClick={() => setSelectedTask(historyItem)}
        className="bg-[#262626] border border-[#3c3c3c] text-left p-4 hover:border-[#0066b1] cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <QCStageBadge stage={stage} />
          <span className={`text-[10px] px-2 py-0.5 font-bold border shrink-0 uppercase tracking-[1px] ${
            isApproved
              ? "bg-[#0fa336]/10 text-[#0fa336] border-[#0fa336]/30"
              : "bg-[#e22718]/10 text-[#e22718] border-[#e22718]/30"
          }`}>
            {isApproved ? "Approved" : "Rejected"}
          </span>
        </div>

        {(t?.board?.name || t?.subject?.name) && (
          <p className="text-xs font-bold text-[#e6e6e6] mb-0.5 truncate">
            {[t?.board?.name, t?.subject?.name].filter(Boolean).join(" · ")}
          </p>
        )}

        <p className="text-xs text-[#bbbbbb] mb-1 font-medium truncate">
          {t?.chapter?.name || t?.title || "Task Document"}
        </p>

        {historyItem.proof_url && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[#0fa336]">
            <LinkIcon className="w-2.5 h-2.5" /> Has proof URL
          </span>
        )}

        <p className="text-[10px] text-[#7e7e7e] mt-1">
          Reviewed: {new Date(historyItem.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    );
  };

  const isHistoryItem = !!selectedTask?.action;
  const displayDate = isHistoryItem
    ? selectedTask?.created_at
    : (selectedTask?.submitted_at || selectedTask?.created_at);
  const displayDateLabel = isHistoryItem ? "Reviewed On" : (selectedTask?.submitted_at ? "Submitted" : "Created");
  const modalTask = isHistoryItem ? selectedTask?.tasks : selectedTask;
  const modalStage = isHistoryItem
    ? getQCStage(undefined, selectedTask?.action)
    : getQCStage(selectedTask?.current_status);

  return (
    <>
      {/* Kanban scrollbar styling */}
      <style>{`
        .qc-kanban-col::-webkit-scrollbar { width: 4px; }
        .qc-kanban-col::-webkit-scrollbar-track { background: transparent; }
        .qc-kanban-col::-webkit-scrollbar-thumb { background: #3c3c3c; border-radius: 2px; }
        .qc-kanban-col::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-0">
        {/* Pending Review */}
        <div className="flex flex-col bg-[#1a1a1a] border border-[#3c3c3c] p-4 min-h-0 overflow-hidden">
          <h3 className="shrink-0 text-xs font-bold text-white tracking-[1.5px] uppercase mb-4 flex justify-between items-center">
            Pending Review
            <span className="text-[#0066b1] bg-[#0066b1]/10 text-xs px-2.5 py-1 font-bold border border-[#0066b1]/20">
              {pendingTasks.length}
            </span>
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 qc-kanban-col">
            {pendingTasks.map((t: any) => renderPendingCard(t))}
            {pendingTasks.length === 0 && (
              <p className="text-sm text-[#7e7e7e] text-center mt-6">Queue clear!</p>
            )}
          </div>
        </div>

        {/* Approved */}
        <div className="flex flex-col bg-[#1a1a1a] border border-[#3c3c3c] p-4 min-h-0 overflow-hidden">
          <h3 className="shrink-0 text-xs font-bold text-white tracking-[1.5px] uppercase mb-4 flex justify-between items-center">
            Approved
            <span className="text-[#0fa336] bg-[#0fa336]/10 text-xs px-2.5 py-1 font-bold border border-[#0fa336]/20">
              {approvedTasks.length}
            </span>
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 qc-kanban-col">
            {approvedTasks.map((t: any) => renderHistoryCard(t))}
            {approvedTasks.length === 0 && (
              <p className="text-sm text-[#7e7e7e] text-center mt-6">No approvals yet</p>
            )}
          </div>
        </div>

        {/* Rejected */}
        <div className="flex flex-col bg-[#1a1a1a] border border-[#3c3c3c] p-4 min-h-0 overflow-hidden">
          <h3 className="shrink-0 text-xs font-bold text-white tracking-[1.5px] uppercase mb-4 flex justify-between items-center">
            Rejected
            <span className="text-[#e22718] bg-[#e22718]/10 text-xs px-2.5 py-1 font-bold border border-[#e22718]/20">
              {rejectedTasks.length}
            </span>
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 qc-kanban-col">
            {rejectedTasks.map((t: any) => renderHistoryCard(t))}
            {rejectedTasks.length === 0 && (
              <p className="text-sm text-[#7e7e7e] text-center mt-6">No rejections yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[#3c3c3c] flex justify-between items-start bg-[#0d0d0d]">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="text-base font-bold text-white tracking-[1px] uppercase truncate">
                  {modalTask?.board?.name || modalTask?.title || "Task Quality Review"}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <QCStageBadge stage={modalStage} />
                  {isHistoryItem && (
                    <span className={`text-[10px] px-2 py-0.5 font-bold border uppercase tracking-[1px] ${
                      selectedTask.action.includes("approved")
                        ? "bg-[#0fa336]/10 text-[#0fa336] border-[#0fa336]/30"
                        : "bg-[#e22718]/10 text-[#e22718] border-[#e22718]/30"
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
                className="p-1.5 hover:bg-[#3c3c3c] rounded-full text-[#7e7e7e] hover:text-white shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Task Information */}
              <div className="bg-[#262626] border border-[#3c3c3c] p-4">
                <h4 className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[2px] mb-3">
                  Task Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <p className="text-[#e6e6e6]">
                    <span className="font-bold text-[#7e7e7e] uppercase text-[10px] tracking-[1px]">Board: </span>
                    {modalTask?.board?.name || "N/A"}
                  </p>
                  <p className="text-[#e6e6e6]">
                    <span className="font-bold text-[#7e7e7e] uppercase text-[10px] tracking-[1px]">Class: </span>
                    {modalTask?.class?.name || "N/A"}
                  </p>
                  <p className="text-[#e6e6e6]">
                    <span className="font-bold text-[#7e7e7e] uppercase text-[10px] tracking-[1px]">Subject: </span>
                    {modalTask?.subject?.name || "N/A"}
                  </p>
                  <p className="text-[#e6e6e6]">
                    <span className="font-bold text-[#7e7e7e] uppercase text-[10px] tracking-[1px]">Chapter: </span>
                    {modalTask?.chapter?.name || "N/A"}
                  </p>
                  <p className="text-[#e6e6e6] col-span-2">
                    <span className="font-bold text-[#7e7e7e] uppercase text-[10px] tracking-[1px]">Stage: </span>
                    {modalStage === "script" ? "1st QC — Script / Plan" : "2nd QC — Final Product"}
                  </p>
                  {displayDate && (
                    <p className="text-[#e6e6e6] col-span-2">
                      <span className="font-bold text-[#7e7e7e] uppercase text-[10px] tracking-[1px]">{displayDateLabel}: </span>
                      {new Date(displayDate).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Proof URL */}
              {selectedTask.proof_url ? (
                <div className="bg-[#0066b1]/10 border border-[#0066b1]/30 p-4">
                  <h4 className="text-[10px] font-bold text-[#0066b1] flex items-center gap-2 mb-3 uppercase tracking-[1.5px]">
                    <ExternalLink className="w-4 h-4" /> Proof of Work
                  </h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-[#bbbbbb] text-sm break-all flex-1">
                      {selectedTask.proof_url}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(selectedTask.proof_url, "_blank", "noopener,noreferrer")}
                      className="shrink-0 flex items-center gap-2 bg-transparent border border-[#0066b1] text-[#0066b1] px-4 py-2 text-xs font-bold uppercase tracking-[1.5px] hover:bg-[#0066b1] hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open URL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#262626] border border-[#3c3c3c] p-4">
                  <p className="text-sm text-[#7e7e7e] text-center">No proof URL provided.</p>
                </div>
              )}

              {/* Handoff Notes */}
              {!isHistoryItem && selectedTask.notes && (
                <div className="bg-[#262626] border border-[#3c3c3c] p-4">
                  <h4 className="text-[10px] font-bold text-[#7e7e7e] flex items-center gap-2 mb-2 uppercase tracking-[1.5px]">
                    <MessageSquare className="w-4 h-4" /> Handoff Notes from Loader
                  </h4>
                  <p className="text-[#e6e6e6] whitespace-pre-wrap text-sm">{selectedTask.notes}</p>
                </div>
              )}

              {/* Rejection reason */}
              {isHistoryItem && selectedTask.action?.includes("rejected") && selectedTask.notes && (
                <div className="bg-[#e22718]/5 border border-[#e22718]/20 p-4">
                  <h4 className="text-[10px] font-bold text-[#e22718] flex items-center gap-2 mb-2 uppercase tracking-[1.5px]">
                    <MessageSquare className="w-4 h-4" /> Rejection Reason
                  </h4>
                  <p className="text-[#e6e6e6] whitespace-pre-wrap text-sm">{selectedTask.notes}</p>
                </div>
              )}
            </div>

            {/* Action buttons (pending only) */}
            {!isHistoryItem && (
              <div className="p-6 bg-[#0d0d0d] border-t border-[#3c3c3c]">
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
              <div className="p-5 bg-[#0d0d0d] border-t border-[#3c3c3c] text-center">
                <p className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">
                  You{" "}
                  <span className={selectedTask.action.includes("approved") ? "text-[#0fa336]" : "text-[#e22718]"}>
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
