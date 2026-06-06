import { Track, Album } from './types';

export const ARTIST_NAME = "AFRICAN ECHO";

export const IMAGES = {
  hero: "",
  portrait: "",
  albumCover: "",
  gallery: [],
  videos: []
};

export const VIDEOS = [
  { id: "v1", title: "ETHEREAL ECHOES", thumbnail: "", category: "OFFICIAL VIDEO" },
  { id: "v2", title: "KAMPALA NIGHTS", thumbnail: "", category: "LIVE PERFORMANCE" },
  { id: "v3", title: "VOID PULSE", thumbnail: "", category: "VISUALIZER" },
];

export const TRACKS: Track[] = [
  {
    id: "1",
    title: "Ethereal Echoes",
    artist: "African Echo",
    coverUrl: "",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "4:20",
    lyrics: "Lost in the silence of the night\nFading highlights, silver light\nEchoes calling from the deep\nSecrets that we used to keep\n\nVoid is calling, soft and low\nWhere did all the voices go?\nDancing shadows on the wall\nWaiting for the rise and fall."
  },
  {
    id: "2",
    title: "Midnight Drift",
    artist: "African Echo",
    coverUrl: "",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "3:45",
    lyrics: "Drifting through the neon rain\nWash away the ghost of pain\nMidnight pulses in my veins\nBreaking all the heavy chains\n\nCity lights are blurring fast\nFuture mirrors of the past\nIn the rhythm, I am free\nFloating in the cosmic sea."
  },
  {
    id: "3",
    title: "Void Pulse",
    artist: "African Echo",
    coverUrl: "",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "5:12",
    lyrics: "Pulse within the empty space\nFading lines upon the face\nGravity begins to bend\nBeginning is the only end\n\nHear the thunder in the soul\nLosing all of my control\nInto the abyss we dive\nFeeling finally alive."
  }
];

export const ALBUMS: Album[] = [
  {
    id: "a1",
    title: "Echoes of the Void",
    releaseDate: "2024",
    coverUrl: "",
    tracks: TRACKS
  }
];
