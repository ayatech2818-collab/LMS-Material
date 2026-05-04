"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTaskWork } from "./actions";
import { toast } from "sonner";

export function SubmitWorkForm({ taskId, userId, userName }: { taskId: string, userId: string, userName: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [identityConfirmed, setIdentityConfirmed] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return toast.error("Please provide a proof URL.");
    if (identityConfirmed !== userId) return toast.error("Please confirm your identity.");

    setLoading(true);
    const res = await submitTaskWork(taskId, userId, url, notes);
    setLoading(false);

    if (res.success) {
      toast.success("Work submitted successfully!");
      router.push("/loader");
    } else {
      toast.error(res.error || "Failed to submit work.");
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
      <h3 className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[2px] mb-6">Submit Delivery</h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block mb-2">
            Proof URL (GDoc, Drive, YT)
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#3c3c3c] p-3 outline-none focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1] text-[#e6e6e6] text-sm placeholder:text-[#7e7e7e] transition-all"
            placeholder="https://..."
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block mb-2">
            Handoff Notes <span className="text-[#7e7e7e] font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-[#3c3c3c] p-3 outline-none focus:border-[#0066b1] focus:ring-1 focus:ring-[#0066b1] text-[#e6e6e6] text-sm min-h-[120px] resize-none placeholder:text-[#7e7e7e] transition-all"
            placeholder="Instructions for QC or Editor..."
          />
        </div>

        <div className="bg-[#1c69d4]/10 border border-[#1c69d4]/30 p-4">
          <label className="text-[10px] font-bold text-[#1c69d4] uppercase tracking-[1.5px] block mb-2">
            Sign-off Confirmation
          </label>
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
          <p className="text-xs text-[#1c69d4]/70 mt-2">By selecting your name, you confirm the provided proof-of-work meets the quality standards.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !url || identityConfirmed !== userId}
          className="w-full btn-m disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Submit to QC"}
        </button>
      </form>
    </div>
  );
}
