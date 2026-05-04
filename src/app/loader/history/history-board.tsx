"use client";

import { useState } from "react";
import {
  CheckCircle2,
  TrendingUp,
  Clock,
  FileCheck,
  XCircle,
  BarChart3,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from "lucide-react";

type TaskItem = {
  id: string;
  current_status: string;
  created_at: string;
  updated_at: string;
  title?: string | null;
  board?: { name: string } | null;
  class?: { name: string } | null;
  subject?: { name: string } | null;
  chapter?: { name: string } | null;
};

type HistoryEntry = {
  id: string;
  task_id: string;
  action: string;
  notes: string | null;
  proof_url: string | null;
  new_status: string;
  previous_status: string | null;
  created_at: string;
  changed_by: string;
};

type Stats = {
  totalTasks: number;
  totalCompleted: number;
  totalActive: number;
  totalSubmissions: number;
  approvals: number;
  rejections: number;
  approvalRate: number;
  avgCompletionDays: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  assigned:         { label: "Assigned",         color: "#0066b1" },
  script_generated: { label: "Script Submitted", color: "#a78bfa" },
  script_approved:  { label: "Script Approved",  color: "#0fa336" },
  video_generated:  { label: "Video Generated",  color: "#f4b400" },
  video_edited:     { label: "Video Submitted",  color: "#a78bfa" },
  final_approved:   { label: "Final Approved",   color: "#0fa336" },
  needs_revision:   { label: "Needs Revision",   color: "#e22718" },
};

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  created:              { label: "Task Created",       color: "#7e7e7e" },
  submitted:            { label: "Work Submitted",     color: "#0066b1" },
  reassigned:           { label: "Reassigned",         color: "#f4b400" },
  qc_approved_script:   { label: "QC Approved Script", color: "#0fa336" },
  qc_approved_video:    { label: "QC Approved Video",  color: "#0fa336" },
  qc_rejected_script:   { label: "QC Rejected Script", color: "#e22718" },
  qc_rejected_video:    { label: "QC Rejected Video",  color: "#e22718" },
  kanban_drag:          { label: "Status Changed",     color: "#7e7e7e" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status.replace(/_/g, " "), color: "#7e7e7e" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-[1px] uppercase border"
      style={{
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
        borderColor: `${cfg.color}30`,
      }}
    >
      {status === "final_approved" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "needs_revision" && <AlertTriangle className="h-2.5 w-2.5" />}
      {cfg.label}
    </span>
  );
}

