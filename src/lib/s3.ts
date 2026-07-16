import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Server-only. Reads AWS creds from the environment (see .env). The bucket stays private: our
// server only ever mints presigned PUT/GET URLs (uploads and downloads happen directly between
// the browser and S3), so the bucket needs a CORS policy allowing PUT from our app's origin.
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

/** A short-lived presigned GET URL for a private object (default 1 hour). */
export async function presignGetUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

/**
 * A short-lived presigned PUT URL so the browser can upload straight to S3, bypassing our
 * server's request body entirely (Vercel serverless functions cap that at 4.5 MB). The caller
 * must send the exact same Content-Type header on the PUT, or S3 rejects the signature.
 */
export async function presignPutUrl(key: string, contentType: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
