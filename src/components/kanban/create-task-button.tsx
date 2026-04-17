"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateTaskModal } from "@/components/kanban/create-task-modal";

export function CreateTaskButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-warning-red hover:bg-[#c0392b] text-white shadow-[0_6px_24px_0_rgba(220,38,38,0.45)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        title="Create Task"
      >
        <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
      </button>
      {isOpen && <CreateTaskModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
