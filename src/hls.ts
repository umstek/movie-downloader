export interface VideoFormat {
  format_id: string;
  format_index: number | null;
  url: string;
  manifest_url: string;
  tbr: number;
  ext: string;
  fps: number | null;
  protocol: string;
  preference: number | null;
  quality: number | null;
  has_drm: boolean;
  width?: number;
  height?: number;
  vbr: number;
  abr: number;
  vcodec: string;
  acodec: string;
  dynamic_range: string | null;
  resolution: string;
  aspect_ratio: number | null;
  http_headers: { [key: string]: string };
  audio_ext?: string;
  video_ext?: string;
  format: string;
}

interface Subtitles {}

export interface VideoInfo {
  id: string;
  title: string;
  timestamp: number;
  formats: VideoFormat[];
  subtitles: Subtitles;
  http_headers: { [key: string]: string };
  hls_aes: object | null;
  duration: number;
  webpage_url: string;
  original_url: string;
  webpage_url_basename: string;
  webpage_url_domain: string;
  extractor: string;
  extractor_key: string;
  playlist: object | null;
  playlist_index: number | null;
  display_id: string;
  fulltitle: string;
  duration_string: string;
  upload_date: string;
  release_year: number | null;
  requested_subtitles: object | null;
  _has_drm: object | null;
  epoch: number;
  requested_downloads: {
    http_headers: { [key: string]: string };
    format_id: string;
    url: string;
    manifest_url: string;
    tbr: number;
    ext: string;
    fps: number;
    protocol: string;
    has_drm: boolean;
    width: number;
    height: number;
    vbr: number;
    abr: number;
    vcodec: string;
    acodec: string;
    dynamic_range: string;
    resolution: string;
    aspect_ratio: number;
    video_ext: string;
    audio_ext: string;
    format: string;
    _filename: string;
    filename: string;
    __write_download_archive: boolean;
  }[];
  format_id: string;
  format_index: number | null;
  url: string;
  manifest_url: string;
  tbr: number;
  ext: string;
  fps: number;
  protocol: string;
  preference: number | null;
  quality: number | null;
  has_drm: boolean;
  width?: number;
  height?: number;
  vbr: number;
  abr: number;
  vcodec: string;
  acodec: string;
  dynamic_range: string | null;
  resolution: string;
  aspect_ratio: number | null;
  video_ext?: string;
  audio_ext?: string;
  format: string;
  _type: string;
  _version: {
    version: string;
    current_git_head: string | null;
    release_git_head: string;
    repository: string;
  };
}
