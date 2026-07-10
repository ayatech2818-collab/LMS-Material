import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Server-only. Reads AWS creds from the environment (see .env). The bucket stays private:
// files are uploaded through our own API and served via short-lived presigned GET URLs, so no
// public-read policy or CORS configuration is required — only valid IAM credentials.
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

/** Upload bytes to the bucket (server-side; the browser never talks to S3 directly). */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

/** A short-lived presigned GET URL for a private object (default 1 hour). */
export async function presignGetUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
