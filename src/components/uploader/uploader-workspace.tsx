"use client";

import { useState } from "react";
import { Upload, Film } from "lucide-react";
import { UploadForm } from "@/components/uploader/upload-form";
import { UploadsBrowser } from "@/components/uploads/uploads-browser";
import type { HierarchyNode } from "@/lib/hierarchy";
import type { UploadWithUploader, CompletedTaskRow } from "@/lib/video-uploads";
import type { FileUploadWithUploader } from "@/lib/file-uploads";

type Tab = "upload" | "browse";

/**
 * Single-page uploader workspace: one place to both publish a new video and browse every
 * video uploaded across the platform. A lightweight tab switch keeps the two large tools
 * (the hierarchy upload picker and the hierarchy browser) from stacking on top of each other.
 */
export function UploaderWorkspace({
  hierarchies,
  uploads,
  currentUserId,
  isAdmin = false,
  taskCounts,
  completedTasks,
  taskWorkLinks,
  files,
}: {
  hierarchies: HierarchyNode[];
  uploads: UploadWithUploader[];
  currentUserId: string;
  isAdmin?: boolean;
  taskCounts?: Record<string, number>;
  completedTasks?: CompletedTaskRow[];
  taskWorkLinks?: Record<string, string>;
  files?: FileUploadWithUploader[];
}) {
  const [tab, setTab] = useState<Tab>("upload");

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-[1.5px] uppercase transition-colors border-b-2 ${
      active
        ? "text-white border-[#0066b1]"
        : "text-[#7e7e7e] border-transparent hover:text-white"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[#3c3c3c]">
        <button type="button" onClick={() => setTab("upload")} className={tabClass(tab === "upload")}>
          <Upload className="h-4 w-4" />
          Upload Video
        </button>
        <button type="button" onClick={() => setTab("browse")} className={tabClass(tab === "browse")}>
          <Film className="h-4 w-4" />
          All Uploads
        </button>
      </div>

      {tab === "upload" ? (
        <UploadForm hierarchies={hierarchies} />
      ) : (
        <UploadsBrowser
          hierarchies={hierarchies}
          uploads={uploads}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          taskCounts={taskCounts}
          completedTasks={completedTasks}
          taskWorkLinks={taskWorkLinks}
          files={files}
        />
      )}
    </div>
  );
}
