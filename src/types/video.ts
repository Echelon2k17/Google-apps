export interface Scene {
  id: string;
  sceneNumber: number;
  heading: string;
  subheading: string;
  narration: string;
  badge: string;
  metricValue?: string;
  metricLabel?: string;
  visualIcon: string;
  visualAnimation: 'pulse' | 'zoom' | 'float' | 'scanline' | 'radar';
  backgroundStyle: 'gradient_waves' | 'particle_matrix' | 'starfield' | 'geometric_grid' | 'glowing_rings' | 'aurora';
  bgColors: [string, string, string];
  duration: number; // in seconds
  transition?: 'fade' | 'slide' | 'zoom' | 'none';
  emotionalIntensity?: number; // 0 to 100
}

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  categoryName: string;
  privacyStatus: 'unlisted' | 'private' | 'public';
  aspectRatio: '9:16' | '16:9';
  visualStyle: string;
  audioMood: string;
}

export interface VideoProject {
  id: string;
  promptDescription: string;
  veoPrompt?: string;
  musicPrompt?: string;
  generationEngine?: 'veo' | 'storyboard';
  youtube: YouTubeMetadata;
  scenes: Scene[];
  createdAt: number;
  renderedBlob?: Blob;
  renderedVideoUrl?: string;
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description?: string;
  customUrl?: string;
  thumbnailUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
}

export interface YouTubeUploadResult {
  videoId: string;
  title: string;
  privacyStatus: string;
  watchUrl: string;
  studioUrl: string;
  embedUrl: string;
  uploadedAt: number;
}
