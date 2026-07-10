"use client";

import { useState } from "react";
import { HierarchyColumns } from "@/components/admin/hierarchy-columns";
import { getBreadcrumb, type HierarchyNode } from "@/lib/hierarchy";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { DeleteVideoButton } from "@/components/uploads/delete-video-button";
import { DeleteUploadButton } from "@/components/uploads/delete-upload-button";
import { VimeoUploadModal } from "@/components/uploads/vimeo-upload-modal";
import { FileUploadModal } from "@/components/uploads/file-upload-modal";
import { deleteFileUpload } from "@/app/uploader/upload/file-actions";
import { RefreshCw, Film, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UploadWithUploader } from "@/lib/video-uploads";
import type { FileUploadWithUploader } from "@/lib/file-uploads";

/**
 * Shared "browse all videos" view used identically by the uploader workspace and the admin
 * uploads page. Navigate the hierarchy; picking any Board/Class/Subject/Chapter lists the
 * videos attached to that exact node — uploaded by anyone. Each row offers a live "View on
 * Vimeo" link and a "Copy Link" button; the uploader who owns a video (or an admin) also gets
 * "Re-upload" (replace) and "Delete".
 */
export function UploadsBrowser({
  hierarchies,
  uploads,
  currentUserId,
  isAdmin = false,
  taskCounts,
  completedTasks,
  taskWorkLinks,
  files = [],
}: {
  hierarchies: HierarchyNode[];
  uploads: UploadWithUploader[];
  currentUserId: string;
  isAdmin?: boolean;
  taskCounts?: Record<string, number>;
  completedTasks?: Array<{
    id: string;
    board_id: string;
    class_id: string;
    subject_id: string;
    chapter_id: string;
    current_status: string;
    created_at: string;
    updated_at: string;
  }>;
  taskWorkLinks?: Record<string, string>;
  files?: FileUploadWithUploader[];
}) {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [replacing, setReplacing] = useState<UploadWithUploader | null>(null);
  const [replacingFile, setReplacingFile] = useState<FileUploadWithUploader | null>(null);

  const videosHere = selectedNode ? uploads.filter((u) => u.hierarchy_id === selectedNode.id) : [];
  const filesHere = selectedNode ? files.filter((f) => f.hierarchy_id === selectedNode.id) : [];

  const tasksHere = selectedNode && completedTasks
    ? completedTasks.filter((t) => {
        const map: Record<string, string> = {
          board: t.board_id,
          class: t.class_id,
          subject: t.subject_id,
          chapter: t.chapter_id,
        };
        return map[selectedNode.type] === selectedNode.id;
      })
    : [];

  const canManage = (upload: UploadWithUploader) => isAdmin || upload.uploaded_by === currentUserId;

  return (
    <div className="space-y-6">
      <HierarchyColumns initialData={hierarchies} readOnly onNavigate={setSelectedNode} taskCounts={taskCounts} />

      <section className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] bg-[#0d0d0d]">
          <h3 className="text-xs font-bold text-white tracking-[2px] uppercase">
            {selectedNode
              ? `Videos in ${getBreadcrumb(selectedNode.id, hierarchies)}`
              : "Select a level above to see its videos"}
          </h3>
        </div>

        {!selectedNode ? (
          <div className="p-12 text-center text-[#7e7e7e]">
            <Film className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p className="text-sm">Navigate the hierarchy above and pick a Board, Class, Subject, or Chapter.</p>
          </div>
        ) : videosHere.length > 0 ? (
          <ul className="divide-y divide-[#3c3c3c]">
            {videosHere.map((upload) => (
              <li
                key={upload.id}
                className="px-5 md:px-6 py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#e6e6e6] text-sm mb-1 truncate">{upload.title || "Untitled"}</p>
                  <p className="text-xs text-[#7e7e7e]">
                    Uploaded by <span className="text-[#0066b1]">{upload.uploader?.full_name || "Unknown"}</span> •{" "}
                    <span
                      className={`uppercase font-bold ${
                        upload.status === "available"
                          ? "text-[#0fa336]"
                          : upload.status === "error"
                          ? "text-[#e22718]"
                          : "text-[#f4b400]"
                      }`}
                    >
                      {upload.status}
                    </span>
                    {upload.duration ? ` • ${Math.round(upload.duration)}s` : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {upload.status === "available" && upload.vimeo_link && (
                    <a
                      href={upload.vimeo_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors"
                    >
                      View on Vimeo
                    </a>
                  )}
                  {upload.status === "available" && (
                    <CopyLinkButton link={upload.vimeo_link} />
                  )}
                  {canManage(upload) && (
                    <>
                      {upload.status !== "available" && (
                        <button
                          type="button"
                          onClick={() => setReplacing(upload)}
                          className="shrink-0 px-4 py-2 border border-[#f4b400] text-xs font-bold text-[#f4b400] tracking-[1px] uppercase hover:bg-[#f4b400]/10 transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-upload
                        </button>
                      )}
                      {upload.status === "available" && (
                        <button
                          type="button"
                          onClick={() => setReplacing(upload)}
                          className="shrink-0 px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Re-upload
                        </button>
                      )}
                      <DeleteVideoButton uploadId={upload.id} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-12 text-center text-[#7e7e7e]">
            <Film className="h-10 w-10 mx-auto mb-4 opacity-40" />
            <p className="text-sm">No videos uploaded here yet.</p>
          </div>
        )}
      </section>

      {selectedNode && (
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] bg-[#0d0d0d]">
            <h3 className="text-xs font-bold text-white tracking-[2px] uppercase">
              Slides &amp; Files ({filesHere.length})
            </h3>
          </div>
          {filesHere.length > 0 ? (
            <ul className="divide-y divide-[#3c3c3c]">
              {filesHere.map((file) => {
                const canManage = isAdmin || file.uploaded_by === currentUserId;
                return (
                  <li
                    key={file.id}
                    className="px-5 md:px-6 py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#e6e6e6] text-sm mb-1 truncate">{file.title || file.file_name || "Untitled"}</p>
                      <p className="text-xs text-[#7e7e7e]">
                        Uploaded by <span className="text-[#0066b1]">{file.uploader?.full_name || "Unknown"}</span> •{" "}
                        <span
                          className={`uppercase font-bold ${
                            file.status === "available"
                              ? "text-[#0fa336]"
                              : file.status === "error"
                              ? "text-[#e22718]"
                              : "text-[#f4b400]"
                          }`}
                        >
                          {file.status}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {file.status === "available" && file.file_url && (
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors"
                        >
                          Open File
                        </a>
                      )}
                      {file.status === "available" && <CopyLinkButton link={file.file_url} />}
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => setReplacingFile(file)}
                            className="shrink-0 px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors flex items-center gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Re-upload
                          </button>
                          <DeleteUploadButton uploadId={file.id} deleteAction={deleteFileUpload} />
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-12 text-center text-[#7e7e7e]">
              <FileText className="h-10 w-10 mx-auto mb-4 opacity-40" />
              <p className="text-sm">No slides or files uploaded here yet.</p>
            </div>
          )}
        </section>
      )}

      {selectedNode && completedTasks && (
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] bg-[#0d0d0d]">
            <h3 className="text-xs font-bold text-white tracking-[2px] uppercase">
              Completed Tasks ({tasksHere.length})
            </h3>
          </div>
          {tasksHere.length > 0 ? (
            <ul className="divide-y divide-[#3c3c3c]">
              {tasksHere.map((task) => (
                <li
                  key={task.id}
                  className="px-5 md:px-6 py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#e6e6e6] text-sm mb-1 truncate">
                      {getBreadcrumb(task.chapter_id, hierarchies)}
                    </p>
                    <p className="text-xs text-[#7e7e7e]">
                      <span className="uppercase font-bold text-[#0fa336]">
                        {task.current_status.replace(/_/g, " ")}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {taskWorkLinks?.[task.id] && (
                      <>
                        <a
                          href={taskWorkLinks[task.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors"
                        >
                          Open Task
                        </a>
                        <CopyLinkButton link={taskWorkLinks[task.id]} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-12 text-center text-[#7e7e7e]">
              <p className="text-sm">No completed tasks for this level.</p>
            </div>
          )}
        </section>
      )}

      {replacing && (
        <VimeoUploadModal
          hierarchyId={replacing.hierarchy_id}
          destinationLabel={getBreadcrumb(replacing.hierarchy_id, hierarchies)}
          defaultTitle={replacing.title || ""}
          replaceUploadId={replacing.id}
          onClose={() => {
            setReplacing(null);
            router.refresh();
          }}
        />
      )}

      {replacingFile && (
        <FileUploadModal
          hierarchyId={replacingFile.hierarchy_id}
          destinationLabel={getBreadcrumb(replacingFile.hierarchy_id, hierarchies)}
          defaultTitle={replacingFile.title || ""}
          replaceUploadId={replacingFile.id}
          onClose={() => {
            setReplacingFile(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
