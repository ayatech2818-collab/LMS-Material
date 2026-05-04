"use client";

import { useState, useEffect } from "react";
import { createHierarchy, deleteHierarchy, updateHierarchy } from "@/app/admin/hierarchy/actions";
import { Plus, Edit2, Trash2, ChevronRight, Check, X } from "lucide-react";

type HierarchyNode = {
  id: string;
  type: "board" | "class" | "subject" | "chapter";
  name: string;
  parent_id: string | null;
};

export function HierarchyColumns({ initialData }: { initialData: HierarchyNode[] }) {
  const [data, setData] = useState<HierarchyNode[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingType, setAddingType] = useState<"board" | "class" | "subject" | "chapter" | null>(null);
  const [newName, setNewName] = useState("");

  const boards = data.filter(d => d.type === "board");
  const classes = data.filter(d => d.type === "class" && d.parent_id === selectedBoard);
  const subjects = data.filter(d => d.type === "subject" && d.parent_id === selectedClass);
  const chapters = data.filter(d => d.type === "chapter" && d.parent_id === selectedSubject);

  const handleAdd = async (type: "board" | "class" | "subject" | "chapter", parentId: string | null) => {
    if (!newName.trim()) return setAddingType(null);
    setLoading(true);
    const res = await createHierarchy(type, newName, parentId);
    if (res.success && res.data) {
      setData(prev => [...prev, res.data as HierarchyNode]);
    } else if (res.error) {
      alert("Failed to add: " + res.error);
    }
    setNewName("");
    setAddingType(null);
    setLoading(false);
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return setEditingId(null);
    setLoading(true);
    const res = await updateHierarchy(id, editName);
    if (res.success) {
      setData(prev => prev.map(item => item.id === id ? { ...item, name: editName } : item));
    } else if (res.error) {
      alert("Failed to update: " + res.error);
    }
    setEditingId(null);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete all items underneath it as well.")) return;
    setLoading(true);
    const res = await deleteHierarchy(id);
    if (res.success) {
      const removeRecursive = (targets: string[]) => {
        const allToRemove = [...targets];
        let hasNew = true;
        while(hasNew) {
          hasNew = false;
          data.forEach(d => {
            if (d.parent_id && allToRemove.includes(d.parent_id) && !allToRemove.includes(d.id)) {
              allToRemove.push(d.id);
              hasNew = true;
            }
          });
        }
        return allToRemove;
      };
      const idsToRemove = removeRecursive([id]);
      setData(prev => prev.filter(d => !idsToRemove.includes(d.id)));

      if (selectedBoard === id) setSelectedBoard(null);
      if (selectedClass === id) setSelectedClass(null);
      if (selectedSubject === id) setSelectedSubject(null);
    } else if (res.error) {
      alert("Cannot delete this item: It is likely attached to active tasks. Please remove tasks first.");
    }
    setLoading(false);
  };

  const renderColumn = (
    title: string,
    type: "board" | "class" | "subject" | "chapter",
    items: HierarchyNode[],
    selectedId: string | null,
    onSelect: (id: string) => void,
    parentId: string | null,
    isDisabled: boolean
  ) => {
    return (
      <div className={`flex-1 flex flex-col min-w-[240px] bg-[#000] border-r border-[#3c3c3c] h-[560px] ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="px-4 py-3 border-b border-[#3c3c3c] flex items-center justify-between bg-[#0d0d0d]">
          <h3 className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[2px]">{title}</h3>
          <button
            onClick={() => setAddingType(type)}
            aria-label={`Add ${title}`}
            className="p-1 text-[#0066b1] hover:bg-[#0066b1]/10 rounded-full transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {addingType === type && (
            <div className="flex items-center gap-2 p-2 border border-[#0066b1] bg-[#0066b1]/5">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Enter name..."
                className="flex-1 bg-transparent text-sm outline-none text-[#e6e6e6] placeholder:text-[#7e7e7e]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd(type, parentId);
                  if (e.key === 'Escape') setAddingType(null);
                }}
              />
              <button disabled={loading} onClick={() => handleAdd(type, parentId)} aria-label="Confirm add" className="text-[#0fa336] hover:text-white transition-colors"><Check className="h-4 w-4"/></button>
              <button onClick={() => setAddingType(null)} aria-label="Cancel add" className="text-[#e22718] hover:text-white transition-colors"><X className="h-4 w-4"/></button>
            </div>
          )}

          {items.map(item => {
            const isSelected = selectedId === item.id;
            const isEditing = editingId === item.id;

            if (isEditing) {
              return (
                <div key={item.id} className="flex items-center gap-2 p-2 border border-[#0066b1] bg-[#0066b1]/5">
                  <input
                    autoFocus
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Enter name..."
                    className="flex-1 bg-transparent text-sm outline-none text-[#e6e6e6] placeholder:text-[#7e7e7e]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEdit(item.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button disabled={loading} onClick={() => handleEdit(item.id)} aria-label="Confirm edit" className="text-[#0fa336] hover:text-white transition-colors"><Check className="h-4 w-4"/></button>
                  <button onClick={() => setEditingId(null)} aria-label="Cancel edit" className="text-[#e22718] hover:text-white transition-colors"><X className="h-4 w-4"/></button>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`group flex items-center justify-between p-3 cursor-pointer transition-colors border ${
                  isSelected
                    ? "bg-[#0066b1] text-white border-[#0066b1]"
                    : "bg-[#1a1a1a] text-[#bbbbbb] border-[#3c3c3c] hover:border-[#7e7e7e] hover:text-white"
                }`}
              >
                <span className="text-sm tracking-wide truncate block flex-1">{item.name}</span>

                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditName(item.name); }}
                    aria-label={`Edit ${item.name}`}
                    className={`p-1 ${isSelected ? 'hover:bg-black/20' : 'hover:bg-[#262626]'} transition-colors`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    aria-label={`Delete ${item.name}`}
                    className={`p-1 transition-colors ${isSelected ? 'hover:bg-[#e22718]/30 hover:text-[#e22718]' : 'text-[#7e7e7e] hover:text-[#e22718] hover:bg-[#e22718]/10'}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {type !== "chapter" && (
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5 opacity-60" />
                  )}
                </div>
              </div>
            );
          })}

          {items.length === 0 && addingType !== type && (
            <div className="text-center text-xs text-[#7e7e7e] py-8 px-4 uppercase tracking-[1px]">
              Click + to add a {title.toLowerCase()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex overflow-hidden border border-[#3c3c3c] min-w-max">
        {renderColumn("Boards", "board", boards, selectedBoard, (id) => { setSelectedBoard(id); setSelectedClass(null); setSelectedSubject(null); }, null, false)}
        {renderColumn("Classes", "class", classes, selectedClass, (id) => { setSelectedClass(id); setSelectedSubject(null); }, selectedBoard, !selectedBoard)}
        {renderColumn("Subjects", "subject", subjects, selectedSubject, (id) => { setSelectedSubject(id); }, selectedClass, !selectedClass)}
        {renderColumn("Chapters", "chapter", chapters, null, () => {}, selectedSubject, !selectedSubject)}
      </div>
    </div>
  );
}
