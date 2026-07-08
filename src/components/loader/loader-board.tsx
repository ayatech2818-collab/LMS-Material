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
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SubmitModal } from "@/components/loader/submit-modal";
import { VimeoUploadModal } from "@/components/uploads/vimeo-upload-modal";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import Link from "next/link";

export type LoaderTask = {
  id: string;
  current_status: string;
  revision_target_status?: string | null;
  created_at: string;
  title?: string | null;
  chapter_id?: string | null;
  board?: { name: string } | null;
  class?: { name: string } | null;
  subject?: { name: string } | null;
  chapter?: { name: string } | null;
};

/** A video already published to a task's chapter — surfaced on the Final Approved card. */
export type ChapterVideo = {
  vimeo_link: string | null;
  status: string;
  title: string | null;
};

function getApprovalStage(task: LoaderTask): "script" | "video" {
  const s = task.current_status;
  if (s === "assigned" || s === "script_generated") return "script";
  if (s === "needs_revision") {
    return task.revision_target_status === "assigned" ? "script" : "video";
  }
  // script_approved and video_generated stages both fall under the "Video" workflow category
  return "video";
}

function StageBadge({ stage }: { stage: "script" | "video" }) {
  if (stage === "script") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-[1px] bg-[#0066b1]/10 text-[#0066b1] border border-[#0066b1]/20 uppercase">
        1st Review · Script
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-[1px] bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/20 uppercase">
      2nd Review · Final
    </span>
  );
}

type LoaderBoardProps = {
  tasks: LoaderTask[];
  userId: string;
  userName: string;
  subRole: string | null;
  chapterVideos: Record<string, ChapterVideo[]>;
  taskWorkLinks: Record<string, string>;
  canUpload: boolean;
};

