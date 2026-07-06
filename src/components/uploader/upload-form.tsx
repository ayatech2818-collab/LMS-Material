"use client";

import { useState, useRef, useCallback } from "react";
import { HierarchyColumns } from "@/components/admin/hierarchy-columns";
import { initializeVimeoUpload, finalizeUpload, markUploadError } from "@/app/uploader/upload/actions";
import { UploadProgress } from "@/components/uploader/upload-progress";
import { Upload, CheckCircle2, Film } from "lucide-react";
import { useRouter } from "next/navigation";

type HierarchyNode = {
  id: string;
  type: "board" | "class" | "subject" | "chapter";
  name: string;
  parent_id: string | null;
};

type UploadState = {
  status: "idle" | "uploading" | "finalizing" | "complete" | "error";
  progress: number;
  speed: number;
  fileName: string;
  fileSize: number;
  errorMessage?: string;
  vimeoLink?: string;
};

export function UploadForm({ hierarchies }: { hierarchies: HierarchyNode[] }) {
  const router = useRouter();
  const [selectedChapter, setSelectedChapter] = useState<{ id: string; name: string } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    speed: 0,
    fileName: "",
    fileSize: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChapterSelect = useCallback((chapterId: string, chapterName: string) => {
    setSelectedChapter({ id: chapterId, name: chapterName });
    setTitle(chapterName);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title && selectedChapter) {
        setTitle(selectedChapter.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedChapter || !file) return;

    setUploadState({
      status: "uploading",
      progress: 0,
      speed: 0,
      fileName: file.name,
      fileSize: file.size,
    });

    // 1. Initialize on server (creates Vimeo video + DB record)
    const initResult = await initializeVimeoUpload(
      selectedChapter.id,
      file.size,
      title || selectedChapter.name,
      description || undefined
    );

    if (initResult.error || !initResult.uploadLink || !initResult.uploadId) {
      setUploadState(prev => ({
        ...prev,
        status: "error",
        errorMessage: initResult.error || "Failed to initialize upload",
      }));
      return;
    }

    const { uploadLink, uploadId, vimeoLink } = initResult;

    // 2. Upload file directly to Vimeo using TUS protocol
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let offset = 0;
      const startTime = Date.now();

      while (offset < file.size) {
        if (controller.signal.aborted) {
          await markUploadError(uploadId);
          return;
        }

        const end = Math.min(offset + chunkSize, file.size);
        const chunk = file.slice(offset, end);

        const resp = await fetch(uploadLink, {
          method: "PATCH",
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": String(offset),
            "Content-Type": "application/offset+octet-stream",
          },
          body: chunk,
          signal: controller.signal,
        });

        if (!resp.ok) {
          throw new Error(`Upload chunk failed: ${resp.status}`);
        }

        const newOffset = parseInt(resp.headers.get("Upload-Offset") || String(end), 10);
        offset = newOffset;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? offset / elapsed : 0;
        const progress = (offset / file.size) * 100;

        setUploadState(prev => ({
          ...prev,
          progress,
          speed,
        }));
      }

      // 3. Finalize
      setUploadState(prev => ({ ...prev, status: "finalizing", progress: 100 }));

      const finalResult = await finalizeUpload(uploadId);
      if (finalResult.error) {
        setUploadState(prev => ({
          ...prev,
          status: "error",
          errorMessage: finalResult.error,
        }));
        return;
      }

      setUploadState(prev => ({
        ...prev,
        status: "complete",
        vimeoLink: vimeoLink || undefined,
      }));

    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Upload error:", msg);
      await markUploadError(uploadId);
      setUploadState(prev => ({
        ...prev,
        status: "error",
        errorMessage: msg,
      }));
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setUploadState({
      status: "idle",
      progress: 0,
      speed: 0,
      fileName: "",
      fileSize: 0,
    });
  };

  const handleReset = () => {
    setFile(null);
    setTitle(selectedChapter?.name || "");
    setDescription("");
    setUploadState({
      status: "idle",
      progress: 0,
      speed: 0,
      fileName: "",
      fileSize: 0,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Hierarchy Picker */}
      <section>
        <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-2">
          Step 1 — Select Chapter
        </h2>
        <p className="text-[#bbbbbb] text-sm mb-4">
          Navigate to the exact chapter you want to upload a video for.
        </p>
        <HierarchyColumns
          initialData={hierarchies}
          readOnly
          onChapterSelect={handleChapterSelect}
        />
        {selectedChapter && (
          <div className="mt-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0fa336]" />
            <span className="text-sm text-[#0fa336] font-bold uppercase tracking-[1px]">
              Selected: {selectedChapter.name}
            </span>
          </div>
        )}
      </section>

      {/* Step 2: Upload Form (only visible after chapter selection) */}
      {selectedChapter && (
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
              disabled={uploadState.status !== "idle"}
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
              disabled={uploadState.status !== "idle"}
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
                disabled={uploadState.status !== "idle"}
              />
            </div>
            {file && (
              <p className="text-xs text-[#7e7e7e]">
                {file.name} — {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
          </div>

          {/* Upload Progress or Upload Button */}
          {uploadState.status !== "idle" ? (
            <div className="space-y-4">
              <UploadProgress
                fileName={uploadState.fileName}
                fileSize={uploadState.fileSize}
                progress={uploadState.progress}
                speed={uploadState.speed}
                onCancel={handleCancel}
                status={uploadState.status === "finalizing" ? "finalizing" : uploadState.status === "complete" ? "complete" : uploadState.status === "error" ? "error" : "uploading"}
                errorMessage={uploadState.errorMessage}
              />
              {uploadState.status === "complete" && (
                <div className="flex gap-3">
                  {uploadState.vimeoLink && (
                    <a
                      href={uploadState.vimeoLink}
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
              )}
              {uploadState.status === "error" && (
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
