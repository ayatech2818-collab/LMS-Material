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
      // Remove any non-digit characters and ensure country code
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
        className="btn-playstation flex items-center gap-2"
      >
        <Plus className="h-5 w-5" />
        Add New User
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-paper-white rounded-[24px] max-w-md w-full p-8 shadow-[0_5px_9px_0_rgba(0,0,0,0.16)] relative">
        <button 
          onClick={() => { setIsOpen(false); setCredentials(null); }}
          aria-label="Close"
          className="absolute top-6 right-6 text-body-gray hover:text-warning-red transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-light text-display-ink mb-6">Create User</h2>

        {credentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-ice-mist border border-[#e5e5e5] rounded-xl">
              <p className="text-sm font-medium text-body-gray mb-2">User Created Successfully!</p>
              <div className="space-y-1 mb-4">
                <p className="text-deep-charcoal font-medium">Email: <span className="font-normal">{credentials.email}</span></p>
                <p className="text-deep-charcoal font-medium">Password: <span className="font-normal">{credentials.password}</span></p>
                {credentials.phone && (
                  <p className="text-deep-charcoal font-medium">Phone: <span className="font-normal">{credentials.phone}</span></p>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={copyCreds}
                  className="btn-playstation flex-1 flex items-center gap-2 justify-center text-sm"
                >
                  <Copy className="h-4 w-4" />
                  Copy Credentials
                </button>
                <button 
                  onClick={shareWhatsApp}
                  className="flex-1 flex items-center gap-2 justify-center py-2.5 px-4 rounded-full bg-[#25D366] text-white font-medium text-sm hover:bg-[#20bd5a] transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Share via WhatsApp
                </button>
              </div>
            </div>
            <button 
              onClick={() => { setIsOpen(false); setCredentials(null); }}
              className="w-full py-3 px-4 rounded-full border-2 border-mute-gray text-deep-charcoal font-medium hover:bg-ice-mist transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-warning-red/10 border border-warning-red text-warning-red text-sm rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-body-gray block">Full Name</label>
              <input name="fullName" required placeholder="Enter full name" className="w-full bg-paper-white border border-mute-gray rounded-[3px] px-4 py-2.5 outline-none focus:ring-2 focus:ring-ps-blue" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-body-gray block">Email Address</label>
              <input type="email" name="email" required placeholder="user@example.com" className="w-full bg-paper-white border border-mute-gray rounded-[3px] px-4 py-2.5 outline-none focus:ring-2 focus:ring-ps-blue" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-body-gray block">Mobile Number</label>
              <div className="flex items-center gap-2">
                <span className="text-body-gray font-medium text-sm px-3 py-2.5 bg-ice-mist border border-mute-gray rounded-[3px]">+91</span>
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="9876543210" 
                  pattern="[0-9]{10}"
                  title="Enter 10-digit mobile number"
                  className="flex-1 bg-paper-white border border-mute-gray rounded-[3px] px-4 py-2.5 outline-none focus:ring-2 focus:ring-ps-blue"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-body-gray block">Primary Role</label>
              <select 
                name="role" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Primary Role"
                className="w-full bg-paper-white border border-mute-gray rounded-[3px] px-4 py-2.5 outline-none focus:ring-2 focus:ring-ps-blue"
              >
                <option value="admin">Administrator</option>
                <option value="qc">Quality Checker (QC)</option>
                <option value="loader">Material Loader</option>
              </select>
            </div>

            {role === "loader" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-body-gray block">Loader Specialty (Sub-Role)</label>
                <select name="subRole" aria-label="Loader Specialty" className="w-full bg-paper-white border border-mute-gray rounded-[3px] px-4 py-2.5 outline-none focus:ring-2 focus:ring-ps-blue">
                  <option value="script_writer">Script Writer</option>
                  <option value="video_audio_generator">Video/Audio Generator</option>
                  <option value="video_editor">Video Editor</option>
                </select>
              </div>
            )}

            <div className="pt-4">
              <button disabled={loading} type="submit" className="btn-playstation w-full">
                {loading ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
