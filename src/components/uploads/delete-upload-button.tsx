"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Generic two-click delete for an upload (video or S3 file) — first click asks for confirmation
 * inline (no native dialog), second click runs the provided delete server action. The action
 * enforces owner/admin, so this should only be rendered for people allowed to delete.
 */
export function DeleteUploadButton({
  uploadId,
  deleteAction,
  onDeleted,
  className,
}: {
  uploadId: string;
  deleteAction: (id: string) => Promise<{ error?: string; success?: boolean }>;
  onDeleted?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const res = await deleteAction(uploadId);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      setConfirming(false);
      return;
    }
    toast.success("Deleted");
    setConfirming(false);
    onDeleted?.();
    router.refresh();
  };

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-2 border border-[#e22718] text-xs font-bold text-[#e22718] tracking-[1px] uppercase hover:bg-[#e22718]/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Confirm delete"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-2.5 py-2 border border-[#3c3c3c] text-xs font-bold text-[#bbbbbb] tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors disabled:opacity-50"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={
        className ??
        "shrink-0 px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-[#e22718] tracking-[1px] uppercase hover:bg-[#e22718]/10 hover:border-[#e22718]/50 transition-colors flex items-center gap-1.5"
      }
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </button>
  );
}
