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
    <div className="bg-white rounded-[24px] p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.06)] border border-ps-blue/20">
      <h3 className="text-xl font-light text-display-ink mb-6">Submit Delivery</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-deep-charcoal block mb-2">Proof URL (GDoc, Drive, YT)</label>
          <input 
            type="url" 
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full border border-mute-gray/50 rounded-[6px] p-3 outline-none focus:border-ps-blue"
            placeholder="https://..."
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-deep-charcoal block mb-2">Handoff Notes</label>
          <textarea 
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-mute-gray/50 rounded-[6px] p-3 outline-none focus:border-ps-blue min-h-[120px]"
            placeholder="Instructions for QC or Editor..."
          />
        </div>

        <div className="bg-ps-blue/5 p-4 rounded-xl border border-ps-blue/10">
           <label className="text-sm font-semibold text-ps-blue block mb-2">Sign-off Confirmation</label>
           <select
             required
             value={identityConfirmed}
             onChange={e => setIdentityConfirmed(e.target.value)}
             aria-label="Sign-off Confirmation"
             className="w-full bg-white border border-ps-blue/30 rounded-[6px] p-2 text-sm outline-none focus:border-ps-blue text-deep-charcoal"
           >
             <option value="" disabled>Select your name to confirm identity</option>
             <option value={userId}>{userName} (Me)</option>
           </select>
           <p className="text-xs text-ps-blue/70 mt-2">By selecting your name, you confirm the provided proof-of-work meets the quality standards.</p>
        </div>

        <button 
          type="submit"
          disabled={loading || !url || identityConfirmed !== userId}
          className="w-full bg-ps-blue hover:bg-ps-cyan text-white py-3 rounded-[999px] font-medium transition-all hover:scale-[1.02] active:scale-95 shadow-[0_5px_9px_0_rgba(0,0,0,0.16)] mt-4 disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Submitting..." : "Submit to QC"}
        </button>
      </form>
    </div>
  );
}
