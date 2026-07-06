export function formatSubRole(subRole: string | null | undefined): string {
  if (!subRole) return "-";
  switch (subRole) {
    case "script_writer":
      return "Script Writer & Presentation Creator";
    case "video_audio_generator":
      return "Video & Audio Generator";
    case "video_editor":
      return "Video Editor";
    default:
      return subRole.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
}

export function formatRole(role: string): string {
  switch (role) {
    case "admin": return "Administrator";
    case "qc": return "Quality Checker";
    case "loader": return "Material Loader";
    case "uploader": return "Video Uploader";
    default: return role;
  }
}
