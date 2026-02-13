/**
 * Music Player API Layer
 * Abstracted API functions that work with any backend.
 */

import type {
    MusicPlayerConfig,
    Song,
    LyricLine,
    SearchResponse,
    SongUrlResponse,
    LyricsResponse,
    HotMixResponse,
    MusicMode
} from './types';
import { parseLrc, shuffle } from './utils';

/**
 * Create a Music API client from configuration
 */
export function createMusicAPI(config: MusicPlayerConfig) {
    const { api } = config;
    const logDev = (...args: unknown[]) => {
        if (import.meta.env.DEV) console.warn(...args);
    };

    // Append query to an endpoint that may already include `?action=xxx`
    const withQuery = (base: string, query: string) =>
        base.includes('?') ? `${base}&${query}` : `${base}?${query}`;

    const extractSongs = (payload: any): Song[] => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload as Song[];
        if (Array.isArray(payload.songs)) return payload.songs as Song[];
        if (Array.isArray(payload.results)) return payload.results as Song[];
        if (Array.isArray(payload.data?.results)) return payload.data.results as Song[];
        if (Array.isArray(payload.data?.songs)) return payload.data.songs as Song[];
        return [];
    };

    /**
     * Search for songs by keyword
     */
    async function search(keyword: string): Promise<Song[]> {
        try {
            const url = withQuery(api.search, `keyword=${encodeURIComponent(keyword)}`);
            const res = await fetch(url);
            if (!res.ok) return [];

            const data: SearchResponse = await res.json();
            return extractSongs(data);
        } catch (err) {
            logDev('Search error:', err);
            return [];
        }
    }

    /**
     * Get playable URL for a song
     */
    async function getSongUrl(song: Song): Promise<string | null> {
        // If song already has a URL, use it
        if (song.url) return song.url;

        try {
            const res = await fetch(api.songUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(song),
            });
            if (!res.ok) return null;

            const data: SongUrlResponse = await res.json();
            return data.url || null;
        } catch (err) {
            logDev('Get song URL error:', err);
            return null;
        }
    }

    /**
     * Get lyrics for a song
     */
    async function getLyrics(song: Song): Promise<LyricLine[]> {
        // Use provided lyric URL if it exists to avoid extra hops
        const directLyricUrl = song.lrc || (song as any).lyric || (song as any).lyricUrl;
        if (directLyricUrl) {
            try {
                const direct = await fetch(directLyricUrl);
                if (direct.ok) {
                    const text = await direct.text();
                    return parseLrc(text);
                }
            } catch (err) {
                logDev('Direct lyric fetch failed:', err);
            }
        }

        try {
            const res = await fetch(api.lyrics, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(song),
            });
            if (!res.ok) return [];

            const data: LyricsResponse = await res.json();

            // If response is already parsed, return it
            if (Array.isArray(data.lyrics)) {
                return data.lyrics;
            }

            // If it's raw LRC text, parse it
            if (typeof data === 'string') {
                return parseLrc(data);
            }

            return [];
        } catch (err) {
            logDev('Get lyrics error:', err);
            return [];
        }
    }

    /**
     * Get hot/recommended songs
     */
    async function getHotMix(limit: number = 50): Promise<Song[]> {
        if (!api.hotMix) {
            // Fallback to searching default keyword
            const keyword = config.defaults?.keyword || 'Lo-Fi';
            return search(keyword);
        }

        try {
            const url = withQuery(api.hotMix, `limit=${limit}`);
            const res = await fetch(url);
            if (!res.ok) return [];

            const data: HotMixResponse = await res.json();
            const songs = extractSongs(data);
            return shuffle(songs);
        } catch (err) {
            logDev('Get hot mix error:', err);
            return [];
        }
    }

    /**
     * Get mode-based playlist
     */
    async function getModePlaylist(mode: MusicMode): Promise<Song[]> {
        const keywords: Record<MusicMode, string> = {
            'deep-work': 'deep focus',
            'reading': 'reading music',
            'chill': 'chill beats',
            'japanese': 'japanese city pop',
            'chinese-hot': 'mandarin hits',
        };
        const songs = await search(keywords[mode] || 'Lo-Fi');
        return shuffle(songs);
    }

    return {
        search,
        getSongUrl,
        getLyrics,
        getHotMix,
        getModePlaylist,
    };
}

export type MusicAPI = ReturnType<typeof createMusicAPI>;
