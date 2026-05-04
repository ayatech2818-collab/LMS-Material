"use client";

import { useState } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";
import { submitTaskWork } from "@/app/loader/task/[id]/actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SubmitModalProps = {
  taskId: string;
  userId: string;
  userName: string;
  chapterName: string;
  subRole: string | null;
  currentStatus?: string;
  revisionTargetStatus?: string | null;
  prefillUrl?: string;
  onClose: () => void;
};

function getDoneLabel(subRole: string | null) {
  switch (subRole) {
    case "script_writer": return "Done Scripting";
    case "video_audio_generator": return "Video Done";
    case "video_editor": return "Done Editing";
    default: return "Submit Work";
  }
}

function getReviewStageBadge(currentStatus?: string, revisionTargetStatus?: string | null) {
  const isVideoStage =
    currentStatus === "script_approved" ||
    currentStatus === "video_generated" ||
    (currentStatus === "needs_revision" && revisionTargetStatus === "video_generated");

  if (isVideoStage) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/20 uppercase tracking-[1px]">
        2nd QC Review · Final Product
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold bg-[#0066b1]/10 text-[#0066b1] border border-[#0066b1]/20 uppercase tracking-[1px]">
      1st QC Review · Script / Plan
    </span>
  );
}

export function SubmitModal({ taskId, userId, userName, chapterName, subRole, currentStatus, revisionTargetStatus, prefillUrl, onClose }: SubmitModalProps) {
  const router = useRouter();
  const [url, setUrl] = useState(prefillUrl || "");
  const [notes, setNotes] = useState("");
  const [identityConfirmed, setIdentityConfirmed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) { toast.error("Please provide a proof URL."); return; }
    if (identityConfirmed !== userId) { toast.error("Please confirm your identity."); return; }

    setLoading(true);
    setError("");
    const res = await submitTaskWork(taskId, userId, url, notes);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success("Work submitted successfully!");
      onClose();
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        {/* M-stripe at top */}
        <div className="m-stripe" />

        <div className="p-6 md:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-8 right-6 p-1.5 rounded-full text-[#7e7e7e] hover:bg-[#3c3c3c] hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 pr-8">
            <h2 className="text-base font-bold text-white tracking-[1.5px] uppercase mb-1">{getDoneLabel(subRole)}</h2>
            <p className="text-[#7e7e7e] text-xs mb-3 uppercase tracking-[1px]">{chapterName}</p>
            {getReviewStageBadge(currentStatus, revisionTargetStatus)}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[#e22718]/10 border border-[#e22718]/30 text-[#e22718] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Proof URL */}
            <div>
              <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block mb-2">
                Proof URL (Google Doc, Drive, YouTube)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="flex-1 bg-[#0d0d0d] border border-[#3c3c3c] p-2.5 outline-none focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1] transition-all text-sm text-[#e6e6e6] placeholder:text-[#7e7e7e]"
                  placeholder="https://docs.google.com/..."
                  required
                />
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-10 h-10 flex items-center justify-center border border-[#0066b1]/30 text-[#0066b1] hover:bg-[#0066b1]/10 transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block mb-2">
                Handoff Notes <span className="text-[#7e7e7e] font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#3c3c3c] p-2.5 outline-none focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1] transition-all text-sm text-[#e6e6e6] min-h-[100px] resize-none placeholder:text-[#7e7e7e]"
                placeholder="Instructions for QC or the next person in the chain..."
              />
            </div>

            {/* Identity Confirmation */}
            <div className="bg-[#1c69d4]/10 border border-[#1c69d4]/30 p-4">
              <label className="text-[10px] font-bold text-[#1c69d4] uppercase tracking-[1.5px] block mb-2">Sign-off Confirmation</label>
              <select
                required
                value={identityConfirmed}
                onChange={e => setIdentityConfirmed(e.target.value)}
                aria-label="Sign-off Confirmation"
                className="w-full bg-[#0d0d0d] border border-[#1c69d4]/30 p-2.5 text-sm outline-none focus:border-[#1c69d4] text-[#e6e6e6]"
              >
                <option value="" disabled>Select your name to confirm identity</option>
                <option value={userId}>{userName} (Me)</option>
              </select>
              <p className="text-xs text-[#1c69d4]/70 mt-2">
                By selecting your name, you confirm the work meets the required quality standards.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !url || identityConfirmed !== userId}
              className="w-full btn-m disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                `Submit — ${getDoneLabel(subRole)}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
