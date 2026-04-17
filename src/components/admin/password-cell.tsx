"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordCell({ password }: { password: string | null }) {
  const [visible, setVisible] = useState(false);

  if (!password) {
    return <span className="text-mute-gray text-sm">-</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-deep-charcoal font-mono">
        {visible ? password : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="p-1 hover:bg-ice-mist rounded transition-colors text-mute-gray hover:text-deep-charcoal"
        title={visible ? "Hide password" : "Show password"}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
