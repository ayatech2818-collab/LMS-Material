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
  // Determine which of the two QC approval rounds this submission targets
  const isVideoStage =
    currentStatus === "script_approved" ||
    currentStatus === "video_generated" ||
    (currentStatus === "needs_revision" && revisionTargetStatus === "video_generated");

  if (isVideoStage) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 uppercase tracking-wide">
        2nd QC Review · Final Product
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-ps-blue/10 text-ps-blue border border-ps-blue/20 uppercase tracking-wide">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-md shadow-[0_20px_60px_0_rgba(0,0,0,0.2)] p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full text-body-gray hover:bg-[#f3f3f3] hover:text-deep-charcoal transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-light text-display-ink">{getDoneLabel(subRole)}</h2>
          <p className="text-body-gray text-sm mt-1 mb-2">{chapterName}</p>
          {getReviewStageBadge(currentStatus, revisionTargetStatus)}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-warning-red/10 border border-warning-red/30 text-warning-red text-sm rounded-[8px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Proof URL */}
          <div>
            <label className="text-sm font-semibold text-deep-charcoal block mb-2">
              Proof URL (Google Doc, Drive, YouTube)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="flex-1 border border-[#cccccc] rounded-[8px] p-2.5 outline-none focus:border-ps-blue focus:ring-2 focus:ring-ps-blue/20 transition-all text-sm"
                placeholder="https://docs.google.com/..."
                required
              />
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-[8px] border border-ps-blue/30 text-ps-blue hover:bg-ps-blue/10 transition-colors"
                  title="Open link"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-deep-charcoal block mb-2">
              Handoff Notes <span className="text-body-gray font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-[#cccccc] rounded-[8px] p-2.5 outline-none focus:border-ps-blue focus:ring-2 focus:ring-ps-blue/20 transition-all text-sm min-h-[100px] resize-none"
              placeholder="Instructions for QC or the next person in the chain..."
            />
          </div>

          {/* Identity Confirmation */}
          <div className="bg-ps-blue/5 p-4 rounded-[12px] border border-ps-blue/10">
            <label className="text-sm font-semibold text-ps-blue block mb-2">Sign-off Confirmation</label>
            <select
              required
              value={identityConfirmed}
              onChange={e => setIdentityConfirmed(e.target.value)}
              aria-label="Sign-off Confirmation"
              className="w-full bg-white border border-ps-blue/30 rounded-[8px] p-2.5 text-sm outline-none focus:border-ps-blue text-deep-charcoal"
            >
              <option value="" disabled>Select your name to confirm identity</option>
              <option value={userId}>{userName} (Me)</option>
            </select>
            <p className="text-xs text-ps-blue/70 mt-2">
              By selecting your name, you confirm the work meets the required quality standards.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !url || identityConfirmed !== userId}
            className="w-full bg-ps-blue hover:bg-ps-cyan text-white py-3 rounded-[999px] font-medium transition-all hover:scale-[1.02] active:scale-95 shadow-[0_5px_9px_0_rgba(0,0,0,0.12)] disabled:opacity-50 disabled:hover:scale-100"
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
  );
}
