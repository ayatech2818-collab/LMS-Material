import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Server-only. Reads AWS creds from the environment (see .env). Uploaded objects are served
// from a permanent public URL, so the bucket must grant public read (bucket policy) and allow
// PUT from the app origin via CORS.
const REGION = process.env.AWS_REGION || "";
const BUCKET = process.env.AWS_S3_BUCKET || "";

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return client;
}

export function s3Configured(): boolean {
  return Boolean(REGION && BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

/** Namespaced, collision-proof object key. Filename is sanitized to URL/S3-safe characters. */
export function buildObjectKey(hierarchyId: string, fileName: string): string {
  const safe = (fileName || "file")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-120);
  return `materials/${hierarchyId}/${crypto.randomUUID()}-${safe}`;
}

/**
 * Presigned PUT URL for a direct browser upload (~15 min). The signature covers Content-Type,
 * so the browser must send the exact same Content-Type header when it PUTs.
 */
export async function presignPutUrl(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3(), cmd, { expiresIn: 900 });
}

/** Permanent public URL for an object (works only if the bucket grants public read). */
export function publicObjectUrl(key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encoded}`;
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
