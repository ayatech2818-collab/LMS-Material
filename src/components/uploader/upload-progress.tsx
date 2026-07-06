"use client";

import { useState, useRef } from "react";

type UploadProgressProps = {
  fileName: string;
  fileSize: number;
  progress: number;
  speed: number; // bytes per second
  onCancel: () => void;
  status: "uploading" | "finalizing" | "complete" | "error";
  errorMessage?: string;
};

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  speed,
  onCancel,
  status,
  errorMessage,
}: UploadProgressProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const pct = Math.min(Math.round(progress), 100);

  return (
    <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 space-y-4">
      {/* File info */}
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#e6e6e6] truncate">{fileName}</p>
          <p className="text-xs text-[#7e7e7e] mt-1">{formatSize(fileSize)}</p>
        </div>
        {status === "uploading" && (
          <button
            onClick={onCancel}
            className="shrink-0 px-3 py-1.5 border border-[#e22718] text-[#e22718] text-xs font-bold uppercase tracking-[1px] hover:bg-[#e22718]/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full h-2 bg-[#3c3c3c] overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              status === "error" ? "bg-[#e22718]" :
              status === "complete" ? "bg-[#0fa336]" :
              "bg-[#0066b1]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#7e7e7e]">
            {status === "uploading" && speed > 0 && formatSpeed(speed)}
            {status === "finalizing" && "Finalizing..."}
            {status === "complete" && (
              <span className="text-[#0fa336] font-bold uppercase tracking-[1px]">Upload Complete</span>
            )}
            {status === "error" && (
              <span className="text-[#e22718] font-bold">{errorMessage || "Upload failed"}</span>
            )}
          </span>
          <span className={`text-xs font-bold ${
            status === "error" ? "text-[#e22718]" :
            status === "complete" ? "text-[#0fa336]" :
            "text-[#0066b1]"
          }`}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
