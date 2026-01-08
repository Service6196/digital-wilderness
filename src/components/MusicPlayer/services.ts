import type { Song, LyricLine } from './types';
import { parseLyrics } from './utils';

const API_BASE = '/music-api'; // 匹配 astro.config.mjs 中的代理配置
const SEARCH_SOURCES = ['qq', 'kuwo', 'netease'];
const HOT_LISTS: Record<string, string> = {
    qq: '26',        // QQ 热歌榜
    netease: '3778678' // 网易云热歌榜
};

function normalizeArrayPayload(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.results)) return raw.results;
    if (Array.isArray(raw?.data?.results)) return raw.data.results;
    return [];
}

async function fetchUpstream(url: string): Promise<any[]> {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeArrayPayload(data);
}

/**
 * Search for music across multiple sources, with proxy + direct fallback.
 */
export async function searchMusic(keyword: string): Promise<Song[]> {
    const query = keyword.trim();
    if (!query) return [];

    try {
        const combined: Song[] = [];
        const seen = new Set<string>();

        for (const source of SEARCH_SOURCES) {
            // Try local proxy first
            const proxyUrl = `${API_BASE}?source=${source}&type=search&keyword=${encodeURIComponent(query)}&limit=15`;
            let items = await fetchUpstream(proxyUrl);

            // Fallback: call mirror directly if proxy failed/empty
            if (items.length === 0) {
                const directUrl = `https://music-dl.sayqz.com/api/?source=${source}&type=search&keyword=${encodeURIComponent(query)}&limit=15`;
                items = await fetchUpstream(directUrl);
            }

            if (items.length > 0) {
                for (const item of items) {
                    const song: Song = { ...item, source: item.source || source };
                    const key = `${song.source}-${song.id}`;
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    combined.push(song);
                }
            }
        }
        return combined;
    } catch (err) {
        console.error('Search error:', err);
        return [];
    }
}

/**
 * Fetch hot/toplist songs from QQ + Netease and return a shuffled mix.
 */
export async function getHotMix(limitPerSource = 50): Promise<Song[]> {
    const combined: Song[] = [];

    for (const source of ['qq', 'netease']) {
        const listId = HOT_LISTS[source];
        if (!listId) continue;
        try {
            const url = `${API_BASE}?source=${source}&type=toplist&id=${listId}&limit=${limitPerSource}`;
            let list: any[] = [];

            const proxyRes = await fetch(url);
            if (proxyRes.ok) {
                const data = await proxyRes.json();
                list = data?.data?.list || data?.list || normalizeArrayPayload(data);
            }

            // Fallback direct mirror if proxy empty
            if (!Array.isArray(list) || list.length === 0) {
                const direct = `https://music-dl.sayqz.com/api/?source=${source}&type=toplist&id=${listId}&limit=${limitPerSource}`;
                const directItems = await fetchUpstream(direct);
                list = directItems;
            }

            if (Array.isArray(list)) {
                list.forEach((item: any) => {
                    if (!item?.id || !item?.name) return;
                    combined.push({
                        id: String(item.id),
                        name: item.name || '',
                        artist: item.artist || item.singer || item.singers || '',
                        album: item.album || '',
                        pic: item.pic || '',
                        source
                    });
                });
            }
        } catch (err) {
            console.warn('Hot list fetch failed for', source, err);
        }
    }

    // Shuffle
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined;
}

/**
 * Get playback URL for a specific song
 */
export async function getSongUrl(song: Song): Promise<string | null> {
    try {
        const source = song.source || 'netease';
        const urlRes = await fetch(`${API_BASE}?source=${source}&id=${song.id}&type=url`);
        const urlData = await urlRes.json();

        if (urlData && urlData.url) {
            return urlData.url;
        }
        return null;
    } catch (err) {
        console.error('Get URL error:', err);
        return null;
    }
}

/**
 * Get lyrics for a specific song
 */
export async function getLyrics(song: Song): Promise<LyricLine[]> {
    try {
        const source = song.source || 'netease';
        const res = await fetch(`${API_BASE}?source=${source}&id=${song.id}&type=lrc`);
        const data = await res.json();

        if (data && data.lrc) {
            return parseLyrics(data.lrc);
        }
        return [];
    } catch (err) {
        console.error('Get Lyrics error:', err);
        return [];
    }
}
