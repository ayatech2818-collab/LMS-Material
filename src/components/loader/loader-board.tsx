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
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExternalLink,
  Clock,
  PenTool,
  Film,
  Scissors,
  AlertTriangle,
  Link as LinkIcon,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SubmitModal } from "@/components/loader/submit-modal";
import Link from "next/link";

export type LoaderTask = {
  id: string;
  current_status: string;
  revision_target_status?: string | null;
  created_at: string;
  title?: string | null;
  board?: { name: string } | null;
  subject?: { name: string } | null;
  chapter?: { name: string } | null;
};

/** Returns which of the two QC approval rounds this task belongs to. */
function getApprovalStage(task: LoaderTask): "script" | "video" {
  const s = task.current_status;
  if (s === "assigned" || s === "script_generated") return "script";
  if (s === "needs_revision") {
    return task.revision_target_status === "assigned" ? "script" : "video";
  }
  return "video";
}

function StageBadge({ stage }: { stage: "script" | "video" }) {
  if (stage === "script") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-ps-blue/10 text-ps-blue border border-ps-blue/20 uppercase">
        1st Review · Script
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 uppercase">
      2nd Review · Final
    </span>
  );
}

type LoaderBoardProps = {
  tasks: LoaderTask[];
  userId: string;
  userName: string;
  subRole: string | null;
};

// The three interactive DnD columns
const DND_COLUMNS = [
  { id: "todo",        label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "submitted",   label: "Submitted for QC" },
];

// DB statuses that map to each DnD column
const TODO_STATUSES      = ["assigned", "script_approved", "video_generated", "needs_revision"];
const SUBMITTED_STATUSES = ["script_generated", "video_edited"];
const COMPLETED_STATUSES = ["final_approved"];

function getLoaderColumn(task: LoaderTask, inProgressIds: Set<string>): string {
  if (COMPLETED_STATUSES.includes(task.current_status)) return "completed";
  if (inProgressIds.has(task.id)) return "in_progress";
  if (SUBMITTED_STATUSES.includes(task.current_status)) return "submitted";
  if (TODO_STATUSES.includes(task.current_status)) return "todo";
  return "todo";
}

function getDoneLabel(subRole: string | null) {
  switch (subRole) {
    case "script_writer":         return "Done Scripting";
    case "video_audio_generator": return "Video Done";
    case "video_editor":          return "Done Editing";
    default:                      return "Mark Done";
  }
}

function getDoneIcon(subRole: string | null) {
  switch (subRole) {
    case "script_writer":         return <PenTool className="h-3.5 w-3.5" />;
    case "video_audio_generator": return <Film className="h-3.5 w-3.5" />;
    case "video_editor":          return <Scissors className="h-3.5 w-3.5" />;
    default:                      return <PenTool className="h-3.5 w-3.5" />;
  }
}

// ── Sortable (DnD) Task Card ──────────────────────────────────────────────────

