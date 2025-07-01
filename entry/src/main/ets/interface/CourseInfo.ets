export interface CourseInfo {
  id: number;
  coverUrl: ResourceStr | string;
  title: string;
  creator: string;
}
export interface VideoItem {
  index: number;
  name: string;
  videoUrl: string;
}

export interface CourseData {
  title: string;
  description: string;
  list: VideoItem[];
}

export interface VideoProgress {
  videoIndex: number;
  currentTime: number;
  duration: number;
}
