"use client";

import { useRef, useState, useCallback } from "react";

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
 * Uploads a file by POSTing it to our own API route (same-origin, so no S3 CORS is needed).
 * The server stores it in the private bucket and records it; the file is then served via the
 * signed-redirect route. XMLHttpRequest is used so we get real upload progress.
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

  const start = useCallback(({ file, hierarchyId, title }: StartOpts) => {
    setState({
      status: "uploading",
      progress: 0,
      speed: 0,
      fileName: file.name,
      fileSize: file.size,
    });

    const form = new FormData();
    form.append("file", file);
    form.append("hierarchyId", hierarchyId);
    if (title) form.append("title", title);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    const startTime = Date.now();

    xhr.open("POST", "/api/files/upload", true);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? e.loaded / elapsed : 0;
      const progress = (e.loaded / e.total) * 100;
      // Bytes are sent; the server still has to hand off to S3 afterwards.
      setState((prev) => ({
        ...prev,
        progress: progress >= 100 ? 100 : progress,
        speed,
        status: progress >= 100 ? "finalizing" : "uploading",
      }));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let body: { id?: string; fileUrl?: string } = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* ignore */
        }
        setState((prev) => ({
          ...prev,
          status: "complete",
          progress: 100,
          uploadId: body.id,
          fileUrl: body.fileUrl,
        }));
      } else {
        let message = `Upload failed: ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.error) message = body.error;
        } catch {
          /* ignore */
        }
        setState((prev) => ({ ...prev, status: "error", errorMessage: message }));
      }
    };

    xhr.onerror = () => {
      setState((prev) => ({ ...prev, status: "error", errorMessage: "Network error during upload" }));
    };

    xhr.send(form);
  }, []);

  return { state, start, cancel, reset };
}
