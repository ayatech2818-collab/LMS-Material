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
        className="p-2 hover:bg-ice-mist rounded-full transition-colors text-mute-gray hover:text-deep-charcoal"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5e5e5] rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full text-left px-4 py-2 text-sm text-deep-charcoal hover:bg-ice-mist flex items-center gap-2 disabled:opacity-50"
              >
                <PenLine className="w-4 h-4 text-ps-blue" />
                Send Password Reset
              </button>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={loading}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 ${
                  isActive
                    ? "text-commerce-orange hover:bg-commerce-orange/10"
                    : "text-[#2e7d32] hover:bg-[#2e7d32]/10"
                }`}
              >
                {isActive ? (
                  <Ban className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {loading ? "Updating..." : isActive ? "Deactivate User" : "Activate User"}
              </button>

              <div className="border-t border-[#f3f3f3] my-1" />

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full text-left px-4 py-2 text-sm text-warning-red hover:bg-warning-red/10 flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {loading ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
