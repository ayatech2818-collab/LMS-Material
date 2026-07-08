"use client";

import { useState } from "react";
import { HierarchyColumns } from "@/components/admin/hierarchy-columns";
import { getBreadcrumb, type HierarchyNode } from "@/lib/hierarchy";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { Film } from "lucide-react";
import type { UploadWithUploader } from "@/lib/video-uploads";

/**
 * Shared "browse all videos" view used identically by the uploader workspace and the admin
 * uploads page. Navigate the hierarchy; picking any Board/Class/Subject/Chapter lists the
 * videos attached to that exact node — uploaded by anyone. Each row offers a live "View on
 * Vimeo" link and a "Copy Link" button.
 */
export function UploadsBrowser({
  hierarchies,
  uploads,
}: {
  hierarchies: HierarchyNode[];
  uploads: UploadWithUploader[];
}) {
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);

  const videosHere = selectedNode ? uploads.filter((u) => u.hierarchy_id === selectedNode.id) : [];

  return (
    <div className="space-y-6">
      <HierarchyColumns initialData={hierarchies} readOnly onNavigate={setSelectedNode} />

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
                <div className="flex gap-2 shrink-0">
                  {upload.vimeo_link && (
                    <a
                      href={upload.vimeo_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border border-[#3c3c3c] text-xs font-bold text-white tracking-[1px] uppercase hover:bg-[#3c3c3c] transition-colors"
                    >
                      View on Vimeo
                    </a>
                  )}
                  <CopyLinkButton link={upload.vimeo_link} />
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
    </div>
  );
}
