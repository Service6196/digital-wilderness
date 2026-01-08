export interface Song {
    id: string | number;
    name: string;
    artist: string;
    artists?: string[];
    album?: string;
    pic?: string;
    source: string;
    url?: string;
}

export interface LyricLine {
    time: number;
    text: string;
}

export interface PlayerState {
    playlist: Song[];
    currentIndex: number;
    isPlaying: boolean;
    lyrics: LyricLine[];
}
