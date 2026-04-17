"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { UserPlus, X, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { moveTaskStatus, getLoaders, assignLoaderToTask } from "@/app/admin/kanban/actions";
import { formatSubRole } from "@/lib/utils";

type TaskAssignment = {
  stage: string;
  user?: {
    full_name: string;
    sub_role: string | null;
    avatar_url: string | null;
  } | null;
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
  { id: "assigned", label: "Assigned" },
  { id: "script_generated", label: "Script Generated" },
  { id: "script_approved", label: "Script Approval" },
  { id: "video_generated", label: "Video Generated" },
  { id: "video_edited", label: "Video Edited" },
  { id: "final_approved", label: "Final Approval" }
];

/**
 * Maps tasks with `needs_revision` status to the column they should
 * visually appear in. revision_target_status stores the stage the loader
 * needs to work from ("assigned" or "video_generated"), so we display
 * the task there directly.
 */
function getDisplayColumn(task: Task): string {
  if (task.current_status === "needs_revision") {
    // revision_target_status is already the column we want to show the task in
    return task.revision_target_status ?? "assigned";
  }
  return task.current_status;
}

function getSubRoleBadgeColor(subRole: string | null | undefined) {
  switch (subRole) {
    case "script_writer": return "bg-ps-cyan/15 text-[#008ba8]";
    case "video_audio_generator": return "bg-commerce-orange/15 text-commerce-orange";
    case "video_editor": return "bg-[#7c4dff]/15 text-[#7c4dff]";
    default: return "bg-[#e5e5e5] text-body-gray";
  }
}

