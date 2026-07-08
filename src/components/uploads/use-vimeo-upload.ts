"use client";

import { useRef, useState, useCallback } from "react";
import { initializeVimeoUpload, finalizeUpload, markUploadError } from "@/app/uploader/upload/actions";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_RETRIES_PER_CHUNK = 3;

export type VimeoUploadStatus = "idle" | "uploading" | "finalizing" | "complete" | "error";

export type VimeoUploadState = {
  status: VimeoUploadStatus;
  progress: number; // 0-100
  speed: number; // bytes per second
  fileName: string;
  fileSize: number;
  vimeoLink?: string;
  uploadId?: string;
  errorMessage?: string;
};

const IDLE: VimeoUploadState = {
  status: "idle",
  progress: 0,
  speed: 0,
  fileName: "",
  fileSize: 0,
};

type StartOpts = {
  file: File;
  hierarchyId: string;
  title: string;
  description?: string;
};

/**
 * Encapsulates the full Vimeo direct-upload flow used by both the uploader form and the
 * loader kanban modal: create the Vimeo video + DB record on the server, stream the file to
 * Vimeo directly from the browser via the TUS PATCH protocol (chunked, with per-chunk retry
 * so a transient blip doesn't orphan the Vimeo object), then finalize the DB record.
 */
export function useVimeoUpload() {
  const [state, setState] = useState<VimeoUploadState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState(IDLE);
  }, []);

  const reset = useCallback(() => {
    setState(IDLE);
  }, []);

  const start = useCallback(async ({ file, hierarchyId, title, description }: StartOpts) => {
    setState({
      status: "uploading",
      progress: 0,
      speed: 0,
      fileName: file.name,
      fileSize: file.size,
    });

    // 1. Initialize on server (creates the Vimeo video + DB record).
    const initResult = await initializeVimeoUpload(hierarchyId, file.size, title, description);

    if (initResult.error || !initResult.uploadLink || !initResult.uploadId) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: initResult.error || "Failed to initialize upload",
      }));
      return;
    }

    const { uploadLink, uploadId, vimeoLink } = initResult;

    // 2. Upload directly to Vimeo using the TUS protocol.
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let offset = 0;
      const startTime = Date.now();

      while (offset < file.size) {
        if (controller.signal.aborted) {
          await markUploadError(uploadId);
          return;
        }

        const end = Math.min(offset + CHUNK_SIZE, file.size);
        const chunk = file.slice(offset, end);

        // A transient network blip shouldn't abort the whole upload (and orphan the Vimeo
        // video object) — retry this one chunk a few times before giving up.
        let resp: Response | undefined;
        let lastError: unknown;
        for (let attempt = 1; attempt <= MAX_RETRIES_PER_CHUNK; attempt++) {
          try {
            resp = await fetch(uploadLink, {
              method: "PATCH",
              headers: {
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": String(offset),
                "Content-Type": "application/offset+octet-stream",
              },
              body: chunk,
              signal: controller.signal,
            });
            if (resp.ok) break;
            lastError = new Error(`Upload chunk failed: ${resp.status}`);
          } catch (err) {
            if (controller.signal.aborted) throw err;
            lastError = err;
          }
          if (attempt < MAX_RETRIES_PER_CHUNK) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }

        if (!resp || !resp.ok) {
          throw lastError instanceof Error ? lastError : new Error("Upload chunk failed");
        }

        const newOffset = parseInt(resp.headers.get("Upload-Offset") || String(end), 10);
        offset = newOffset;

        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? offset / elapsed : 0;
        const progress = (offset / file.size) * 100;

        setState((prev) => ({ ...prev, progress, speed }));
      }

      // 3. Finalize.
      setState((prev) => ({ ...prev, status: "finalizing", progress: 100 }));

      const finalResult = await finalizeUpload(uploadId);
      if (finalResult.error) {
        setState((prev) => ({ ...prev, status: "error", errorMessage: finalResult.error }));
        return;
      }

      setState((prev) => ({
        ...prev,
        status: "complete",
        uploadId,
        vimeoLink: vimeoLink || undefined,
      }));
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Upload error:", msg);
      await markUploadError(uploadId);
      setState((prev) => ({ ...prev, status: "error", errorMessage: msg }));
    }
  }, []);

  return { state, start, cancel, reset };
}
