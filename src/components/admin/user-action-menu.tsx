"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Ban, CheckCircle, PenLine, Trash2 } from "lucide-react";
import { toggleUserStatus, sendPasswordReset, deleteUserAction } from "@/app/admin/users/actions";

export function UserActionMenu({
  userId,
  email,
  isActive,
}: {
  userId: string;
  email: string;
  isActive: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggleStatus = async () => {
    if (!confirm(`Are you sure you want to ${isActive ? "deactivate" : "activate"} this user?`)) return;
    setLoading(true);
    const result = await toggleUserStatus(userId, !isActive);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      router.refresh();
    }
    setLoading(false);
    setIsOpen(false);
  };

  const handleResetPassword = async () => {
    setLoading(true);
    const result = await sendPasswordReset(email);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      alert("Password reset email sent successfully.");
    }
    setLoading(false);
    setIsOpen(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${email}? This cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteUserAction(userId);
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      router.refresh();
    }
    setLoading(false);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        aria-label="User actions"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-[#262626] rounded-full transition-colors text-[#7e7e7e] hover:text-white"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-[#1a1a1a] border border-[#3c3c3c] shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50 overflow-hidden">
            <div className="py-1">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full text-left px-4 py-2.5 text-xs text-[#bbbbbb] hover:bg-[#262626] hover:text-white flex items-center gap-2 disabled:opacity-50 font-medium uppercase tracking-[1px]"
              >
                <PenLine className="w-3.5 h-3.5 text-[#0066b1]" />
                Send Password Reset
              </button>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={loading}
                className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 disabled:opacity-50 font-medium uppercase tracking-[1px] transition-colors ${
                  isActive
                    ? "text-[#e22718] hover:bg-[#e22718]/10"
                    : "text-[#0fa336] hover:bg-[#0fa336]/10"
                }`}
              >
                {isActive ? (
                  <Ban className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                {loading ? "Updating..." : isActive ? "Deactivate User" : "Activate User"}
              </button>

              <div className="border-t border-[#3c3c3c] my-1" />

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full text-left px-4 py-2.5 text-xs text-[#e22718] hover:bg-[#e22718]/10 flex items-center gap-2 disabled:opacity-50 font-medium uppercase tracking-[1px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {loading ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
