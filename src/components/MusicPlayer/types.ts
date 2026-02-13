/**
 * Music Player Types
 * Standalone type definitions for the reusable music player package.
 */

// ============ Configuration ============

export interface MusicPlayerConfig {
    /** API endpoints configuration */
    api: {
        /** Endpoint for searching songs - receives ?keyword=xxx */
        search: string;
        /** Endpoint for getting playable song URL - receives song object in POST body */
        songUrl: string;
        /** Endpoint for getting lyrics - receives song object in POST body */
        lyrics: string;
        /** Optional: Endpoint for hot/recommended songs - receives ?limit=xxx */
        hotMix?: string;
    };
    /** Default settings */
    defaults?: {
        /** Default search keyword when no history */
        keyword?: string;
        /** Default mode */
        mode?: MusicMode;
    };
    /** UI customization */
    ui?: {
        /** Position of the player */
        position?: 'bottom-right' | 'bottom-left';
        /** Custom icon URL for the toggle button */
        iconUrl?: string;
        /** Persist player state across page navigations (Astro View Transitions) */
        persist?: boolean;
    };
}

// ============ Data Models ============

export interface Song {
    id: string | number;
    name: string;
    artist?: string;
    artists?: string[];
    pic?: string;
    url?: string;
    source?: 'netease' | 'qq' | 'kuwo' | 'custom';
    /** Additional metadata for API calls */
    [key: string]: any;
}

export interface LyricLine {
    time: number;   // Seconds
    text: string;
}

export type MusicMode = 'deep-work' | 'reading' | 'chill' | 'japanese' | 'chinese-hot';

export interface PlayerState {
    playlist: Song[];
    currentIndex: number;
    isPlaying: boolean;
    lyrics: LyricLine[];
    mode: MusicMode;
    currentTime?: number;
    url?: string;
    song?: Song;
}

// ============ API Response Types ============

export interface SearchResponse {
    songs: Song[];
}

export interface SongUrlResponse {
    url: string;
}

export interface LyricsResponse {
    lyrics: LyricLine[];
}

export interface HotMixResponse {
    songs: Song[];
}
