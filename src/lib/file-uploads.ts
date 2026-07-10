/** A row from the file_uploads table (slide/document files stored in S3). */
export type FileUploadRow = {
  id: string;
  hierarchy_id: string;
  uploaded_by: string;
  s3_key: string;
  file_url: string | null;
  file_name: string | null;
  content_type: string | null;
  file_size: number | null;
  title: string | null;
  status: string;
  created_at: string;
};

/** A file_uploads row joined with the uploader's display name (uploader:uploaded_by(full_name)). */
export type FileUploadWithUploader = FileUploadRow & { uploader: { full_name: string } | null };
