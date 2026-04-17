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

  // Inline-add states for each hierarchy level
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

  // Sub-role color mapping
  const subRoleColor = (subRole: string | null) => {
    switch (subRole) {
      case "script_writer": return "bg-ps-cyan/15 text-[#008ba8]";
      case "video_audio_generator": return "bg-commerce-orange/15 text-commerce-orange";
      case "video_editor": return "bg-[#7c4dff]/15 text-[#7c4dff]";
      default: return "bg-[#e5e5e5] text-body-gray";
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
      <label className="text-sm font-semibold text-deep-charcoal flex items-center gap-1.5">
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
          className="flex-1 border border-[#cccccc] rounded-[8px] p-2.5 outline-none focus:border-ps-blue focus:ring-2 focus:ring-ps-blue/20 disabled:bg-[#f9f9f9] disabled:cursor-not-allowed transition-all text-sm"
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
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-[8px] border border-dashed border-ps-blue/40 text-ps-blue hover:bg-ps-blue/10 hover:border-ps-blue transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title={`Add new ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Inline add input */}
      {isAdding && (
        <div className="flex items-center gap-2 p-2.5 border border-ps-blue rounded-[8px] bg-ps-blue/5 animate-in slide-in-from-top-1">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`New ${label.toLowerCase()} name...`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-body-gray/60"
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
            className="p-1 text-[#2e7d32] hover:bg-[#2e7d32]/10 rounded transition-colors"
            title="Confirm"
          >
            {addingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="p-1 text-warning-red hover:bg-warning-red/10 rounded transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-lg shadow-[0_20px_60px_0_rgba(0,0,0,0.2)] p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full text-body-gray hover:bg-[#f3f3f3] hover:text-deep-charcoal transition-colors"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-light text-display-ink">Assign Task</h2>
          <p className="text-body-gray text-sm mt-1">Select curriculum path and assign to a loader.</p>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-ps-blue mx-auto mb-3" />
            <p className="text-body-gray text-sm">Loading curriculum data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-warning-red/10 border border-warning-red/30 text-warning-red text-sm rounded-[8px] font-medium">
                {error}
              </div>
            )}

            {/* Curriculum Structure — Tree Cascading Dropdowns */}
            <div className="space-y-4 pb-4 border-b border-[#f3f3f3]">
              <p className="text-xs font-semibold text-body-gray uppercase tracking-wider">Curriculum Path</p>
              
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

            {/* Loader Assignment */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-body-gray uppercase tracking-wider">Assignment</p>
              <label className="text-sm font-semibold text-deep-charcoal">Assign Material Loader</label>
              <select 
                aria-label="Assign Material Loader"
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

              {/* Visual preview of selected loader */}
              {selectedLoader && (() => {
                const loader = loaders.find(l => l.id === selectedLoader);
                if (!loader) return null;
                return (
                  <div className="flex items-center gap-3 p-3 bg-ice-mist rounded-[10px] border border-[#e5e5e5]">
                    <div className="w-8 h-8 rounded-full bg-ps-blue flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {loader.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-deep-charcoal truncate">{loader.full_name}</p>
                      <p className="text-xs text-body-gray truncate">{loader.email}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${subRoleColor(loader.sub_role)}`}>
                      {formatSubRole(loader.sub_role)}
                    </span>
                  </div>
                );
              })()}
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedChapter || !selectedLoader}
              className="w-full mt-4 bg-ps-blue text-white py-3 rounded-[999px] font-medium transition-all hover:bg-ps-cyan disabled:opacity-50 hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 shadow-[0_5px_9px_0_rgba(0,0,0,0.12)]"
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
  );
}
