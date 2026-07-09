const VIMEO_API_BASE = "https://api.vimeo.com";

export type VimeoVideoInfo = {
  status: "processing" | "available" | "error";
  duration: number | null;
  downloadUrl: string | null;
};

type VimeoDownloadEntry = {
  quality?: string;
  link?: string;
  size?: number;
};

function mapVimeoStatus(vimeoStatus: unknown): "processing" | "available" | "error" {
  if (vimeoStatus === "available") return "available";
  if (typeof vimeoStatus === "string" && (vimeoStatus.includes("error") || vimeoStatus === "quota_exceeded" || vimeoStatus === "unavailable")) {
    return "error";
  }
  return "processing";
}

/**
 * Fetches a video's real transcode status, duration, and best available download link
 * directly from Vimeo. Download links expire in 24h, so this must be called fresh at
 * request time rather than cached.
 */
export async function getVimeoVideoInfo(vimeoVideoId: string): Promise<VimeoVideoInfo> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) throw new Error("Vimeo access token not configured");

  const response = await fetch(`${VIMEO_API_BASE}/videos/${vimeoVideoId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Vimeo API error: ${response.status}`);
  }

  const data = await response.json();

  const downloads: VimeoDownloadEntry[] = Array.isArray(data.download) ? data.download : [];
  const best =
    downloads.find((d) => d.quality === "source") ??
    downloads.slice().sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0];

  return {
    status: mapVimeoStatus(data.status),
    duration: typeof data.duration === "number" ? data.duration : null,
    downloadUrl: best?.link ?? null,
  };
}