function SortableTaskCard({
  task,
  columnId,
  subRole,
  onDone,
  links,
  onLinkChange,
}: {
  task: LoaderTask;
  columnId: string;
  subRole: string | null;
  onDone: (task: LoaderTask) => void;
  links: Record<string, string>;
  onLinkChange: (taskId: string, url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, data: task });

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (node) {
        node.style.transform = CSS.Transform.toString(transform) ?? "";
        node.style.transition = transition ?? "";
      }
    },
    [setNodeRef, transform, transition]
  );

  const isRevision  = task.current_status === "needs_revision";
  const isSubmitted = columnId === "submitted";
  const linkValue   = links[task.id] || "";
  const stage       = getApprovalStage(task);

  return (
    <div
      ref={mergedRef}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-[14px] shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] mb-3 cursor-grab hover:shadow-[0_5px_9px_0_rgba(0,0,0,0.16)] transition-all ${
        isRevision
          ? "border-2 border-warning-red/50 ring-1 ring-warning-red/20"
          : "border border-[#f3f3f3]"
      }`}
    >
      {/* Revision flag */}
      {isRevision && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-warning-red/10 rounded-[8px] border border-warning-red/20">
          <AlertTriangle className="h-3.5 w-3.5 text-warning-red shrink-0" />
          <span className="text-[11px] font-bold text-warning-red uppercase tracking-wide">Needs Revision</span>
        </div>
      )}

      {/* Chapter badge + history link */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-ps-blue bg-ps-blue/10 px-2 py-1 rounded-md">
          {task.chapter?.name || "Chapter"}
        </span>
        <Link
          href={`/loader/task/${task.id}`}
          className="text-[10px] text-body-gray hover:text-ps-blue transition-colors"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          History →
        </Link>
      </div>

      {/* Approval stage badge */}
      <div className="mb-2">
        <StageBadge stage={stage} />
      </div>

      {/* Title */}
      <p className="text-sm text-deep-charcoal font-medium line-clamp-2 mb-3">
        {task.board?.name ? `${task.board.name} • ${task.subject?.name}` : task.title || "Untitled Task"}
      </p>

      {/* Work link */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <LinkIcon className="h-3 w-3 text-body-gray" />
          <span className="text-[11px] font-semibold text-body-gray uppercase tracking-wider">Work Link</span>
        </div>
        <div className="flex gap-1.5">
          <input
            type="url"
            value={linkValue}
            onChange={(e) => onLinkChange(task.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            readOnly={isSubmitted}
            placeholder="Paste Google Doc, Drive, or YouTube link..."
            className={`flex-1 text-xs border rounded-[6px] px-2.5 py-2 outline-none transition-all ${
              isSubmitted
                ? "bg-[#f9f9f9] border-[#e5e5e5] text-body-gray cursor-default"
                : "border-[#cccccc] focus:border-ps-blue focus:ring-1 focus:ring-ps-blue/20"
            }`}
          />
          {linkValue && (
            <a
              href={linkValue}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[6px] border border-ps-blue/30 text-ps-blue hover:bg-ps-blue/10 transition-colors"
              title="Open link in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Action button or awaiting status */}
      {isSubmitted ? (
        <div className="flex items-center gap-2 text-xs text-body-gray font-medium bg-[#f9f9f9] px-3 py-2 rounded-[8px]">
          <Clock className="h-3.5 w-3.5" />
          Awaiting QC Review
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDone(task); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-ps-blue hover:bg-ps-cyan transition-all shadow-sm hover:scale-[1.02] active:scale-95"
        >
          {getDoneIcon(subRole)}
          {getDoneLabel(subRole)}
        </button>
      )}

      <div className="mt-2 text-[11px] text-body-gray">
        <span suppressHydrationWarning>{new Date(task.created_at).toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
}

// ── Completed Task Card (read-only, no DnD) ───────────────────────────────────

function CompletedTaskCard({ task }: { task: LoaderTask }) {
  return (
    <div className="bg-white p-4 rounded-[14px] shadow-[0_5px_9px_0_rgba(0,0,0,0.04)] mb-3 border border-green-100">
      {/* Chapter badge + history link */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200">
          {task.chapter?.name || "Chapter"}
        </span>
        <Link
          href={`/loader/task/${task.id}`}
          className="text-[10px] text-body-gray hover:text-ps-blue transition-colors"
        >
          History →
        </Link>
      </div>

      {/* Stage badge — completed tasks are always the final stage */}
      <div className="mb-2">
        <StageBadge stage="video" />
      </div>

      {/* Title */}
      <p className="text-sm text-deep-charcoal font-medium line-clamp-2 mb-3">
        {task.board?.name ? `${task.board.name} • ${task.subject?.name}` : task.title || "Untitled Task"}
      </p>

      {/* Final approved pill */}
      <div className="flex items-center gap-2 text-xs text-green-700 font-semibold bg-green-50 px-3 py-2 rounded-[8px] border border-green-200">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Final Approved
      </div>

      <div className="mt-2 text-[11px] text-body-gray">
        <span suppressHydrationWarning>{new Date(task.created_at).toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
}

// ── Droppable Column (DnD) ────────────────────────────────────────────────────

function DroppableColumn({
  column,
  tasks,
  subRole,
  onDone,
  links,
  onLinkChange,
}: {
  column: (typeof DND_COLUMNS)[0];
  tasks: LoaderTask[];
  subRole: string | null;
  onDone: (task: LoaderTask) => void;
  links: Record<string, string>;
  onLinkChange: (taskId: string, url: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const accentBarClass =
    column.id === "todo"        ? "bg-indigo-500" :
    column.id === "in_progress" ? "bg-orange-500" :
    "bg-amber-500";

  const badgeClass =
    column.id === "todo"        ? "bg-indigo-50 text-indigo-600" :
    column.id === "in_progress" ? "bg-orange-50 text-orange-600" :
    "bg-amber-50 text-amber-700";

  return (
    <div
      className={`flex flex-col rounded-[20px] overflow-hidden border transition-all duration-200 ${
        isOver
          ? "border-ps-blue/50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
          : "bg-ice-mist border-[#e5e5e5]"
      }`}
    >
      <div className="relative">
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentBarClass}`} />
        <div className="px-4 py-3 border-b bg-[#f0f2f5] border-[#e5e5e5] flex justify-between items-center">
          <h3 className="font-semibold text-[14px] text-deep-charcoal">{column.label}</h3>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-[0_2px_4px_0_rgba(0,0,0,0.04)] ${badgeClass}`}>
            {tasks.length}
          </span>
        </div>
      </div>

      <div ref={setNodeRef} className="p-3 flex-1 overflow-y-auto min-h-[300px] max-h-[calc(100vh-380px)]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              columnId={column.id}
              subRole={subRole}
              onDone={onDone}
              links={links}
              onLinkChange={onLinkChange}
            />
          ))}
          {tasks.length === 0 && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-[#d1d5db] rounded-[12px] opacity-60 min-h-[100px]">
              <span className="text-sm text-body-gray select-none">
                {column.id === "todo"
                  ? "All clear!"
                  : column.id === "in_progress"
                  ? "Drag tasks here to start"
                  : "Nothing pending review"}
              </span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── Completed Column (read-only, no DnD) ─────────────────────────────────────

function CompletedColumn({ tasks }: { tasks: LoaderTask[] }) {
  return (
    <div className="flex flex-col rounded-[20px] overflow-hidden border bg-ice-mist border-[#e5e5e5]">
      <div className="relative">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-green-600" />
        <div className="px-4 py-3 border-b bg-[#f0f2f5] border-[#e5e5e5] flex justify-between items-center">
          <h3 className="font-semibold text-[14px] text-deep-charcoal">Final Approved</h3>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 shadow-[0_2px_4px_0_rgba(0,0,0,0.04)]">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto min-h-[300px] max-h-[calc(100vh-380px)]">
        {tasks.map((task) => (
          <CompletedTaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-[#d1d5db] rounded-[12px] opacity-60 min-h-[100px]">
            <span className="text-sm text-body-gray select-none">No completed tasks yet</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loader Board ──────────────────────────────────────────────────────────────

export function LoaderBoard({ tasks: initialTasks, userId, userName, subRole }: LoaderBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [mounted, setMounted] = useState(false);
  const [submittingTask, setSubmittingTask] = useState<LoaderTask | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [inProgressIds, setInProgressIds] = useState<Set<string>>(new Set());
  const dragOriginalColumn = useRef<string | null>(null);
  const router = useRouter();

  // Sync local state whenever the server re-renders with fresh data (e.g. after router.refresh())
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLinks    = localStorage.getItem(`loader_links_${userId}`);
      const savedProgress = localStorage.getItem(`loader_progress_${userId}`);
      if (savedLinks)    setLinks(JSON.parse(savedLinks));
      if (savedProgress) setInProgressIds(new Set(JSON.parse(savedProgress)));
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(`loader_links_${userId}`, JSON.stringify(links));
  }, [links, mounted, userId]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(`loader_progress_${userId}`, JSON.stringify([...inProgressIds]));
  }, [inProgressIds, mounted, userId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleLinkChange(taskId: string, url: string) {
    setLinks((prev) => ({ ...prev, [taskId]: url }));
  }

  function getColumnForTask(task: LoaderTask): string {
    return getLoaderColumn(task, inProgressIds);
  }

  function handleDragStart(event: { active: { id: string | number } }) {
    const task = tasks.find((t) => t.id === event.active.id);
    dragOriginalColumn.current = task ? getColumnForTask(task) : null;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId   = over.id   as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let overColumn = overId;
    const isOverTask = tasks.some((t) => t.id === overId);
    if (isOverTask) {
      overColumn = getColumnForTask(tasks.find((t) => t.id === overId)!);
    }

    const currentColumn = getColumnForTask(activeTask);
    if (currentColumn !== overColumn && DND_COLUMNS.some((c) => c.id === overColumn)) {
      if (overColumn === "in_progress") {
        setInProgressIds((prev) => new Set([...prev, activeId]));
      } else {
        setInProgressIds((prev) => {
          const next = new Set(prev);
          next.delete(activeId);
          return next;
        });
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId   = over.id   as string;

    let targetColumn = overId;
    const isOverTask = tasks.some((t) => t.id === overId);
    if (isOverTask) {
      targetColumn = getColumnForTask(tasks.find((t) => t.id === overId)!);
    }

    if (DND_COLUMNS.some((c) => c.id === targetColumn)) {
      const originalColumn = dragOriginalColumn.current;

      if (targetColumn === "in_progress") {
        setInProgressIds((prev) => new Set([...prev, activeId]));
      } else {
        setInProgressIds((prev) => {
          const next = new Set(prev);
          next.delete(activeId);
          return next;
        });
      }

      // Dragging to "submitted" opens the modal instead of a direct DB write
      if (targetColumn === "submitted" && originalColumn !== "submitted") {
        const task = tasks.find((t) => t.id === activeId);
        if (task) setSubmittingTask(task);
      }

      if (isOverTask) {
        setTasks((prev) => {
          const activeIdx = prev.findIndex((t) => t.id === activeId);
          const overIdx   = prev.findIndex((t) => t.id === overId);
          if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
            return arrayMove(prev, activeIdx, overIdx);
          }
          return prev;
        });
      }

      dragOriginalColumn.current = null;
    }
  }

  function handleDone(task: LoaderTask) {
    setSubmittingTask(task);
  }

  function handleSubmitClose() {
    const prev = submittingTask;
    setSubmittingTask(null);
    if (prev) {
      setInProgressIds((ids) => {
        const next = new Set(ids);
        next.delete(prev.id);
        return next;
      });
    }
    router.refresh();
  }

  // Split tasks: DnD-eligible vs completed (completed are rendered outside DnD)
  const dndTasks       = tasks.filter((t) => !COMPLETED_STATUSES.includes(t.current_status));
  const completedTasks = tasks.filter((t) => COMPLETED_STATUSES.includes(t.current_status));

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col rounded-[20px] overflow-hidden border bg-ice-mist border-[#e5e5e5] animate-pulse">
            <div className="p-4 border-b bg-[#f0f2f5] border-[#e5e5e5]">
              <div className="h-4 bg-[#e5e5e5] rounded w-24" />
            </div>
            <div className="p-4 flex-1 min-h-[300px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {DND_COLUMNS.map((column) => {
            const columnTasks = dndTasks.filter((t) => getColumnForTask(t) === column.id);
            return (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                subRole={subRole}
                onDone={handleDone}
                links={links}
                onLinkChange={handleLinkChange}
              />
            );
          })}
        </DndContext>

        {/* Completed column — read-only, no DnD interaction */}
        <CompletedColumn tasks={completedTasks} />
      </div>

      {submittingTask && (
        <SubmitModal
          taskId={submittingTask.id}
          userId={userId}
          userName={userName}
          chapterName={submittingTask.chapter?.name || "Task"}
          subRole={subRole}
          currentStatus={submittingTask.current_status}
          revisionTargetStatus={submittingTask.revision_target_status}
          prefillUrl={links[submittingTask.id] || ""}
          onClose={handleSubmitClose}
        />
      )}
    </>
  );
}
