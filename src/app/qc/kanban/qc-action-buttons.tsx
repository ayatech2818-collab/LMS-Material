"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveTask, rejectTask } from "./actions";
import { toast } from "sonner";


export function QCActionButtons({
  taskId,
  userId,
  currentStatus,
  onComplete,
}: {
  taskId: string;
  userId: string;
  currentStatus: string;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    const res = await approveTask(taskId, userId, currentStatus);
    setLoading(false);
    if (res.success) {
      toast.success("Task approved successfully!");
      router.refresh();
      if (onComplete) onComplete();
    } else {
      toast.error("Failed to approve task.");
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;
    setLoading(true);
    const res = await rejectTask(taskId, userId, currentStatus, rejectReason.trim());
    setLoading(false);
    if (res.success) {
      toast.success("Task rejected and sent back for revision.");
      router.refresh();
      if (onComplete) onComplete();
    } else {
      toast.error("Failed to reject task.");
    }
  };

  if (showRejectForm) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-[#e6e6e6] tracking-[1.5px] uppercase">
          Rejection Reason <span className="text-[#e22718]">*</span>
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Describe the issue so the creator can fix it..."
          className="w-full bg-[#0d0d0d] border border-[#3c3c3c] p-3 outline-none focus:border-[#e22718] min-h-[80px] text-sm resize-none text-[#e6e6e6] placeholder:text-[#7e7e7e]"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
            disabled={loading}
            className="flex-1 border border-[#3c3c3c] text-[#bbbbbb] py-2.5 font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#3c3c3c] hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRejectSubmit}
            disabled={loading || !rejectReason.trim()}
            className="flex-1 bg-[#e22718] text-white py-2.5 font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#c41f12] transition-colors disabled:opacity-50"
          >
            {loading ? "Rejecting..." : "Confirm Reject"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setShowRejectForm(true)}
        disabled={loading}
        className="flex-1 bg-transparent border border-[#e22718] text-[#e22718] py-3 font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#e22718] hover:text-white transition-colors disabled:opacity-50"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 bg-[#0fa336] border border-[#0fa336] text-white py-3 font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#0d8a2e] transition-colors disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}
