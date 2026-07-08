"use client";

import { useRef, useState } from "react";
import { X, Upload, Film, ExternalLink, Link as LinkIcon } from "lucide-react";
import { UploadProgress } from "@/components/uploader/upload-progress";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { useVimeoUpload } from "@/components/uploads/use-vimeo-upload";

type VimeoUploadModalProps = {
  /** Hierarchy node the video attaches to (for the kanban this is the task's chapter_id). */
  hierarchyId: string;
  /** Human-readable destination, shown as the sub-heading. */
  destinationLabel?: string;
  /** Prefilled video title (defaults to the destination name). */
  defaultTitle?: string;
  /** The work link submitted for the task — the source material to publish. */
  taskWorkLink?: string | null;
  onClose: () => void;
};

export function VimeoUploadModal({ hierarchyId, destinationLabel, defaultTitle, taskWorkLink, onClose }: VimeoUploadModalProps) {
  const { state, start, cancel, reset } = useVimeoUpload();
  const [title, setTitle] = useState(defaultTitle || destinationLabel || "");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = state.status === "uploading" || state.status === "finalizing";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = () => {
    if (!file) return;
    start({ file, hierarchyId, title: title || destinationLabel || file.name, description: description || undefined });
  };

  const handleReset = () => {
    setFile(null);
    setDescription("");
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-[#3c3c3c] w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
        <div className="m-stripe" />

        <div className="p-6 md:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-8 right-6 p-1.5 rounded-full text-[#7e7e7e] hover:bg-[#3c3c3c] hover:text-white transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 pr-8">
            <h2 className="text-base font-bold text-white tracking-[1.5px] uppercase mb-1">Upload to Vimeo</h2>
            {destinationLabel && (
              <p className="text-[#7e7e7e] text-xs uppercase tracking-[1px]">{destinationLabel}</p>
            )}
          </div>

          {/* Source material submitted for this task, so the editor can reference it here. */}
          {taskWorkLink && (
            <div className="mb-6 bg-[#0d0d0d] border border-[#3c3c3c] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <LinkIcon className="h-3 w-3 text-[#7e7e7e]" />
                <span className="text-[10px] font-bold text-[#7e7e7e] uppercase tracking-[1.5px]">Task Work Link</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={taskWorkLink}
                  className="flex-1 bg-transparent text-xs text-[#e6e6e6] outline-none truncate"
                  aria-label="Task work link"
                />
                <a
                  href={taskWorkLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-8 h-8 flex items-center justify-center border border-[#0066b1]/30 text-[#0066b1] hover:bg-[#0066b1]/10 transition-colors"
                  title="Open task work link"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <CopyLinkButton link={taskWorkLink} />
              </div>
            </div>
          )}

          {state.status === "idle" ? (
            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Video Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">
                  Description <span className="text-[#7e7e7e]">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter video description..."
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm resize-none"
                />
              </div>

              {/* File */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Video File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 text-[#e6e6e6] text-sm file:mr-4 file:py-1 file:px-3 file:border file:border-[#3c3c3c] file:text-[10px] file:font-bold file:uppercase file:tracking-[1px] file:bg-[#262626] file:text-[#e6e6e6] file:cursor-pointer hover:file:bg-[#3c3c3c] file:transition-colors"
                />
                {file && (
                  <p className="text-xs text-[#7e7e7e]">
                    {file.name} — {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file}
                className="btn-m flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Upload className="h-4 w-4" />
                Upload to Vimeo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <UploadProgress
                fileName={state.fileName}
                fileSize={state.fileSize}
                progress={state.progress}
                speed={state.speed}
                onCancel={cancel}
                status={
                  state.status === "finalizing"
                    ? "finalizing"
                    : state.status === "complete"
                    ? "complete"
                    : state.status === "error"
                    ? "error"
                    : "uploading"
                }
                errorMessage={state.errorMessage}
              />

              {state.status === "complete" && (
                <>
                  {state.vimeoLink && (
                    <div className="bg-[#0d0d0d] border border-[#3c3c3c] p-3 flex items-center gap-2">
                      <input
                        readOnly
                        value={state.vimeoLink}
                        className="flex-1 bg-transparent text-xs text-[#e6e6e6] outline-none truncate"
                        aria-label="Vimeo link"
                      />
                      <CopyLinkButton link={state.vimeoLink} />
                    </div>
                  )}
                  <div className="flex gap-3">
                    {state.vimeoLink && (
                      <a
                        href={state.vimeoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-m flex items-center gap-2"
                      >
                        <Film className="h-4 w-4" />
                        View on Vimeo
                      </a>
                    )}
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 border border-[#3c3c3c] text-[#bbbbbb] font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#262626] transition-colors"
                    >
                      Upload Another
                    </button>
                  </div>
                </>
              )}

              {state.status === "error" && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 border border-[#3c3c3c] text-[#bbbbbb] font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#262626] transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* Footer: only allow closing when not mid-transfer to avoid orphaning. */}
          {!isBusy && (
            <div className="mt-6 pt-4 border-t border-[#3c3c3c] flex justify-end">
              <button
                onClick={onClose}
                className="text-xs font-bold text-[#7e7e7e] hover:text-white tracking-[1.5px] uppercase transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
