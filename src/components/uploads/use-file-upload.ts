"use client";

import { useRef, useState, useCallback } from "react";
import { initializeFileUpload, finalizeFileUpload, markFileUploadError } from "@/app/uploader/upload/file-actions";

export type FileUploadStatus = "idle" | "uploading" | "finalizing" | "complete" | "error";

export type FileUploadState = {
  status: FileUploadStatus;
  progress: number; // 0-100
  speed: number; // bytes per second
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  uploadId?: string;
  errorMessage?: string;
};

const IDLE: FileUploadState = {
  status: "idle",
  progress: 0,
  speed: 0,
  fileName: "",
  fileSize: 0,
};

type StartOpts = {
  file: File;
  hierarchyId: string;
  title?: string;
};

/**
 * Uploads an arbitrary file directly to S3 via a presigned PUT: create the DB record on the
 * server, PUT the file straight to S3 from the browser (XMLHttpRequest so we get real upload
 * progress), then finalize the record. The S3 signature covers Content-Type, so we send the
 * exact type the server signed with.
 */
export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>(IDLE);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const cancel = useCallback(() => {
    xhrRef.current?.abort();
    setState(IDLE);
  }, []);

  const reset = useCallback(() => {
    setState(IDLE);
  }, []);

  const start = useCallback(async ({ file, hierarchyId, title }: StartOpts) => {
    setState({
      status: "uploading",
      progress: 0,
      speed: 0,
      fileName: file.name,
      fileSize: file.size,
    });

    const contentType = file.type || "application/octet-stream";

    // 1. Create the record + get a presigned PUT URL.
    const initResult = await initializeFileUpload(hierarchyId, file.name, contentType, file.size, title);
    if (initResult.error || !initResult.uploadUrl || !initResult.uploadId) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: initResult.error || "Failed to initialize upload",
      }));
      return;
    }

    const { uploadUrl, uploadId, fileUrl } = initResult;

    // 2. PUT the file straight to S3.
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        const startTime = Date.now();

        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", initResult.contentType || contentType);

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? e.loaded / elapsed : 0;
          const progress = (e.loaded / e.total) * 100;
          setState((prev) => ({ ...prev, progress, speed }));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

        xhr.send(file);
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        await markFileUploadError(uploadId);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error("File upload error:", msg);
      await markFileUploadError(uploadId);
      setState((prev) => ({ ...prev, status: "error", errorMessage: msg }));
      return;
    }

    // 3. Finalize.
    setState((prev) => ({ ...prev, status: "finalizing", progress: 100 }));

    const finalResult = await finalizeFileUpload(uploadId);
    if (finalResult.error) {
      setState((prev) => ({ ...prev, status: "error", errorMessage: finalResult.error }));
      return;
    }

    setState((prev) => ({
      ...prev,
      status: "complete",
      uploadId,
      fileUrl: fileUrl || undefined,
    }));
  }, []);

  return { state, start, cancel, reset };
}
