export interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: string;
  lyrics?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
  youtubeUrl?: string;
}

export interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  description?: string;
}

export interface Album {
  id: string;
  title: string;
  releaseDate: string;
  coverUrl: string;
  tracks: any[]; // site-content.json stores array of track IDs
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
  youtubeUrl?: string;
  sidebarHidden?: boolean;
}

export interface CustomPage {
  id: string;
  name: string;
  slug: string;
  type: 'predefined' | 'custom';
  predefinedKey?: 'home' | 'about' | 'music' | 'videos' | 'gallery' | 'booking' | 'contact';
  content?: string;
  bannerUrl?: string;
  isVisible: boolean;
}

