"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { DeleteVideoButton } from "@/components/uploads/delete-video-button";
import { VimeoUploadModal } from "@/components/uploads/vimeo-upload-modal";

type UploadRow = {
  id: string;
  hierarchy_id: string;
  vimeo_link: string | null;
  title: string | null;
  status: string;
  uploaded_by: string;
};

export function DashboardVideoActions({
  upload,
  hierarchyLabel,
  currentUserId,
  isAdmin,
}: {
  upload: UploadRow;
  hierarchyLabel: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [replacing, setReplacing] = useState<UploadRow | null>(null);
  const canManage = isAdmin || upload.uploaded_by === currentUserId;

  return (
    <>
      <div className="flex gap-2 shrink-0">
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
        {canManage && (
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
            <DeleteVideoButton uploadId={upload.id} />
          </>
        )}
      </div>

      {replacing && (
        <VimeoUploadModal
          hierarchyId={replacing.hierarchy_id}
          destinationLabel={hierarchyLabel}
          defaultTitle={replacing.title || ""}
          replaceUploadId={replacing.id}
          onClose={() => {
            setReplacing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