const DND_COLUMNS = [
  { id: "todo",        label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "submitted",   label: "Submitted for QC" },
];

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
      className={`bg-[#262626] p-4 mb-2 cursor-grab transition-all border ${
        isRevision
          ? "border-[#e22718]/50 ring-1 ring-[#e22718]/20"
          : "border-[#3c3c3c] hover:border-[#7e7e7e]"
      }`}
    >
      {isRevision && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-[#e22718]/10 border border-[#e22718]/20">
          <AlertTriangle className="h-3.5 w-3.5 text-[#e22718] shrink-0" />
          <span className="text-[10px] font-bold text-[#e22718] uppercase tracking-[1.5px]">Needs Revision</span>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-[#0066b1] bg-[#0066b1]/10 border border-[#0066b1]/20 px-2 py-0.5 uppercase tracking-[1px]">
          {task.chapter?.name || "Chapter"}
        </span>
        <Link
          href={`/loader/task/${task.id}`}
          className="text-[10px] text-[#7e7e7e] hover:text-[#0066b1] transition-colors uppercase tracking-[1px]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          History →
        </Link>
      </div>

      <div className="mb-2">
        <StageBadge stage={stage} />
      </div>

      <p className="text-sm text-[#e6e6e6] font-medium line-clamp-2 mb-1">
        {task.board?.name ? `${task.board.name} • ${task.subject?.name}` : task.title || "Untitled Task"}
      </p>
      {task.class?.name && (
        <p className="text-[10px] text-[#7e7e7e] uppercase tracking-[0.5px] mb-3">
          {task.class.name}
        </p>
      )}

      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <LinkIcon className="h-3 w-3 text-[#7e7e7e]" />
          <span className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Work Link</span>
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
            className={`flex-1 text-xs border px-2.5 py-2 outline-none transition-all text-[#e6e6e6] placeholder:text-[#7e7e7e] ${
              isSubmitted
                ? "bg-[#1a1a1a] border-[#3c3c3c] text-[#7e7e7e] cursor-default"
                : "bg-[#0d0d0d] border-[#3c3c3c] focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1]/20"
            }`}
          />
          {linkValue && (
            <a
              href={linkValue}
              target="_blank"
              rel="noopener noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 w-8 h-8 flex items-center justify-center border border-[#0066b1]/30 text-[#0066b1] hover:bg-[#0066b1]/10 transition-colors"
              title="Open link in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {isSubmitted ? (
        <div className="flex items-center gap-2 text-[10px] text-[#7e7e7e] font-bold uppercase tracking-[1.5px] bg-[#1a1a1a] border border-[#3c3c3c] px-3 py-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Awaiting QC Review
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDone(task); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[1.5px] text-white bg-transparent border border-white hover:bg-white hover:text-black transition-all"
        >
          {getDoneIcon(subRole)}
          {getDoneLabel(subRole)}
        </button>
      )}

      <div className="mt-2 text-[10px] text-[#7e7e7e]">
        <span suppressHydrationWarning>{new Date(task.created_at).toLocaleDateString("en-IN")}</span>
      </div>
    </div>
  );
}

function CompletedTaskCard({
  task,
  videos,
  workLink,
  canUpload,
}: {
  task: LoaderTask;
  videos: ChapterVideo[];
  workLink: string | null;
  canUpload: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const router = useRouter();

  // Prefer the first available video's link; fall back to the newest one regardless of status.
  const linkedVideo = videos.find((v) => v.status === "available" && v.vimeo_link) || videos.find((v) => v.vimeo_link);

  const handleClose = () => {
    setUploadOpen(false);
    router.refresh();
  };

  return (
    <div className="bg-[#262626] p-4 mb-2 border border-[#0fa336]/20">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-[#0fa336] bg-[#0fa336]/10 border border-[#0fa336]/20 px-2 py-0.5 uppercase tracking-[1px]">
          {task.chapter?.name || "Chapter"}
        </span>
        <Link
          href={`/loader/task/${task.id}`}
          className="text-[10px] text-[#7e7e7e] hover:text-[#0066b1] transition-colors uppercase tracking-[1px]"
        >
          History →
        </Link>
      </div>

      <div className="mb-2">
        <StageBadge stage="video" />
      </div>

      <p className="text-sm text-[#e6e6e6] font-medium line-clamp-2 mb-1">
        {task.board?.name ? `${task.board.name} • ${task.subject?.name}` : task.title || "Untitled Task"}
      </p>
      {task.class?.name && (
        <p className="text-[10px] text-[#7e7e7e] uppercase tracking-[0.5px] mb-3">
          {task.class.name}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-[#0fa336] font-bold uppercase tracking-[1.5px] bg-[#0fa336]/10 border border-[#0fa336]/20 px-3 py-2 mb-2">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Final Approved
      </div>

      {/* The link submitted for this task — the source material the editor used. */}
      {workLink && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <LinkIcon className="h-3 w-3 text-[#7e7e7e]" />
            <span className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Task Work Link</span>
          </div>
          <div className="flex gap-1.5">
            <input
              readOnly
              value={workLink}
              className="flex-1 text-xs bg-[#1a1a1a] border border-[#3c3c3c] px-2.5 py-2 text-[#e6e6e6] outline-none truncate"
              aria-label="Task work link"
            />
            <a
              href={workLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-8 h-8 flex items-center justify-center border border-[#0066b1]/30 text-[#0066b1] hover:bg-[#0066b1]/10 transition-colors"
              title="Open task work link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Vimeo publishing (requirements 1–3): only the Video Editor (and above) may upload. */}
      {linkedVideo && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 bg-[#0066b1]/10 border border-[#0066b1]/20">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#0066b1] uppercase tracking-[1px] min-w-0">
            <Film className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Video Uploaded</span>
          </span>
          <CopyLinkButton
            link={linkedVideo.vimeo_link}
            className="shrink-0 px-2.5 py-1 border border-[#0066b1]/40 text-[10px] font-bold text-[#0066b1] tracking-[1px] uppercase hover:bg-[#0066b1]/10 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          />
        </div>
      )}

      {canUpload && task.chapter_id && (
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[1.5px] text-white bg-transparent border border-white hover:bg-white hover:text-black transition-all"
        >
          <Upload className="h-3.5 w-3.5" />
          {linkedVideo ? "Upload Another" : "Upload to Vimeo"}
        </button>
      )}

      <div className="mt-2 text-[10px] text-[#7e7e7e]">
        <span suppressHydrationWarning>{new Date(task.created_at).toLocaleDateString("en-IN")}</span>
      </div>

      {uploadOpen && task.chapter_id && (
        <VimeoUploadModal
          hierarchyId={task.chapter_id}
          destinationLabel={task.chapter?.name || "Chapter"}
          defaultTitle={task.chapter?.name || task.title || ""}
          taskWorkLink={workLink}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

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

  const countColor =
    column.id === "todo"        ? "text-[#0066b1] border-[#0066b1]/30 bg-[#0066b1]/10" :
    column.id === "in_progress" ? "text-[#f4b400] border-[#f4b400]/30 bg-[#f4b400]/10" :
    "text-[#a78bfa] border-[#7c3aed]/30 bg-[#7c3aed]/10";

  const topBorderClass =
    column.id === "todo"        ? "[border-top:3px_solid_#0066b1]" :
    column.id === "in_progress" ? "[border-top:3px_solid_#f4b400]" :
    "[border-top:3px_solid_#7c3aed]";

  return (
    <div
      className={`flex flex-col overflow-hidden border transition-all duration-200 ${
        isOver
          ? "border-[#0066b1]/60 bg-[#0066b1]/5"
          : "bg-[#1a1a1a] border-[#3c3c3c]"
      }`}
    >
      <div className={topBorderClass}>
        <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#0d0d0d] flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[2px]">{column.label}</h3>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 border ${countColor}`}>
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
            <div className="h-full flex items-center justify-center border border-dashed border-[#3c3c3c] min-h-[100px]">
              <span className="text-[10px] text-[#7e7e7e] select-none uppercase tracking-[1px]">
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

function CompletedColumn({
  tasks,
  chapterVideos,
  taskWorkLinks,
  canUpload,
}: {
  tasks: LoaderTask[];
  chapterVideos: Record<string, ChapterVideo[]>;
  taskWorkLinks: Record<string, string>;
  canUpload: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden border bg-[#1a1a1a] border-[#3c3c3c] [border-top:3px_solid_#0fa336]">
      <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#0d0d0d] flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-white uppercase tracking-[2px]">Final Approved</h3>
        <span className="text-[10px] font-bold px-2.5 py-0.5 border text-[#0fa336] border-[#0fa336]/30 bg-[#0fa336]/10">
          {tasks.length}
        </span>
      </div>

      <div className="p-3 flex-1 overflow-y-auto min-h-[300px] max-h-[calc(100vh-380px)]">
        {tasks.map((task) => (
          <CompletedTaskCard
            key={task.id}
            task={task}
            videos={(task.chapter_id && chapterVideos[task.chapter_id]) || []}
            workLink={taskWorkLinks[task.id] || null}
            canUpload={canUpload}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center border border-dashed border-[#3c3c3c] min-h-[100px]">
            <span className="text-[10px] text-[#7e7e7e] select-none uppercase tracking-[1px]">No completed tasks yet</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LoaderBoard({ tasks: initialTasks, userId, userName, subRole, chapterVideos, taskWorkLinks, canUpload }: LoaderBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [mounted, setMounted] = useState(false);
  const [submittingTask, setSubmittingTask] = useState<LoaderTask | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [inProgressIds, setInProgressIds] = useState<Set<string>>(new Set());
  const dragOriginalColumn = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLinks    = localStorage.getItem(`loader_links_${userId}`);
      const savedProgress = localStorage.getItem(`loader_progress_${userId}`);
      if (savedLinks)    setLinks(JSON.parse(savedLinks));
      if (savedProgress) {
        const allIds: string[] = JSON.parse(savedProgress);
        // Remove tasks that are now in needs_revision or submitted/completed — they must NOT stay in "In Progress"
        const validIds = allIds.filter(id => {
          const task = initialTasks.find(t => t.id === id);
          return task && !["needs_revision", "script_generated", "video_edited", "final_approved"].includes(task.current_status);
        });
        setInProgressIds(new Set(validIds));
      }
    } catch { /* ignore */ }
  }, [userId, initialTasks]);

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

  const dndTasks       = tasks.filter((t) => !COMPLETED_STATUSES.includes(t.current_status));
  const completedTasks = tasks.filter((t) => COMPLETED_STATUSES.includes(t.current_status));

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden border bg-[#1a1a1a] border-[#3c3c3c] animate-pulse">
            <div className="p-4 border-b bg-[#0d0d0d] border-[#3c3c3c]">
              <div className="h-3 bg-[#3c3c3c] w-24" />
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
        <CompletedColumn
          tasks={completedTasks}
          chapterVideos={chapterVideos}
          taskWorkLinks={taskWorkLinks}
          canUpload={canUpload}
        />
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
