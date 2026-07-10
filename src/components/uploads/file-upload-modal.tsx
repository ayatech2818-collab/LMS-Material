"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { UploadProgress } from "@/components/uploader/upload-progress";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { useFileUpload } from "@/components/uploads/use-file-upload";
import { deleteFileUpload } from "@/app/uploader/upload/file-actions";

const ACCEPT = ".pdf,.ppt,.pptx,.key,.odp,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*";

type FileUploadModalProps = {
  /** Hierarchy node the file attaches to (for the kanban this is the task's chapter_id). */
  hierarchyId: string;
  /** Human-readable destination, shown as the sub-heading. */
  destinationLabel?: string;
  /** Prefilled title (defaults to the destination name). */
  defaultTitle?: string;
  /** When set, this existing file is deleted once the new one finishes (re-upload/replace). */
  replaceUploadId?: string | null;
  onClose: () => void;
};

export function FileUploadModal({ hierarchyId, destinationLabel, defaultTitle, replaceUploadId, onClose }: FileUploadModalProps) {
  const { state, start, cancel, reset } = useFileUpload();
  const [title, setTitle] = useState(defaultTitle || destinationLabel || "");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replacedRef = useRef(false);

  const isReplace = !!replaceUploadId;
  const isBusy = state.status === "uploading" || state.status === "finalizing";

  // Replace mode: once the new file is safely uploaded, remove the old one it supersedes.
  useEffect(() => {
    if (state.status === "complete" && replaceUploadId && !replacedRef.current) {
      replacedRef.current = true;
      deleteFileUpload(replaceUploadId).then((res) => {
        if (res.error) toast.error(`Uploaded the new file, but removing the old one failed: ${res.error}`);
      });
    }
  }, [state.status, replaceUploadId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = () => {
    if (!file) return;
    start({ file, hierarchyId, title: title || file.name });
  };

  const handleReset = () => {
    setFile(null);
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
            <h2 className="text-base font-bold text-white tracking-[1.5px] uppercase mb-1">
              {isReplace ? "Re-upload File" : "Upload Slides / File"}
            </h2>
            {destinationLabel && (
              <p className="text-[#7e7e7e] text-xs uppercase tracking-[1px]">{destinationLabel}</p>
            )}
            {isReplace && (
              <p className="text-[#f4b400] text-[10px] uppercase tracking-[1px] mt-1">
                Replaces the current file once the new one finishes uploading
              </p>
            )}
          </div>

          {state.status === "idle" ? (
            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title"
                  className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm"
                />
              </div>

              {/* File */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
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
                {isReplace ? "Upload Replacement" : "Upload File"}
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
                  {state.fileUrl && (
                    <div className="bg-[#0d0d0d] border border-[#3c3c3c] p-3 flex items-center gap-2">
                      <input
                        readOnly
                        value={state.fileUrl}
                        className="flex-1 bg-transparent text-xs text-[#e6e6e6] outline-none truncate"
                        aria-label="File link"
                      />
                      <CopyLinkButton link={state.fileUrl} />
                    </div>
                  )}
                  <div className="flex gap-3">
                    {state.fileUrl && (
                      <a
                        href={state.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-m flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open File
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

          {!isBusy && (
            <div className="mt-6 pt-4 border-t border-[#3c3c3c] flex justify-end">
              <button
                onClick={onClose}
                className="text-xs font-bold text-[#7e7e7e] hover:text-white tracking-[1.5px] uppercase transition-colors flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
