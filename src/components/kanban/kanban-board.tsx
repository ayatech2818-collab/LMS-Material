"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UserPlus, X, Loader2, AlertTriangle, Trash2, Search, Calendar, ChevronDown, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { moveTaskStatus, getLoaders, assignLoaderToTask, deleteTask } from "@/app/admin/kanban/actions";
import { formatSubRole } from "@/lib/utils";

type TaskAssignment = {
  stage: string;
  user?: {
    full_name: string;
    sub_role: string | null;
    avatar_url: string | null;
  } | null;
};

type TaskHistory = {
  proof_url: string | null;
  created_at: string;
  action?: string | null;
  contributor?: { full_name: string } | null;
};

export type Task = {
  id: string;
  current_status: string;
  revision_target_status?: string | null;
  created_at: string;
  title?: string | null;
  board?: { name: string } | null;
  class?: { name: string } | null;
  subject?: { name: string } | null;
  chapter?: { name: string } | null;
  hierarchies?: { name: string } | null;
  task_assignments?: TaskAssignment[];
  task_history?: TaskHistory[];
  /** Most recent stage-completion timestamp, derived from task_history (see getKanbanTasks). */
  last_completed_at?: string | null;
  /** Distinct loader names who submitted work on this task (for searching completed tasks). */
  contributors?: string[];
};

type LoaderProfile = {
  id: string;
  full_name: string;
  email: string;
  sub_role: string | null;
};

type KanbanBoardProps = {
  initialTasks: Task[];
  userId: string;
};

const COLUMNS = [
  { id: "assigned",        label: "Assigned",         topClass: "[border-top:3px_solid_#6366f1]", countClass: "text-[#818cf8] border-[#6366f1]/30 bg-[#6366f1]/10" },
  { id: "script_generated",label: "Script Generated", topClass: "[border-top:3px_solid_#0066b1]", countClass: "text-[#0066b1] border-[#0066b1]/30 bg-[#0066b1]/10" },
  { id: "script_approved", label: "Script Approval",  topClass: "[border-top:3px_solid_#0fa336]", countClass: "text-[#0fa336] border-[#0fa336]/30 bg-[#0fa336]/10" },
  { id: "video_generated", label: "Video Generated",  topClass: "[border-top:3px_solid_#f4b400]", countClass: "text-[#f4b400] border-[#f4b400]/30 bg-[#f4b400]/10" },
  { id: "video_edited",    label: "Video Edited",     topClass: "[border-top:3px_solid_#a78bfa]", countClass: "text-[#a78bfa] border-[#7c3aed]/30 bg-[#7c3aed]/10" },
  { id: "final_approved",  label: "Final Approval",   topClass: "[border-top:3px_solid_#0fa336]", countClass: "text-[#0fa336] border-[#0fa336]/30 bg-[#0fa336]/10" },
];

function getDisplayColumn(task: Task): string {
  if (task.current_status === "needs_revision") {
    return task.revision_target_status ?? "assigned";
  }
  return task.current_status;
}

function getSubRoleBadgeClass(subRole: string | null | undefined) {
  switch (subRole) {
    case "script_writer":          return "border border-[#0066b1] text-[#0066b1]";
    case "video_audio_generator":  return "border border-[#f4b400] text-[#f4b400]";
    case "video_editor":           return "border border-[#a78bfa] text-[#a78bfa]";
    default:                       return "border border-[#3c3c3c] text-[#7e7e7e]";
  }
}

// ── Assign Loader Modal ──────────────────────────────────────────────────────