export function HistoryBoard({
  allTasks,
  stats,
  proofMap,
  taskTimelines,
  subRole,
  userName,
}: {
  allTasks: TaskItem[];
  stats: Stats;
  proofMap: Record<string, string | null>;
  taskTimelines: Record<string, HistoryEntry[]>;
  subRole: string | null;
  userName: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBoard, setFilterBoard] = useState<string>("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Unique boards and statuses for filters
  const boards = Array.from(new Set(allTasks.map((t) => t.board?.name).filter(Boolean))) as string[];
  const statuses = Array.from(new Set(allTasks.map((t) => t.current_status)));

  // Filter and sort
  const filtered = allTasks
    .filter((t) => {
      const q = searchQuery.toLowerCase();
      if (q) {
        const searchable = [t.board?.name, t.class?.name, t.subject?.name, t.chapter?.name, t.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (filterStatus !== "all" && t.current_status !== filterStatus) return false;
      if (filterBoard !== "all" && t.board?.name !== filterBoard) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Performance tier
  const tier =
    stats.approvalRate >= 90
      ? { label: "Excellent", color: "#0fa336", icon: Award }
      : stats.approvalRate >= 70
      ? { label: "Good", color: "#f4b400", icon: TrendingUp }
      : stats.approvalRate >= 50
      ? { label: "Average", color: "#f4b400", icon: BarChart3 }
      : { label: "Needs Improvement", color: "#e22718", icon: BarChart3 };

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Total Tasks */}
        <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-3 sm:p-5 hover:bg-[#262626] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#7e7e7e] text-[10px] font-bold tracking-[1.5px] uppercase">Total Tasks</h3>
            <div className="p-1.5 bg-[#0066b1]/10 border border-[#0066b1]/20">
              <FileCheck className="h-3.5 w-3.5 text-[#0066b1]" />
            </div>
          </div>
          <p className="text-2xl sm:text-[32px] font-light text-white leading-none">{stats.totalTasks}</p>
          <p className="text-[9px] sm:text-[10px] text-[#7e7e7e] mt-1 uppercase tracking-[1px]">
            {stats.totalActive} active · {stats.totalCompleted} done
          </p>
        </div>

        {/* Submissions */}
        <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-5 hover:bg-[#262626] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#7e7e7e] text-[10px] font-bold tracking-[1.5px] uppercase">Submissions</h3>
            <div className="p-1.5 bg-[#a78bfa]/10 border border-[#7c3aed]/20">
              <Loader2 className="h-3.5 w-3.5 text-[#a78bfa]" />
            </div>
          </div>
          <p className="text-2xl sm:text-[32px] font-light text-white leading-none">{stats.totalSubmissions}</p>
        </div>

        {/* Approvals */}
        <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-5 hover:bg-[#262626] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#7e7e7e] text-[10px] font-bold tracking-[1.5px] uppercase">Approvals</h3>
            <div className="p-1.5 bg-[#0fa336]/10 border border-[#0fa336]/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#0fa336]" />
            </div>
          </div>
          <p className="text-2xl sm:text-[32px] font-light text-[#0fa336] leading-none">{stats.approvals}</p>
        </div>

        {/* Rejections */}
        <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-5 hover:bg-[#262626] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#7e7e7e] text-[10px] font-bold tracking-[1.5px] uppercase">Rejections</h3>
            <div className="p-1.5 bg-[#e22718]/10 border border-[#e22718]/20">
              <XCircle className="h-3.5 w-3.5 text-[#e22718]" />
            </div>
          </div>
          <p className="text-2xl sm:text-[32px] font-light text-[#e22718] leading-none">{stats.rejections}</p>
        </div>

        {/* Approval Rate */}
        <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-5 hover:bg-[#262626] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#7e7e7e] text-[10px] font-bold tracking-[1.5px] uppercase">Approval Rate</h3>
            <div className="p-1.5 border" style={{ backgroundColor: `${tier.color}15`, borderColor: `${tier.color}30` }}>
              <tier.icon className="h-3.5 w-3.5" style={{ color: tier.color }} />
            </div>
          </div>
          <p className="text-2xl sm:text-[32px] font-light leading-none" style={{ color: tier.color }}>
            {stats.approvalRate}%
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[1px] mt-1" style={{ color: tier.color }}>
            {tier.label}
          </p>
        </div>

        {/* Completed */}
        <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-5 hover:bg-[#262626] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#7e7e7e] text-[10px] font-bold tracking-[1.5px] uppercase">Completed</h3>
            <div className="p-1.5 bg-[#0fa336]/10 border border-[#0fa336]/20">
              <Award className="h-3.5 w-3.5 text-[#0fa336]" />
            </div>
          </div>
          <p className="text-2xl sm:text-[32px] font-light text-[#0fa336] leading-none">{stats.totalCompleted}</p>
        </div>
      </div>

      {/* Avg Completion Time */}
      {stats.avgCompletionDays > 0 && (
        <div className="bg-[#0066b1]/5 border border-[#0066b1]/20 p-4 flex items-center gap-3">
          <Clock className="h-4 w-4 text-[#0066b1] shrink-0" />
          <p className="text-sm text-[#e6e6e6]">
            <span className="font-bold text-[#0066b1]">{stats.avgCompletionDays} days</span>{" "}
            average task completion time
          </p>
        </div>
      )}

      {/* Task List */}
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
        {/* Header with filters */}
        <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] bg-[#0d0d0d] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xs font-bold text-white tracking-[2px] uppercase shrink-0">
            All Tasks
            <span className="ml-3 text-[#0066b1] bg-[#0066b1]/10 px-2.5 py-1 border border-[#0066b1]/20 text-[10px]">
              {filtered.length}
            </span>
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7e7e7e]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs bg-[#1a1a1a] border border-[#3c3c3c] text-[#e6e6e6] placeholder:text-[#7e7e7e] outline-none focus:border-[#0066b1] w-40 transition-colors"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-[#1a1a1a] border border-[#3c3c3c] text-[#e6e6e6] outline-none focus:border-[#0066b1] cursor-pointer transition-colors"
            >
              <option value="all">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s]?.label || s.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            {/* Board filter */}
            {boards.length > 1 && (
              <select
                value={filterBoard}
                onChange={(e) => setFilterBoard(e.target.value)}
                className="px-3 py-2 text-xs bg-[#1a1a1a] border border-[#3c3c3c] text-[#e6e6e6] outline-none focus:border-[#0066b1] cursor-pointer transition-colors"
              >
                <option value="all">All Boards</option>
                {boards.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {/* Sort */}
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#7e7e7e] border border-[#3c3c3c] hover:text-white hover:bg-[#262626] transition-colors uppercase tracking-[1px]"
            >
              {sortOrder === "newest" ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>

        {/* Task rows */}
        {filtered.length > 0 ? (
          <ul className="divide-y divide-[#3c3c3c]">
            {filtered.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const timeline = taskTimelines[task.id] || [];

              return (
                <li key={task.id} className="transition-colors">
                  {/* Task row */}
                  <button
                    type="button"
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className="w-full text-left px-3 sm:px-5 md:px-6 py-3 sm:py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <ChevronRight
                      className={`h-4 w-4 text-[#7e7e7e] shrink-0 transition-transform duration-200 hidden sm:block ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <StatusBadge status={task.current_status} />
                        {task.board?.name && (
                          <span className="text-[10px] font-bold text-[#0066b1] bg-[#0066b1]/10 border border-[#0066b1]/20 px-2 py-0.5 uppercase tracking-[1px]">
                            {task.board.name}
                          </span>
                        )}
                      </div>

                      <p className="font-semibold text-[#e6e6e6] text-xs sm:text-sm mb-1 truncate">
                        {[task.subject?.name, task.chapter?.name].filter(Boolean).join(" · ") ||
                          task.title ||
                          "Untitled Task"}
                      </p>

                      <p className="text-[10px] text-[#7e7e7e] uppercase tracking-[1px]">
                        {task.class?.name && <span>Class: {task.class.name} · </span>}
                        Created:{" "}
                        <span suppressHydrationWarning>
                          {new Date(task.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {" · "}
                        History: {timeline.length} events
                      </p>
                    </div>

                    {/* Proof link */}
                    <div className="shrink-0 self-start sm:self-center">
                      {proofMap[task.id] ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(proofMap[task.id]!, "_blank", "noopener,noreferrer");
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-[#0066b1] text-[#0066b1] text-[9px] sm:text-[10px] font-bold uppercase tracking-[1px] hover:bg-[#0066b1] hover:text-white transition-colors cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] text-[#7e7e7e] uppercase tracking-[1px]">No link</span>
                      )}
                    </div>
                  </button>

                  {/* Expanded timeline */}
                  {isExpanded && timeline.length > 0 && (
                    <div className="px-3 sm:px-5 md:px-6 pb-5 pt-1 ml-4 sm:ml-[2.35rem] border-l-2 border-[#3c3c3c]">
                      <div className="space-y-0">
                        {timeline.map((entry, idx) => {
                          const cfg = ACTION_CONFIG[entry.action] || {
                            label: entry.action.replace(/_/g, " "),
                            color: "#7e7e7e",
                          };
                          const isLast = idx === timeline.length - 1;

                          return (
                            <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                              {/* Dot */}
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 -ml-[7px] border-2 border-[#1a1a1a]"
                                style={{ backgroundColor: cfg.color }}
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-[1px]"
                                    style={{ color: cfg.color }}
                                  >
                                    {cfg.label}
                                  </span>
                                  <span className="text-[10px] text-[#7e7e7e]" suppressHydrationWarning>
                                    {new Date(entry.created_at).toLocaleString("en-IN", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                </div>

                                {entry.notes && (
                                  <p className="text-xs text-[#bbbbbb] mt-1 whitespace-pre-wrap">
                                    {entry.notes}
                                  </p>
                                )}

                                {entry.proof_url && (
                                  <a
                                    href={entry.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-[#0066b1] hover:underline mt-1"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    {entry.proof_url.length > 50
                                      ? entry.proof_url.slice(0, 50) + "..."
                                      : entry.proof_url}
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isExpanded && timeline.length === 0 && (
                    <div className="px-5 md:px-6 pb-4 ml-[2.35rem]">
                      <p className="text-xs text-[#7e7e7e]">No history events recorded.</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-12 text-center text-[#7e7e7e]">
            <FileCheck className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">
              {searchQuery || filterStatus !== "all" || filterBoard !== "all"
                ? "No tasks match your filters."
                : "No tasks assigned yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
