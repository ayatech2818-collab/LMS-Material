"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  // Fallback for non-secure contexts (e.g. plain-http on a LAN IP) where the
  // async Clipboard API is unavailable.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyLinkButton({
  link,
  resolveLink,
  disabled,
  className,
}: {
  /** A ready link to copy. App-relative paths (starting with "/") are made absolute. */
  link?: string | null;
  /** Alternatively, fetch the link on click (e.g. a freshly-signed S3 URL). Takes precedence. */
  resolveLink?: () => Promise<string | null>;
  disabled?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    let target: string | null = link ?? null;
    if (resolveLink) {
      setLoading(true);
      try {
        target = await resolveLink();
      } finally {
        setLoading(false);
      }
    }
    if (!target) {
      toast.error("No link available yet.");
      return;
    }
    const absolute = target.startsWith("/") ? `${window.location.origin}${target}` : target;
    const ok = await copyToClipboard(absolute);
    if (ok) {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled || loading || (!link && !resolveLink)}
      className={
        className ??
        "shrink-0 px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
      }
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : copied ? (
        <Check className="h-3.5 w-3.5 text-[#0fa336]" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy Link"}
    </button>
  );
}
