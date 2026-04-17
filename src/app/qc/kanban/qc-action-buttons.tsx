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
        <p className="text-sm font-semibold text-deep-charcoal">Rejection Reason <span className="text-warning-red">*</span></p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Describe the issue so the creator can fix it..."
          className="w-full border border-mute-gray/50 rounded-[6px] p-3 outline-none focus:border-warning-red min-h-[80px] text-sm resize-none"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
            disabled={loading}
            className="flex-1 border border-[#e5e5e5] text-deep-charcoal py-2 rounded-md font-medium text-sm hover:bg-ice-mist transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRejectSubmit}
            disabled={loading || !rejectReason.trim()}
            className="flex-1 bg-commerce-orange text-white py-2 rounded-md font-medium text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
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
        className="flex-1 bg-commerce-orange text-white py-2 rounded-md font-medium text-sm hover:scale-[1.03] transition-transform active:scale-95 disabled:opacity-50"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 bg-[#2e7d32] text-white py-2 rounded-md font-medium text-sm hover:scale-[1.03] transition-transform active:scale-95 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Approve"}
      </button>
    </div>
  );
}
