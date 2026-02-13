/**
 * Music Player Service Layer
 * Compatibility layer for direct function imports.
 */

import { createMusicAPI } from './api';
import type { Song, LyricLine } from './types';

// Default API endpoints
const defaultConfig = {
    api: {
        search: '/api/music?action=search',
        songUrl: '/api/music?action=url',
        lyrics: '/api/music?action=lyrics',
        hotMix: '/api/music?action=hot'
    }
};

const api = createMusicAPI(defaultConfig);

export async function searchMusic(keyword: string): Promise<Song[]> {
    return api.search(keyword);
}

export async function getSongUrl(song: Song): Promise<string | null> {
    return api.getSongUrl(song);
}

export async function getLyrics(song: Song): Promise<LyricLine[]> {
    return api.getLyrics(song);
}

export async function getHotMix(limit: number = 50): Promise<Song[]> {
    return api.getHotMix(limit);
}

export async function getModePlaylist(mode: any): Promise<Song[]> {
    return api.getModePlaylist(mode);
}
