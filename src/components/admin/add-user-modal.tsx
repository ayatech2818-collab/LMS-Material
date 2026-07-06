"use client";

import { useState } from "react";
import { createUserAction } from "@/app/admin/actions";
import { Copy, Plus, X, MessageCircle } from "lucide-react";

export function AddUserForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<{email: string; password: string; phone: string | null} | null>(null);

  const [role, setRole] = useState("loader");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createUserAction(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success && result.user) {
      setCredentials(result.user);
    }

    setLoading(false);
  };

  const copyCreds = () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    alert("Credentials copied to clipboard!");
  };

  const shareWhatsApp = () => {
    if (!credentials) return;
    const message = `Your login credentials:\n\nEmail: ${credentials.email}\nPassword: ${credentials.password}`;
    const encoded = encodeURIComponent(message);
    if (credentials.phone) {
      const cleanPhone = credentials.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-m flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add New User
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] max-w-md w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => { setIsOpen(false); setCredentials(null); }}
          aria-label="Close"
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#7e7e7e] hover:text-[#e22718] hover:bg-[#e22718]/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xs font-bold text-[#7e7e7e] uppercase tracking-[3px] mb-6">Create User</h2>

        {credentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#262626] border border-[#3c3c3c]">
              <p className="text-[10px] font-bold text-[#0fa336] uppercase tracking-[1.5px] mb-3">User Created Successfully!</p>
              <div className="space-y-2 mb-4">
                <p className="text-[#e6e6e6] text-sm font-bold">Email: <span className="font-normal text-[#bbbbbb]">{credentials.email}</span></p>
                <p className="text-[#e6e6e6] text-sm font-bold">Password: <span className="font-normal text-[#bbbbbb] font-mono">{credentials.password}</span></p>
                {credentials.phone && (
                  <p className="text-[#e6e6e6] text-sm font-bold">Phone: <span className="font-normal text-[#bbbbbb]">{credentials.phone}</span></p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCreds}
                  className="btn-m flex-1 flex items-center gap-2 justify-center text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 flex items-center gap-2 justify-center py-2.5 px-4 bg-[#25D366] border border-[#25D366] text-white font-bold text-xs tracking-[1px] uppercase hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
            <button
              onClick={() => { setIsOpen(false); setCredentials(null); }}
              className="w-full py-3 px-4 border border-[#3c3c3c] text-[#bbbbbb] font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#262626] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-[#e22718]/10 border border-[#e22718] text-[#e22718] text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Full Name</label>
              <input name="fullName" required placeholder="Enter full name" className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Email Address</label>
              <input type="email" name="email" required placeholder="user@example.com" className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Mobile Number</label>
              <div className="flex items-center gap-2">
                <span className="text-[#bbbbbb] font-bold text-xs px-3 py-2.5 bg-[#0d0d0d] border border-[#3c3c3c]">+91</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="9876543210"
                  pattern="[0-9]{10}"
                  title="Enter 10-digit mobile number"
                  className="flex-1 bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Primary Role</label>
              <select
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Primary Role"
                className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] text-sm"
              >
                <option value="admin">Administrator</option>
                <option value="qc">Quality Checker (QC)</option>
                <option value="loader">Material Loader</option>
                <option value="uploader">Video Uploader</option>
              </select>
            </div>

            {role === "loader" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Loader Specialty (Sub-Role)</label>
                <select name="subRole" aria-label="Loader Specialty" className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] text-sm">
                  <option value="script_writer">Script Writer</option>
                  <option value="video_audio_generator">Video/Audio Generator</option>
                  <option value="video_editor">Video Editor</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <button disabled={loading} type="submit" className="btn-m w-full disabled:opacity-50">
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
