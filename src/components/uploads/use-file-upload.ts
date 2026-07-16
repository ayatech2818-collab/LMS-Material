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

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function putToS3(url: string, file: File, contentType: string, onProgress: (loaded: number, total: number) => void, xhrRef: React.MutableRefObject<XMLHttpRequest | null>) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload to storage failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading to storage"));
    xhr.onabort = () => reject(new Error("cancelled"));
    xhr.send(file);
  });
}

/**
 * Uploads a file directly to S3 via a presigned URL, then records the finished object with our
 * server. The file bytes never pass through our own API route, so there's no serverless
 * request-body size limit to hit — only S3's own (multi-GB) limits apply.
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

    const startTime = Date.now();
    const contentType = file.type || "application/octet-stream";

    try {
      const urlRes = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hierarchyId, fileName: file.name, contentType }),
      });
      if (!urlRes.ok) {
        const body = await readJson(urlRes);
        throw new Error(body.error || `Could not start upload: ${urlRes.status}`);
      }
      const { id, key, url } = await urlRes.json();

      await putToS3(url, file, contentType, (loaded, total) => {
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? loaded / elapsed : 0;
        const progress = (loaded / total) * 100;
        setState((prev) => ({
          ...prev,
          progress: progress >= 100 ? 100 : progress,
          speed,
          status: progress >= 100 ? "finalizing" : "uploading",
        }));
      }, xhrRef);

      setState((prev) => ({ ...prev, status: "finalizing", progress: 100 }));

      const completeRes = await fetch("/api/files/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          hierarchyId,
          s3Key: key,
          fileName: file.name,
          contentType,
          fileSize: file.size,
          title,
        }),
      });
      if (!completeRes.ok) {
        const body = await readJson(completeRes);
        throw new Error(body.error || `Could not finalize upload: ${completeRes.status}`);
      }
      const { fileUrl } = await completeRes.json();

      setState((prev) => ({ ...prev, status: "complete", progress: 100, uploadId: id, fileUrl }));
    } catch (err) {
      const message = err instanceof Error && err.message !== "cancelled" ? err.message : undefined;
      if (message) setState((prev) => ({ ...prev, status: "error", errorMessage: message }));
    }
  }, []);

  return { state, start, cancel, reset };
}