function AssignModal({
  task,
  loaders,
  onClose,
  onAssigned,
}: {
  task: Task;
  loaders: LoaderProfile[];
  onClose: () => void;
  onAssigned: (taskId: string, loaderId: string) => void;
}) {
  const [selectedLoader, setSelectedLoader] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Determine which sub_role is expected for this task's stage
  const getExpectedSubRole = (status: string): string | null => {
    switch (status) {
      case "assigned":        return "script_writer";
      case "script_approved": return "video_audio_generator";
      case "video_generated": return "video_editor";
      case "needs_revision":
        // Use revision_target_status to determine the correct role
        if (task.revision_target_status === "video_generated") return "video_editor";
        return "script_writer";
      default: return null; // show all loaders for statuses without a clear mapping
    }
  };

  // Determine the correct stage value for task_assignments (not raw status)
  const getAssignmentStage = (status: string): string => {
    if (status === "needs_revision") {
      return task.revision_target_status ?? "assigned";
    }
    return status;
  };

  const expectedSubRole = getExpectedSubRole(task.current_status);
  const filteredLoaders = expectedSubRole
    ? loaders.filter(l => l.sub_role === expectedSubRole)
    : loaders;

  const handleSubmit = async () => {
    if (!selectedLoader) return;
    setSubmitting(true);
    setError("");
    const stage = getAssignmentStage(task.current_status);
    const res = await assignLoaderToTask(task.id, selectedLoader, stage);
    if (res.error) {
      setError(res.error);
    } else {
      onAssigned(task.id, selectedLoader);
      onClose();
    }
    setSubmitting(false);
  };

  const selectedLoaderData = filteredLoaders.find(l => l.id === selectedLoader);
  const taskLabel = [task.board?.name, task.subject?.name, task.chapter?.name]
    .filter(Boolean)
    .join(" • ") || "Task";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] w-full max-w-sm p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#7e7e7e] hover:bg-[#3c3c3c] hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[3px] mb-1">Assign Loader</h2>
          <p className="text-[#bbbbbb] text-sm truncate">{taskLabel}</p>
          {expectedSubRole && (
            <p className="text-[10px] text-[#f4b400] uppercase tracking-[1px] mt-1">
              Showing: {formatSubRole(expectedSubRole)}s only
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#e22718]/10 border border-[#e22718]/30 text-[#e22718] text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Material Loader</label>
          <select
            aria-label="Select Material Loader"
            value={selectedLoader}
            onChange={e => setSelectedLoader(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#3c3c3c] p-2.5 outline-none focus:border-[#0066b1] transition-all text-sm text-[#e6e6e6]"
          >
            <option value="">Select a Loader...</option>
            {filteredLoaders.map(l => (
              <option key={l.id} value={l.id}>
                {l.full_name} — {formatSubRole(l.sub_role)}
              </option>
            ))}
          </select>

          {filteredLoaders.length === 0 && (
            <div className="p-3 bg-[#e22718]/10 border border-[#e22718]/30 text-[#e22718] text-xs">
              No active {expectedSubRole ? formatSubRole(expectedSubRole) : "loader"}s found.
            </div>
          )}

          {selectedLoaderData && (
            <div className="flex items-center gap-3 p-3 bg-[#262626] border border-[#3c3c3c]">
              <div className="w-8 h-8 bg-[#0066b1] flex items-center justify-center text-white text-sm font-bold shrink-0">
                {selectedLoaderData.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e6e6e6] truncate">{selectedLoaderData.full_name}</p>
                <p className="text-xs text-[#7e7e7e] truncate">{selectedLoaderData.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 shrink-0 ${getSubRoleBadgeClass(selectedLoaderData.sub_role)} uppercase tracking-[1px]`}>
                {formatSubRole(selectedLoaderData.sub_role)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedLoader}
          className="w-full mt-6 btn-m disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Assigning...
            </span>
          ) : (
            "Assign Loader"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  task,
  onClose,
  onDeleted,
}: {
  task: Task;
  onClose: () => void;
  onDeleted: (taskId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const taskLabel = [task.board?.name, task.subject?.name, task.chapter?.name]
    .filter(Boolean)
    .join(" • ") || "Task";

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const res = await deleteTask(task.id);
    if (res.error) {
      setError(res.error);
      setDeleting(false);
    } else {
      onDeleted(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] w-full max-w-sm p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#7e7e7e] hover:bg-[#3c3c3c] hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-[#e22718]/10 border border-[#e22718]/30 flex items-center justify-center mb-4">
            <Trash2 className="h-6 w-6 text-[#e22718]" />
          </div>
          <h2 className="text-sm font-bold text-white uppercase tracking-[2px]">Delete Task?</h2>
          <p className="text-[#bbbbbb] text-sm mt-2 leading-relaxed">
            This will permanently delete{" "}
            <span className="font-bold text-[#e6e6e6]">{taskLabel}</span>{" "}
            and all its history. This cannot be undone.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#e22718]/10 border border-[#e22718]/30 text-[#e22718] text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-3 font-bold text-xs tracking-[1.5px] uppercase border border-[#3c3c3c] text-[#bbbbbb] hover:bg-[#3c3c3c] hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 font-bold text-xs tracking-[1.5px] uppercase bg-[#e22718] border border-[#e22718] text-white hover:bg-[#c41f12] disabled:opacity-50 transition-all"
          >
            {deleting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </span>
            ) : (
              "Delete Task"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────────────────────────

function SortableTaskCard({
  task,
  onAssignClick,
  onDeleteClick,
}: {
  task: Task;
  onAssignClick: (task: Task) => void;
  onDeleteClick: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, data: task });

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (node) {
        node.style.transform = CSS.Transform.toString(transform) ?? '';
        node.style.transition = transition ?? '';
      }
    },
    [setNodeRef, transform, transition]
  );

  const allAssignments = task.task_assignments ?? [];
  const isRevision = task.current_status === "needs_revision";

  const chapterName = task.chapter?.name || task.hierarchies?.name;
  const breadcrumb = [task.board?.name, task.class?.name, task.subject?.name].filter(Boolean).join(" › ");
  const displayTitle = chapterName || task.title || "Untitled Task";

  const latestProof = task.task_history
    ?.filter(h => h.proof_url)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.proof_url;

  return (
    <div
      ref={mergedRef}
      {...attributes}
      {...listeners}
      className={`bg-[#141414] mb-2 cursor-grab transition-all border overflow-hidden ${
        isRevision
          ? "border-[#e22718]/50 ring-1 ring-[#e22718]/20"
          : "border-[#3c3c3c] hover:border-[#7e7e7e]"
      }`}
    >
      {/* Revision banner — full-width strip at top of card */}
      {isRevision && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e22718]/10 border-b border-[#e22718]/20">
          <AlertTriangle className="h-3 w-3 text-[#e22718] shrink-0" />
          <span className="text-[9px] font-bold text-[#e22718] uppercase tracking-[1.5px]">Needs Revision</span>
        </div>
      )}

      <div className="p-3 sm:p-4 flex flex-col h-full">
        {/* Breadcrumb path: Board › Class › Subject */}
        {breadcrumb && (
          <p className="text-[10px] sm:text-[11px] text-[#7e7e7e] uppercase tracking-[0.5px] truncate mb-1.5 leading-none">
            {breadcrumb}
          </p>
        )}

        {/* Chapter name — primary title & Link */}
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm font-bold text-[#e6e6e6] leading-snug break-words">
            {displayTitle}
          </p>
          {latestProof && (
            <a
              href={latestProof}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={e => e.stopPropagation()}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded bg-[#0066b1]/10 text-[#0066b1] hover:bg-[#0066b1] hover:text-white transition-colors border border-[#0066b1]/20 mt-0.5"
              title="View latest submitted work"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Assignments */}
        <div className="mt-auto border-t border-[#3c3c3c] pt-3">
          {allAssignments.length > 0 ? (
            <div className="space-y-2.5">
              {allAssignments.map((a, idx) => {
                const user = a.user;
                if (!user) return null;
                return (
                  <div key={idx} className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-[#0066b1] rounded-sm flex items-center justify-center text-white text-[10px] sm:text-[11px] font-bold shrink-0">
                      {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-[11px] sm:text-xs text-[#e6e6e6] font-medium truncate">
                        {user.full_name}
                      </span>
                      <span className={`text-[9px] font-bold mt-0.5 truncate tracking-[0.5px] ${getSubRoleBadgeClass(user.sub_role).replace('border', '').replace('px-1 py-0.5', '')}`}>
                        {formatSubRole(user.sub_role)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onAssignClick(task); }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-[#0066b1] hover:bg-[#0066b1]/10 py-2 transition-colors uppercase tracking-[1px] border border-[#0066b1]/20 rounded-sm"
                title="Reassign loader"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Reassign
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] sm:text-xs text-[#7e7e7e] italic">Unassigned</span>
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onAssignClick(task); }}
                className="shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-[#0066b1] hover:bg-[#0066b1]/10 px-3 py-1.5 transition-colors uppercase tracking-[1px] border border-[#0066b1]/20 rounded-sm"
                title="Assign loader"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Assign
              </button>
            </div>
          )}
        </div>

        {/* Footer: date + actions */}
        <div className="mt-3 pt-3 border-t border-[#3c3c3c] flex items-center justify-between">
          {task.current_status === "final_approved" && task.last_completed_at ? (
            <span className="text-[10px] sm:text-[11px] text-[#0fa336] font-medium" suppressHydrationWarning>
              Completed {new Date(task.last_completed_at).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : (
            <span className="text-[10px] sm:text-[11px] text-[#7e7e7e]" suppressHydrationWarning>
              {new Date(task.created_at).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {task.current_status !== "final_approved" && (
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onDeleteClick(task); }}
              className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-[#e22718]/80 hover:text-[#e22718] hover:bg-[#e22718]/10 px-2 py-1.5 transition-colors rounded-sm"
              title="Delete task"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ─────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  tasks,
  onAssignTask,
  onDeleteTask,
}: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  onAssignTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={`w-[85vw] sm:w-[300px] shrink-0 flex flex-col overflow-hidden border transition-all duration-200 ${
        isOver
          ? "border-[#0066b1]/50 bg-[#0066b1]/5"
          : "bg-[#1a1a1a] border-[#3c3c3c]"
      } ${column.topClass}`}
    >
      <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[#3c3c3c] bg-[#0d0d0d] flex justify-between items-center">
        <h3 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-[1.5px] truncate">{column.label}</h3>
        <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 border rounded-sm ml-2 shrink-0 ${column.countClass}`}>
          {tasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="p-3 flex-1 overflow-y-auto w-full min-h-[400px] max-h-[calc(100vh-360px)]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onAssignClick={onAssignTask}
              onDeleteClick={onDeleteTask}
            />
          ))}
          {tasks.length === 0 && (
            <div className="h-full flex items-center justify-center border border-dashed border-[#3c3c3c] min-h-[100px]">
              <span className="text-[10px] text-[#7e7e7e] select-none uppercase tracking-[1px]">Drop tasks here</span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Final Approved Column (search by name/loader + latest-completed-date filter) ──

function FinalApprovedColumn({
  column,
  tasks,
  onAssignTask,
  onDeleteTask,
}: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  onAssignTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    let result = tasks;

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((t) => {
        const name = [t.board?.name, t.class?.name, t.subject?.name, t.chapter?.name, t.hierarchies?.name, t.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const loaders = (t.contributors ?? []).join(" ").toLowerCase();
        return name.includes(q) || loaders.includes(q);
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((t) => t.last_completed_at && new Date(t.last_completed_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((t) => t.last_completed_at && new Date(t.last_completed_at) <= to);
    }
    return result;
  }, [tasks, search, dateFrom, dateTo]);

  const hasFilter = search.trim() !== "" || dateFrom !== "" || dateTo !== "";

  return (
    <div
      className={`w-[85vw] sm:w-[300px] shrink-0 flex flex-col overflow-hidden border transition-all duration-200 ${
        isOver ? "border-[#0066b1]/50 bg-[#0066b1]/5" : "bg-[#1a1a1a] border-[#3c3c3c]"
      } ${column.topClass}`}
    >
      <div className="border-b border-[#3c3c3c] bg-[#0d0d0d]">
        <div className="px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <h3 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-[1.5px] truncate">{column.label}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Search completed tasks"
              title="Search completed tasks"
              className={`p-1 border rounded-sm transition-colors ${
                hasFilter || showFilters
                  ? "text-[#0066b1] border-[#0066b1]/40 bg-[#0066b1]/10"
                  : "text-[#7e7e7e] border-[#3c3c3c] hover:text-white hover:border-[#7e7e7e]"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 border rounded-sm ${column.countClass}`}>
              {filtered.length}
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="px-3 sm:px-4 pb-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7e7e7e] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or loader..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-[#3c3c3c] outline-none focus:border-[#0066b1] transition-all bg-[#141414] text-[#e6e6e6] placeholder:text-[#7e7e7e]"
              />
            </div>
            <div className="flex items-center gap-1.5" title="Filter by latest completed date">
              <Calendar className="h-3.5 w-3.5 text-[#7e7e7e] shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Completed from date"
                aria-label="Completed from date"
                className="flex-1 min-w-0 text-xs border border-[#3c3c3c] px-2 py-1.5 outline-none focus:border-[#0066b1] transition-all bg-[#141414] text-[#e6e6e6] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
              />
              <span className="text-[#7e7e7e] text-[10px] font-bold uppercase">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="Completed to date"
                aria-label="Completed to date"
                className="flex-1 min-w-0 text-xs border border-[#3c3c3c] px-2 py-1.5 outline-none focus:border-[#0066b1] transition-all bg-[#141414] text-[#e6e6e6] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
              />
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#e22718] hover:bg-[#e22718]/10 px-2 py-1 transition-colors border border-[#e22718]/30 uppercase tracking-[1px]"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div ref={setNodeRef} className="p-3 flex-1 overflow-y-auto w-full min-h-[400px] max-h-[calc(100vh-360px)]">
        <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {filtered.map((task) => (
            <SortableTaskCard key={task.id} task={task} onAssignClick={onAssignTask} onDeleteClick={onDeleteTask} />
          ))}
          {filtered.length === 0 && (
            <div className="h-full flex items-center justify-center border border-dashed border-[#3c3c3c] min-h-[100px]">
              <span className="text-[10px] text-[#7e7e7e] select-none uppercase tracking-[1px]">
                {hasFilter ? "No matches" : "Drop tasks here"}
              </span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Kanban Board ─────────────────────────────────────────────────────────────

export function KanbanBoard({ initialTasks, userId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [mounted, setMounted] = useState(false);
  const [loaders, setLoaders] = useState<LoaderProfile[]>([]);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterLoaderName, setFilterLoaderName] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const dragOriginalStatus = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { getLoaders().then(setLoaders); }, []);

  const assignedLoaderNames = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(task =>
      task.task_assignments?.forEach(a => {
        if (a.user?.full_name) names.add(a.user.full_name);
      })
    );
    return Array.from(names).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterLoaderName) {
      result = result.filter(task =>
        task.task_assignments?.some(a => a.user?.full_name === filterLoaderName)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(task =>
        task.task_assignments?.some(a => a.user?.full_name?.toLowerCase().includes(q))
      );
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter(task => new Date(task.created_at) >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(task => new Date(task.created_at) <= to);
    }
    return result;
  }, [tasks, filterLoaderName, searchQuery, filterDateFrom, filterDateTo]);

  const hasActiveFilter = filterLoaderName !== "" || searchQuery.trim() !== "" || filterDateFrom !== "" || filterDateTo !== "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: { active: { id: string | number } }) {
    const task = tasks.find(t => t.id === event.active.id);
    dragOriginalStatus.current = task ? getDisplayColumn(task) : null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    const activeIndex = tasks.findIndex(t => t.id === activeId);
    if (activeIndex === -1) return;

    let overStatus = overId as string;
    const isOverTask = tasks.some(t => t.id === overId);
    if (isOverTask) {
      overStatus = getDisplayColumn(tasks.find(t => t.id === overId)!);
    }

    const currentDisplayCol = getDisplayColumn(tasks[activeIndex]);
    if (currentDisplayCol !== overStatus && COLUMNS.some(c => c.id === overStatus)) {
      setTasks((prev) => {
        const newTasks = [...prev];
        const activeItemIndex = newTasks.findIndex(t => t.id === activeId);
        newTasks[activeItemIndex] = {
          ...newTasks[activeItemIndex],
          current_status: overStatus,
          revision_target_status: null,
        };
        return newTasks;
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    let targetStatus = overId as string;
    const isOverTask = tasks.some(t => t.id === overId);
    if (isOverTask) {
      targetStatus = getDisplayColumn(tasks.find(t => t.id === overId)!);
    }

    if (COLUMNS.some(c => c.id === targetStatus)) {
      setTasks((prev) => {
        const newArray = [...prev];
        const targetInd = newArray.findIndex(t => t.id === activeId);
        newArray[targetInd] = {
          ...newArray[targetInd],
          current_status: targetStatus,
          revision_target_status: null,
        };
        const finalTargetIndex = newArray.findIndex(t => t.id === overId);
        if (finalTargetIndex !== -1 && finalTargetIndex !== targetInd) {
          return arrayMove(newArray, targetInd, finalTargetIndex);
        }
        return newArray;
      });

      if (dragOriginalStatus.current !== null && dragOriginalStatus.current !== targetStatus) {
        moveTaskStatus(activeId as string, targetStatus, userId);
      }
      dragOriginalStatus.current = null;
    }
  }

  function handleAssigned(taskId: string, loaderId: string) {
    const loader = loaders.find(l => l.id === loaderId);
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;

      // Determine semantic stage (same logic as Bug 5 fix)
      let stage = t.current_status;
      if (stage === "needs_revision") {
        stage = t.revision_target_status ?? "assigned";
      }

      return {
        ...t,
        task_assignments: [
          {
            stage: stage,
            user: loader ? { full_name: loader.full_name, sub_role: loader.sub_role, avatar_url: null } : null
          }
        ]
      };
    }));
    // We don't necessarily need router.refresh() if optimistic update is perfect, 
    // but it ensures server-side state matches soon after.
    router.refresh();
  }

  function handleDeleted(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  if (!mounted) {
    return (
      <div className="w-full overflow-x-auto overflow-y-hidden h-[calc(100vh-280px)] min-h-[480px] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#3c3c3c] hover:[&::-webkit-scrollbar-thumb]:bg-[#7e7e7e] pb-3">
        <div className="flex gap-4 sm:gap-5 pb-2 pt-2 px-2 sm:px-0 min-w-max h-full">
          {COLUMNS.map(column => (
            <div key={column.id} className={`w-[85vw] sm:w-[300px] shrink-0 flex flex-col overflow-hidden border bg-[#1a1a1a] border-[#3c3c3c] animate-pulse h-full ${column.topClass}`}>
              <div className="p-4 border-b bg-[#0d0d0d] border-[#3c3c3c]">
                <div className="h-3 sm:h-4 bg-[#3c3c3c] w-24 rounded-sm" />
              </div>
              <div className="p-4 flex-1 min-h-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center bg-[#1a1a1a] border border-[#3c3c3c] p-4">
        <div className="relative min-w-[180px]">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7e7e7e] pointer-events-none" />
          <select
            aria-label="Filter by loader"
            value={filterLoaderName}
            onChange={e => setFilterLoaderName(e.target.value)}
            className="w-full appearance-none pr-8 pl-3 py-2 text-sm border border-[#3c3c3c] outline-none focus:border-[#0066b1] transition-all bg-[#0d0d0d] text-[#e6e6e6]"
          >
            <option value="">All Loaders</option>
            {assignedLoaderNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7e7e7e] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search loader name..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#3c3c3c] outline-none focus:border-[#0066b1] transition-all bg-[#0d0d0d] text-[#e6e6e6] placeholder:text-[#7e7e7e]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#7e7e7e] shrink-0" />
            <span className="text-xs text-[#7e7e7e] font-bold uppercase tracking-[1px]">From</span>
          </div>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            title="Filter from date"
            aria-label="Filter from date"
            className="text-sm border border-[#3c3c3c] px-2.5 py-2 outline-none focus:border-[#0066b1] transition-all bg-[#0d0d0d] text-[#e6e6e6] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
          />
          <span className="text-[#7e7e7e] text-xs font-bold uppercase tracking-[1px]">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            title="Filter to date"
            aria-label="Filter to date"
            className="text-sm border border-[#3c3c3c] px-2.5 py-2 outline-none focus:border-[#0066b1] transition-all bg-[#0d0d0d] text-[#e6e6e6] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
          />
        </div>

        {hasActiveFilter && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-[#7e7e7e]">
              Showing <span className="font-bold text-[#e6e6e6]">{filteredTasks.length}</span> of {tasks.length} tasks
            </span>
            <button
              type="button"
              onClick={() => { setFilterLoaderName(""); setSearchQuery(""); setFilterDateFrom(""); setFilterDateTo(""); }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#e22718] hover:bg-[#e22718]/10 px-3 py-1.5 transition-colors border border-[#e22718]/30 uppercase tracking-[1px]"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="w-full overflow-x-auto overflow-y-hidden h-[calc(100vh-360px)] min-h-[480px] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#1a1a1a] [&::-webkit-scrollbar-thumb]:bg-[#3c3c3c] hover:[&::-webkit-scrollbar-thumb]:bg-[#7e7e7e] pb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 sm:gap-5 pb-2 pt-2 px-2 sm:px-0 min-w-max h-full">
            {COLUMNS.map(column => {
              // The Final Approved column has its own search + latest-completed-date filter and
              // works off the full task set (completed tasks have no assignments, so the global
              // loader filter would otherwise hide them all).
              if (column.id === "final_approved") {
                const finalTasks = tasks.filter(t => getDisplayColumn(t) === "final_approved");
                return (
                  <FinalApprovedColumn
                    key={column.id}
                    column={column}
                    tasks={finalTasks}
                    onAssignTask={setAssigningTask}
                    onDeleteTask={setDeletingTask}
                  />
                );
              }
              const columnTasks = filteredTasks.filter(t => getDisplayColumn(t) === column.id);
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  onAssignTask={setAssigningTask}
                  onDeleteTask={setDeletingTask}
                />
              );
            })}
          </div>
        </DndContext>
      </div>

      {assigningTask && (
        <AssignModal
          task={assigningTask}
          loaders={loaders}
          onClose={() => setAssigningTask(null)}
          onAssigned={handleAssigned}
        />
      )}

      {deletingTask && (
        <DeleteConfirmModal
          task={deletingTask}
          onClose={() => setDeletingTask(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