function getColumnAccentColor(columnId: string) {
  switch (columnId) {
    case "assigned": return "#6366f1";
    case "script_generated": return "#008ba8";
    case "script_approved": return "#2e7d32";
    case "video_generated": return "#e67e22";
    case "video_edited": return "#7c4dff";
    case "final_approved": return "#16a34a";
    default: return "#6b7280";
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

  const handleSubmit = async () => {
    if (!selectedLoader) return;
    setSubmitting(true);
    setError("");
    const res = await assignLoaderToTask(task.id, selectedLoader, task.current_status);
    if (res.error) {
      setError(res.error);
    } else {
      onAssigned(task.id, selectedLoader);
      onClose();
    }
    setSubmitting(false);
  };

  const selectedLoaderData = loaders.find(l => l.id === selectedLoader);
  const taskLabel = [task.board?.name, task.subject?.name, task.chapter?.name]
    .filter(Boolean)
    .join(" • ") || "Task";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-sm shadow-[0_20px_60px_0_rgba(0,0,0,0.2)] p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full text-body-gray hover:bg-[#f3f3f3] hover:text-deep-charcoal transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-light text-display-ink">Assign Loader</h2>
          <p className="text-body-gray text-sm mt-1 truncate">{taskLabel}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-warning-red/10 border border-warning-red/30 text-warning-red text-sm rounded-[8px]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-semibold text-deep-charcoal">Material Loader</label>
          <select
            aria-label="Select Material Loader"
            value={selectedLoader}
            onChange={e => setSelectedLoader(e.target.value)}
            className="w-full border border-[#cccccc] rounded-[8px] p-2.5 outline-none focus:border-ps-blue focus:ring-2 focus:ring-ps-blue/20 transition-all text-sm"
          >
            <option value="">Select a Loader...</option>
            {loaders.map(l => (
              <option key={l.id} value={l.id}>
                {l.full_name} — {formatSubRole(l.sub_role)}
              </option>
            ))}
          </select>

          {selectedLoaderData && (
            <div className="flex items-center gap-3 p-3 bg-ice-mist rounded-[10px] border border-[#e5e5e5]">
              <div className="w-8 h-8 rounded-full bg-ps-blue flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {selectedLoaderData.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-deep-charcoal truncate">{selectedLoaderData.full_name}</p>
                <p className="text-xs text-body-gray truncate">{selectedLoaderData.email}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getSubRoleBadgeColor(selectedLoaderData.sub_role)}`}>
                {formatSubRole(selectedLoaderData.sub_role)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedLoader}
          className="w-full mt-6 bg-ps-blue text-white py-3 rounded-[999px] font-medium transition-all hover:bg-ps-cyan disabled:opacity-50 hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 shadow-[0_5px_9px_0_rgba(0,0,0,0.12)]"
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

// ── Task Card ────────────────────────────────────────────────────────────────

function SortableTaskCard({ task, onAssignClick }: { task: Task; onAssignClick: (task: Task) => void }) {
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

  // Show the most relevant assigned person: prefer current stage, fallback to latest
  const allAssignments = task.task_assignments ?? [];
  const primaryAssignment = allAssignments.find((a) => a.stage === task.current_status)
    ?? allAssignments.find((a) => a.stage === getDisplayColumn(task))
    ?? allAssignments[allAssignments.length - 1];
  const assignedUser = primaryAssignment?.user;
  const isRevision = task.current_status === "needs_revision";

  // Human-readable stage label
  const stageLabel = (stage: string) => stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div
      ref={mergedRef}
      {...attributes}
      {...listeners}
      className={`bg-white p-3 rounded-[12px] shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] mb-2.5 cursor-grab hover:shadow-[0_5px_9px_0_rgba(0,0,0,0.16)] transition-all ${
        isRevision
          ? "border-2 border-warning-red/50 ring-1 ring-warning-red/20"
          : "border border-[#f3f3f3]"
      }`}
    >
      {/* Needs Revision flag */}
      {isRevision && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-warning-red/10 rounded-[8px] border border-warning-red/20">
          <AlertTriangle className="h-3.5 w-3.5 text-warning-red shrink-0" />
          <span className="text-[11px] font-bold text-warning-red uppercase tracking-wide">Needs Revision</span>
        </div>
      )}

      {/* Hierarchy: Scrollable badges for all fields */}
      <div 
        className="flex gap-2 overflow-x-auto pb-2 mb-1 shrink-0 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
        style={{ WebkitOverflowScrolling: 'touch' }}
        onPointerDown={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {task.board?.name && (
          <span className="text-[10px] font-semibold text-ps-blue bg-ps-blue/10 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
            {task.board.name}
          </span>
        )}
        {task.class?.name && (
          <span className="text-[10px] font-semibold text-ps-cyan bg-ps-cyan/10 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
            {task.class.name}
          </span>
        )}
        {task.subject?.name && (
          <span className="text-[10px] font-semibold text-commerce-orange bg-commerce-orange/10 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
            {task.subject.name}
          </span>
        )}
        {(task.chapter?.name || task.hierarchies?.name) && (
          <span className="text-[10px] font-semibold text-[#7c4dff] bg-[#7c4dff]/10 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
            {task.chapter?.name || task.hierarchies?.name}
          </span>
        )}
      </div>

      {/* Task Title (shows full data) */}
      <p className="text-sm text-deep-charcoal font-medium break-words leading-tight">
        {task.title || [task.board?.name, task.class?.name, task.subject?.name, task.chapter?.name].filter(Boolean).join(" • ") || "Untitled Task"}
      </p>

      {/* Assigned users section */}
      <div className="mt-3 pt-3 border-t border-[#f3f3f3]">
        {allAssignments.length > 0 ? (
          <div className="space-y-2">
            {allAssignments.map((a, idx) => {
              const user = a.user;
              if (!user) return null;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-ps-blue flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-deep-charcoal font-medium truncate block">
                      {user.full_name}
                    </span>
                    <span className="text-[10px] text-body-gray">
                      {stageLabel(a.stage)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${getSubRoleBadgeColor(user.sub_role)}`}>
                    {formatSubRole(user.sub_role)}
                  </span>
                </div>
              );
            })}
            {/* Re-assign button */}
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onAssignClick(task); }}
              className="flex items-center gap-1 text-[11px] font-medium text-ps-blue hover:bg-ps-blue/10 px-2 py-1 rounded-md transition-colors w-full justify-center"
              title="Reassign loader"
            >
              <UserPlus className="h-3 w-3" />
              Reassign
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-body-gray italic">No loader assigned</span>
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onAssignClick(task); }}
              className="flex items-center gap-1 text-xs font-medium text-ps-blue hover:bg-ps-blue/10 px-2 py-1 rounded-md transition-colors"
              title="Assign loader"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </button>
          </div>
        )}
      </div>

      {/* Footer: date */}
      <div className="mt-2 flex items-center justify-between text-xs text-body-gray">
        <span suppressHydrationWarning>{new Date(task.created_at).toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
}

