"use client";

import { useState, useRef, useCallback } from "react";
import { HierarchyColumns } from "@/components/admin/hierarchy-columns";
import { UploadProgress } from "@/components/uploader/upload-progress";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { useVimeoUpload } from "@/components/uploads/use-vimeo-upload";
import { Upload, CheckCircle2, Film } from "lucide-react";
import type { HierarchyNode } from "@/lib/hierarchy";
import { getBreadcrumb } from "@/lib/hierarchy";

export function UploadForm({ hierarchies }: { hierarchies: HierarchyNode[] }) {
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state, start, cancel, reset } = useVimeoUpload();

  const handleNodeSelect = useCallback((node: HierarchyNode) => {
    setSelectedNode(node);
    setTitle(node.name);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title && selectedNode) {
        setTitle(selectedNode.name);
      }
    }
  };

  const handleUpload = () => {
    if (!selectedNode || !file) return;
    start({
      file,
      hierarchyId: selectedNode.id,
      title: title || selectedNode.name,
      description: description || undefined,
    });
  };

  const handleCancel = () => {
    cancel();
  };

  const handleReset = () => {
    setFile(null);
    setTitle(selectedNode?.name || "");
    setDescription("");
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isIdle = state.status === "idle";

  return (
    <div className="space-y-8">
      {/* Step 1: Hierarchy Picker */}
      <section>
        <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-2">
          Step 1 — Select Where to Upload
        </h2>
        <p className="text-[#bbbbbb] text-sm mb-4">
          Navigate the hierarchy and click the upload icon on a Board, Class, Subject, or
          Chapter to attach a video there.
        </p>
        <HierarchyColumns
          initialData={hierarchies}
          readOnly
          onSelectNode={handleNodeSelect}
        />
        {selectedNode && (
          <div className="mt-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0fa336]" />
            <span className="text-sm text-[#0fa336] font-bold uppercase tracking-[1px]">
              Selected: {getBreadcrumb(selectedNode.id, hierarchies)}
            </span>
          </div>
        )}
      </section>

      {/* Step 2: Upload Form (only visible after a node is selected) */}
      {selectedNode && (
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">
              Step 2 — Upload Video
            </h2>
            <p className="text-[#bbbbbb] text-sm">
              Provide video details and select the file to upload.
            </p>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 outline-none focus:border-[#0066b1] text-[#e6e6e6] placeholder:text-[#7e7e7e] text-sm"
              disabled={!isIdle}
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
              disabled={!isIdle}
            />
          </div>

          {/* File Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#bbbbbb] uppercase tracking-[1.5px] block">Video File</label>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="w-full bg-[#0d0d0d] border border-[#3c3c3c] px-4 py-2.5 text-[#e6e6e6] text-sm file:mr-4 file:py-1 file:px-3 file:border file:border-[#3c3c3c] file:text-[10px] file:font-bold file:uppercase file:tracking-[1px] file:bg-[#262626] file:text-[#e6e6e6] file:cursor-pointer hover:file:bg-[#3c3c3c] file:transition-colors"
                disabled={!isIdle}
              />
            </div>
            {file && (
              <p className="text-xs text-[#7e7e7e]">
                {file.name} — {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>

          {/* Upload Progress or Upload Button */}
          {!isIdle ? (
            <div className="space-y-4">
              <UploadProgress
                fileName={state.fileName}
                fileSize={state.fileSize}
                progress={state.progress}
                speed={state.speed}
                onCancel={handleCancel}
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
                    <button onClick={handleReset} className="px-6 py-3 border border-[#3c3c3c] text-[#bbbbbb] font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#262626] transition-colors">
                      Upload Another
                    </button>
                  </div>
                </>
              )}
              {state.status === "error" && (
                <button onClick={handleReset} className="px-6 py-3 border border-[#3c3c3c] text-[#bbbbbb] font-bold text-xs tracking-[1.5px] uppercase hover:bg-[#262626] transition-colors">
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!file}
              className="btn-m flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Upload className="h-4 w-4" />
              Upload to Vimeo
            </button>
          )}
        </section>
      )}
    </div>
  );
}
