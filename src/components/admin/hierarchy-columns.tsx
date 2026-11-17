"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createHierarchy, deleteHierarchy, updateHierarchy } from "@/app/admin/hierarchy/actions";
import { Plus, Edit2, Trash2, ChevronRight, Check, X, Upload } from "lucide-react";
import type { HierarchyNode } from "@/lib/hierarchy";

interface ColumnProps {
  title: string;
  type: "board" | "class" | "subject" | "chapter";
  items: HierarchyNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  parentId: string | null;
  isDisabled: boolean;
  counts?: Record<string, number>;
  readOnly: boolean;
  loading: boolean;
  addingType: "board" | "class" | "subject" | "chapter" | null;
  setAddingType: (type: "board" | "class" | "subject" | "chapter" | null) => void;
  newName: string;
  setNewName: (name: string) => void;
  handleAdd: (type: "board" | "class" | "subject" | "chapter", parentId: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  onSelectNode?: (node: HierarchyNode) => void;
}

const BATCH_SIZE = 30;

function Column({
  title,
  type,
  items,
  selectedId,
  onSelect,
  parentId,
  isDisabled,
  counts,
  readOnly,
  loading,
  addingType,
  setAddingType,
  newName,
  setNewName,
  handleAdd,
  editingId,
  setEditingId,
  editName,
  setEditName,
  handleEdit,
  handleDelete,
  onSelectNode,
}: ColumnProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination and scroll position when parent changes or filter changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [parentId]);

  // Ensure selected item is within visible range
  useEffect(() => {
    if (selectedId) {
      const idx = items.findIndex((i) => i.id === selectedId);
      if (idx >= visibleCount) {
        setVisibleCount(idx + BATCH_SIZE);
      }
    }
  }, [selectedId, items, visibleCount]);

