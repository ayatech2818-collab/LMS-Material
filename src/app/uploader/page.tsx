import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyLinkButton } from "@/components/uploads/copy-link-button";
import { Upload, Film, Loader2 } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function UploaderDashboard() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // Platform-wide upload stats (every uploader + loader-published video).
  const { count: totalUploads } = await adminClient
    .from("video_uploads")
    .select("*", { count: "exact", head: true });

  const { count: processingCount } = await adminClient
    .from("video_uploads")
    .select("*", { count: "exact", head: true })
    .in("status", ["uploading", "processing"]);

  const { count: availableCount } = await adminClient
    .from("video_uploads")
    .select("*", { count: "exact", head: true })
    .eq("status", "available");

  // Recent uploads across everyone.
  const { data: recentUploads } = await adminClient
    .from("video_uploads")
    .select(`
      *,
      chapter:hierarchies(name),
      uploader:uploaded_by(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(5);

  type RecentUpload = {
    id: string;
    title: string | null;
    status: string;
    vimeo_link: string | null;
    chapter: { name: string } | null;
    uploader: { full_name: string } | null;
  };
  const recent = (recentUploads || []) as unknown as RecentUpload[];

  return (
    <>
      <Header title="Uploader Dashboard" />
      <div className="max-w-[1920px] mx-auto space-y-6 md:space-y-8">

        {/* Welcome Banner */}
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
          <div className="m-stripe mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="text-[#7e7e7e] text-xs tracking-[2px] uppercase mb-2">Welcome back</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-[1px] uppercase mb-3">
                {profile?.full_name}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 border border-[#0066b1] text-[#0066b1] text-xs font-bold tracking-[1px] uppercase">
                  Video Uploader
                </span>
              </div>
            </div>
            <Link
              href="/uploader/upload"
              className="btn-m flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Video
            </Link>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Total Uploads</h3>
              <div className="p-2 bg-[#0066b1]/10 border border-[#0066b1]/20">
                <Film className="h-5 w-5 text-[#0066b1]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-white leading-none">{totalUploads || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Processing</h3>
              <div className="p-2 bg-[#f4b400]/10 border border-[#f4b400]/20">
                <Loader2 className="h-5 w-5 text-[#f4b400]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-[#f4b400] leading-none">{processingCount || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Available</h3>
              <div className="p-2 bg-[#0fa336]/10 border border-[#0fa336]/20">
                <Upload className="h-5 w-5 text-[#0fa336]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-[#0fa336] leading-none">{availableCount || 0}</p>
          </div>
        </section>

        {/* Recent Uploads */}
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#0d0d0d]">
            <h3 className="text-xs font-bold text-white tracking-[2px] uppercase">Recent Uploads</h3>
            <Link href="/uploader/upload" className="text-xs font-bold text-[#0066b1] hover:text-[#1c69d4] tracking-[1px] uppercase transition-colors">
              View All →
            </Link>
          </div>
          <div>
            {recent.length > 0 ? (
              <ul className="divide-y divide-[#3c3c3c]">
                {recent.map((upload) => (
                  <li key={upload.id} className="px-5 md:px-6 py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#e6e6e6] text-sm mb-1 truncate">{upload.title || "Untitled"}</p>
                      <p className="text-xs text-[#7e7e7e]">
                        {upload.chapter?.name || "Unknown"} • by{" "}
                        <span className="text-[#0066b1]">{upload.uploader?.full_name || "Unknown"}</span> •{" "}
                        <span className={`uppercase font-bold ${
                          upload.status === "available" ? "text-[#0fa336]" :
                          upload.status === "error" ? "text-[#e22718]" :
                          "text-[#f4b400]"
                        }`}>{upload.status}</span>
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
                <p className="text-sm">No uploads yet. Start by uploading your first video!</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </>
  );
}
