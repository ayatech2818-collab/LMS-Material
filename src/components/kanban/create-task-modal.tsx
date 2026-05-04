"use client";

import { useState, useEffect } from "react";
import { X, Plus, Check, Loader2 } from "lucide-react";
import { getHierarchies, createHierarchy } from "@/app/admin/hierarchy/actions";
import { getLoaders, createTask } from "@/app/admin/kanban/actions";
import { formatSubRole } from "@/lib/utils";
import { useRouter } from "next/navigation";

type HierarchyItem = {
  id: string;
  type: "board" | "class" | "subject" | "chapter";
  name: string;
  parent_id: string | null;
};

type LoaderProfile = {
  id: string;
  full_name: string;
  email: string;
  sub_role: string | null;
};

export function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [hierarchies, setHierarchies] = useState<HierarchyItem[]>([]);
  const [loaders, setLoaders] = useState<LoaderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedLoader, setSelectedLoader] = useState("");

  const [addingBoard, setAddingBoard] = useState(false);
  const [addingClass, setAddingClass] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [addingChapter, setAddingChapter] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [h, l] = await Promise.all([getHierarchies(), getLoaders()]);
      setHierarchies(h);
      setLoaders(l);
      setLoading(false);
    }
    loadData();
  }, []);

  const boards = hierarchies.filter(h => h.type === "board");
  const classes = hierarchies.filter(h => h.type === "class" && h.parent_id === selectedBoard);
  const subjects = hierarchies.filter(h => h.type === "subject" && h.parent_id === selectedClass);
  const chapters = hierarchies.filter(h => h.type === "chapter" && h.parent_id === selectedSubject);

  const handleInlineAdd = async (
    type: "board" | "class" | "subject" | "chapter",
    parentId: string | null,
    setAdding: (v: boolean) => void,
    setSelected: (v: string) => void
  ) => {
    if (!newName.trim()) { setAdding(false); return; }
    setAddingLoading(true);
    const res = await createHierarchy(type, newName.trim(), parentId);
    if (res.success && res.data) {
      setHierarchies(prev => [...prev, res.data as HierarchyItem]);
      setSelected(res.data.id);
    } else if (res.error) {
      setError(`Failed to add ${type}: ${res.error}`);
    }
    setNewName("");
    setAdding(false);
    setAddingLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedChapter || !selectedLoader) {
      setError("Please select a Chapter and a Material Loader.");
      return;
    }
    setSubmitting(true);

    const res = await createTask({
      board_id: selectedBoard,
      class_id: selectedClass,
      subject_id: selectedSubject,
      chapter_id: selectedChapter,
      loader_id: selectedLoader
    });

    if (res.error) setError(res.error);
    else {
      onClose();
      router.refresh();
    }
    setSubmitting(false);
  };

  const getSubRoleBadgeClass = (subRole: string | null) => {
    switch (subRole) {
      case "script_writer":         return "border border-[#0066b1] text-[#0066b1]";
      case "video_audio_generator": return "border border-[#f4b400] text-[#f4b400]";
      case "video_editor":          return "border border-[#a78bfa] text-[#a78bfa]";
      default:                      return "border border-[#3c3c3c] text-[#7e7e7e]";
    }
  };

  const renderDropdownRow = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: HierarchyItem[],
    placeholder: string,
    disabled: boolean,
    isAdding: boolean,
    setAdding: (v: boolean) => void,
    type: "board" | "class" | "subject" | "chapter",
    parentId: string | null,
    setSelected: (v: string) => void,
    onParentChange?: () => void
  ) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <select
          aria-label={label}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            onParentChange?.();
          }}
          disabled={disabled}
          className="flex-1 bg-[#0d0d0d] border border-[#3c3c3c] p-2.5 outline-none focus:border-[#0066b1] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm text-[#e6e6e6]"
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => { setAdding(true); setNewName(""); }}
          disabled={disabled}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-[#0066b1]/40 text-[#0066b1] hover:bg-[#0066b1]/10 hover:border-[#0066b1] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title={`Add new ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isAdding && (
        <div className="flex items-center gap-2 p-2.5 border border-[#0066b1] bg-[#0066b1]/5">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`New ${label.toLowerCase()} name...`}
            className="flex-1 bg-transparent text-sm outline-none text-[#e6e6e6] placeholder:text-[#7e7e7e]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInlineAdd(type, parentId, setAdding, setSelected);
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button
            type="button"
            disabled={addingLoading}
            onClick={() => handleInlineAdd(type, parentId, setAdding, setSelected)}
            className="p-1 text-[#0fa336] hover:bg-[#0fa336]/10 transition-colors"
            title="Confirm"
          >
            {addingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="p-1 text-[#e22718] hover:bg-[#e22718]/10 transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        {/* M-stripe */}
        <div className="m-stripe" />

        <div className="p-6 md:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-8 right-6 p-1.5 rounded-full text-[#7e7e7e] hover:bg-[#3c3c3c] hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 pr-8">
            <h2 className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[3px] mb-1">Assign Task</h2>
            <p className="text-[#bbbbbb] text-sm">Select curriculum path and assign to a loader.</p>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0066b1] mx-auto mb-3" />
              <p className="text-[#7e7e7e] text-sm">Loading curriculum data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-[#e22718]/10 border border-[#e22718]/30 text-[#e22718] text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-4 pb-4 border-b border-[#3c3c3c]">
                <p className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[2px]">Curriculum Path</p>

                {renderDropdownRow(
                  "Board", selectedBoard,
                  (val) => { setSelectedBoard(val); setSelectedClass(""); setSelectedSubject(""); setSelectedChapter(""); },
                  boards, "Select Board...", false,
                  addingBoard, setAddingBoard, "board", null,
                  (id) => { setSelectedBoard(id); setSelectedClass(""); setSelectedSubject(""); setSelectedChapter(""); }
                )}

                {renderDropdownRow(
                  "Class", selectedClass,
                  (val) => { setSelectedClass(val); setSelectedSubject(""); setSelectedChapter(""); },
                  classes, "Select Class...", !selectedBoard,
                  addingClass, setAddingClass, "class", selectedBoard,
                  (id) => { setSelectedClass(id); setSelectedSubject(""); setSelectedChapter(""); }
                )}

                {renderDropdownRow(
                  "Subject", selectedSubject,
                  (val) => { setSelectedSubject(val); setSelectedChapter(""); },
                  subjects, "Select Subject...", !selectedClass,
                  addingSubject, setAddingSubject, "subject", selectedClass,
                  (id) => { setSelectedSubject(id); setSelectedChapter(""); }
                )}

                {renderDropdownRow(
                  "Chapter", selectedChapter,
                  (val) => { setSelectedChapter(val); },
                  chapters, "Select Chapter...", !selectedSubject,
                  addingChapter, setAddingChapter, "chapter", selectedSubject,
                  (id) => { setSelectedChapter(id); }
                )}
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[2px]">Assignment</p>
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Assign Material Loader</label>
                <select
                  aria-label="Assign Material Loader"
                  value={selectedLoader}
                  onChange={e => setSelectedLoader(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-[#3c3c3c] p-2.5 outline-none focus:border-[#0066b1] transition-all text-sm text-[#e6e6e6]"
                >
                  <option value="">Select a Loader...</option>
                  {loaders.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.full_name} — {formatSubRole(l.sub_role)}
                    </option>
                  ))}
                </select>

                {selectedLoader && (() => {
                  const loader = loaders.find(l => l.id === selectedLoader);
                  if (!loader) return null;
                  return (
                    <div className="flex items-center gap-3 p-3 bg-[#262626] border border-[#3c3c3c]">
                      <div className="w-8 h-8 bg-[#0066b1] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {loader.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#e6e6e6] truncate">{loader.full_name}</p>
                        <p className="text-xs text-[#7e7e7e] truncate">{loader.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 shrink-0 ${getSubRoleBadgeClass(loader.sub_role)} uppercase tracking-[1px]`}>
                        {formatSubRole(loader.sub_role)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedChapter || !selectedLoader}
                className="w-full mt-4 btn-m disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning...
                  </span>
                ) : (
                  "Assign Task"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