// ── Droppable Column ─────────────────────────────────────────────────────────

function DroppableColumn({
  column,
  tasks,
  onAssignTask,
}: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  onAssignTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accentColor = getColumnAccentColor(column.id);
  const isFinal = column.id === "final_approved";

  return (
    <div
      className={`w-[280px] shrink-0 flex flex-col rounded-[20px] overflow-hidden border transition-all duration-200 ${
        isOver
          ? "border-ps-blue/50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
          : "bg-ice-mist border-[#e5e5e5]"
      }`}
    >
      {/* Column header with accent top bar */}
      <div className="relative">
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ backgroundColor: accentColor }}
        />
        <div className="px-4 py-3 border-b bg-[#f0f2f5] border-[#e5e5e5] flex justify-between items-center">
          <h3 className="font-semibold text-[14px] text-deep-charcoal">{column.label}</h3>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full shadow-[0_2px_4px_0_rgba(0,0,0,0.04)]"
            style={{
              backgroundColor: isFinal ? "#dcfce7" : `${accentColor}12`,
              color: isFinal ? "#16a34a" : accentColor,
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div ref={setNodeRef} className="p-3 flex-1 overflow-y-auto w-full min-h-[400px] max-h-[calc(100vh-280px)]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onAssignClick={onAssignTask} />
          ))}
          {tasks.length === 0 && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-[#d1d5db] rounded-[12px] opacity-60 min-h-[100px]">
              <span className="text-sm text-body-gray select-none">Drop tasks here</span>
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
  const dragOriginalStatus = useRef<string | null>(null);
  const router = useRouter();

  // Sync local task state whenever the server re-renders with fresh data
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { getLoaders().then(setLoaders); }, []);

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
      const filtered = (t.task_assignments || []).filter((a) => a.stage !== t.current_status);
      return {
        ...t,
        task_assignments: [
          ...filtered,
          { stage: t.current_status, user: loader ? { full_name: loader.full_name, sub_role: loader.sub_role, avatar_url: null } : null }
        ]
      };
    }));
    router.refresh();
  }

  if (!mounted) {
    return (
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-[16px] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-[#f3f3f3] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#cccccc] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#a3a3a3] pb-3" style={{ height: 'calc(100vh - 280px)', minHeight: '480px' }}>
        <div className="flex gap-4 pb-2 pt-2 min-w-max h-full">
          {COLUMNS.map(column => (
            <div key={column.id} className="w-[280px] shrink-0 flex flex-col rounded-[20px] overflow-hidden border bg-ice-mist border-[#e5e5e5] animate-pulse h-full">
              <div className="p-4 border-b bg-[#f0f2f5] border-[#e5e5e5]">
                <div className="h-4 bg-[#e5e5e5] rounded w-24" />
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
      <div className="w-full overflow-x-auto overflow-y-hidden rounded-[16px] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-[#f3f3f3] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#cccccc] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#a3a3a3] pb-3" style={{ height: 'calc(100vh - 280px)', minHeight: '480px' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-2 pt-2 min-w-max h-full">
            {COLUMNS.map(column => {
              const columnTasks = tasks.filter(t => getDisplayColumn(t) === column.id);
              return (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  onAssignTask={setAssigningTask}
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
    </>
  );
}