  // Expand visible slice as user scrolls
  const loadMore = useCallback(() => {
    if (visibleCount < items.length) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length));
    }
  }, [visibleCount, items.length]);

  // 1. IntersectionObserver on bottom sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: "180px", // Trigger before user reaches the very bottom
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // 2. Direct scroll listener fallback for all environments
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 180) {
      loadMore();
    }
  };

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={`flex-1 flex flex-col min-w-[240px] bg-[#000] border-r border-[#3c3c3c] h-[560px] ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="px-4 py-3 border-b border-[#3c3c3c] flex items-center justify-between bg-[#0d0d0d]">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[2px]">{title}</h3>
          {items.length > 0 && (
            <span className="text-[10px] text-[#555] font-mono">({items.length})</span>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={() => setAddingType(type)}
            aria-label={`Add ${title}`}
            className="p-1 text-[#0066b1] hover:bg-[#0066b1]/10 rounded-full transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1"
      >
        {addingType === type && (
          <div className="flex items-center gap-2 p-2 border border-[#0066b1] bg-[#0066b1]/5">
            <input
              autoFocus
              disabled={loading}
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Enter name..."
              className="flex-1 bg-transparent text-sm outline-none text-[#e6e6e6] placeholder:text-[#7e7e7e] disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!loading) handleAdd(type, parentId);
                }
                if (e.key === 'Escape') setAddingType(null);
              }}
            />
            <button disabled={loading} onClick={() => { if (!loading) handleAdd(type, parentId); }} aria-label="Confirm add" className={`text-[#0fa336] hover:text-white transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}><Check className="h-4 w-4"/></button>
            <button disabled={loading} onClick={() => setAddingType(null)} aria-label="Cancel add" className="text-[#e22718] hover:text-white transition-colors"><X className="h-4 w-4"/></button>
          </div>
        )}

        {visibleItems.map(item => {
          const isSelected = selectedId === item.id;
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <div key={item.id} className="flex items-center gap-2 p-2 border border-[#0066b1] bg-[#0066b1]/5">
                <input
                  autoFocus
                  disabled={loading}
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter name..."
                  className="flex-1 bg-transparent text-sm outline-none text-[#e6e6e6] placeholder:text-[#7e7e7e] disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!loading) handleEdit(item.id);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button disabled={loading} onClick={() => { if (!loading) handleEdit(item.id); }} aria-label="Confirm edit" className={`text-[#0fa336] hover:text-white transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}><Check className="h-4 w-4"/></button>
                <button disabled={loading} onClick={() => setEditingId(null)} aria-label="Cancel edit" className="text-[#e22718] hover:text-white transition-colors"><X className="h-4 w-4"/></button>
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

              {counts && counts[item.id] !== undefined && counts[item.id] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 leading-none ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[#0fa336]/10 text-[#0fa336]"
                }`}>
                  {counts[item.id]}
                </span>
              )}

              <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!readOnly && (
                  <>
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
                  </>
                )}
                {onSelectNode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectNode(item); }}
                    aria-label={`Upload video to ${item.name}`}
                    className={`p-1 transition-colors ${isSelected ? 'hover:bg-black/20' : 'text-[#7e7e7e] hover:text-[#0fa336] hover:bg-[#0fa336]/10'}`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                )}
                {type !== "chapter" && (
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5 opacity-60" />
                )}
              </div>
            </div>
          );
        })}

        {/* Scroll Sentinel: triggers automatic lazy-load when scrolled into view */}
        {visibleCount < items.length && (
          <div
            ref={sentinelRef}
            className="py-2.5 flex items-center justify-center gap-2 text-[10px] text-[#7e7e7e] select-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066b1] animate-ping" />
            <span>Loading more {title.toLowerCase()} ({visibleCount} of {items.length})...</span>
          </div>
        )}

        {items.length === 0 && addingType !== type && (
          <div className="text-center text-xs text-[#7e7e7e] py-8 px-4 uppercase tracking-[1px]">
            Click + to add a {title.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}

export function HierarchyColumns({
  initialData,
  readOnly = false,
  onSelectNode,
  onNavigate,
  taskCounts
}: {
  initialData: HierarchyNode[];
  readOnly?: boolean;
  onSelectNode?: (node: HierarchyNode) => void;
  onNavigate?: (node: HierarchyNode) => void;
  taskCounts?: Record<string, number>;
}) {
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

  const navigate = (id: string) => {
    const node = data.find(d => d.id === id);
    if (node) onNavigate?.(node);
  };

  const boards = data.filter(d => d.type === "board");
  const classes = data.filter(d => d.type === "class" && d.parent_id === selectedBoard);
  const subjects = data.filter(d => d.type === "subject" && d.parent_id === selectedClass);
  const chapters = data.filter(d => d.type === "chapter" && d.parent_id === selectedSubject);

  const handleAdd = async (type: "board" | "class" | "subject" | "chapter", parentId: string | null) => {
    const trimmed = newName.trim();
    if (!trimmed) return setAddingType(null);
    if (loading) return;

    // Check if an item with the same name already exists under this parent
    const exists = data.some(
      d => d.type === type && d.parent_id === parentId && d.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      alert(`An item named "${trimmed}" already exists in this column.`);
      return;
    }

    setLoading(true);
    const res = await createHierarchy(type, trimmed, parentId);
    if (res.success && res.data) {
      setData(prev => {
        if (prev.some(d => d.id === res.data.id)) return prev;
        return [...prev, res.data as HierarchyNode];
      });
      setNewName("");
      setAddingType(null);
    } else if (res.error) {
      alert("Failed to add: " + res.error);
    }
    setLoading(false);
  };

  const handleEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return setEditingId(null);
    if (loading) return;

    const currentItem = data.find(d => d.id === id);
    if (currentItem) {
      const exists = data.some(
        d => d.id !== id && d.type === currentItem.type && d.parent_id === currentItem.parent_id && d.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        alert(`An item named "${trimmed}" already exists in this column.`);
        return;
      }
    }

    setLoading(true);
    const res = await updateHierarchy(id, trimmed);
    if (res.success) {
      setData(prev => prev.map(item => item.id === id ? { ...item, name: trimmed } : item));
      setEditingId(null);
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

  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex overflow-hidden border border-[#3c3c3c] min-w-max">
        <Column
          title="Boards"
          type="board"
          items={boards}
          selectedId={selectedBoard}
          onSelect={(id) => { setSelectedBoard(id); setSelectedClass(null); setSelectedSubject(null); navigate(id); }}
          parentId={null}
          isDisabled={false}
          counts={taskCounts}
          readOnly={readOnly}
          loading={loading}
          addingType={addingType}
          setAddingType={setAddingType}
          newName={newName}
          setNewName={setNewName}
          handleAdd={handleAdd}
          editingId={editingId}
          setEditingId={setEditingId}
          editName={editName}
          setEditName={setEditName}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          onSelectNode={onSelectNode}
        />
        <Column
          title="Classes"
          type="class"
          items={classes}
          selectedId={selectedClass}
          onSelect={(id) => { setSelectedClass(id); setSelectedSubject(null); navigate(id); }}
          parentId={selectedBoard}
          isDisabled={!selectedBoard}
          counts={taskCounts}
          readOnly={readOnly}
          loading={loading}
          addingType={addingType}
          setAddingType={setAddingType}
          newName={newName}
          setNewName={setNewName}
          handleAdd={handleAdd}
          editingId={editingId}
          setEditingId={setEditingId}
          editName={editName}
          setEditName={setEditName}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          onSelectNode={onSelectNode}
        />
        <Column
          title="Subjects"
          type="subject"
          items={subjects}
          selectedId={selectedSubject}
          onSelect={(id) => { setSelectedSubject(id); navigate(id); }}
          parentId={selectedClass}
          isDisabled={!selectedClass}
          counts={taskCounts}
          readOnly={readOnly}
          loading={loading}
          addingType={addingType}
          setAddingType={setAddingType}
          newName={newName}
          setNewName={setNewName}
          handleAdd={handleAdd}
          editingId={editingId}
          setEditingId={setEditingId}
          editName={editName}
          setEditName={setEditName}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          onSelectNode={onSelectNode}
        />
        <Column
          title="Chapters"
          type="chapter"
          items={chapters}
          selectedId={null}
          onSelect={(id) => { navigate(id); }}
          parentId={selectedSubject}
          isDisabled={!selectedSubject}
          counts={taskCounts}
          readOnly={readOnly}
          loading={loading}
          addingType={addingType}
          setAddingType={setAddingType}
          newName={newName}
          setNewName={setNewName}
          handleAdd={handleAdd}
          editingId={editingId}
          setEditingId={setEditingId}
          editName={editName}
          setEditName={setEditName}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          onSelectNode={onSelectNode}
        />
      </div>
    </div>
  );
}
