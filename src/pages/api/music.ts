// API proxy endpoint for TuneFree music API
// Translates the player-friendly `/api/music?action=...` calls to the upstream
// `type/source/id` format and normalizes responses for the frontend.

import type { APIRoute } from 'astro';
import type { LyricLine } from '../../components/MusicPlayer/types';
import { parseLrc } from '../../components/MusicPlayer/utils';

// Prefer the stable mirror first; tunefree is kept as a fallback.
const API_ENDPOINTS = [
    'https://music-dl.sayqz.com/api/',
    'https://api.tunefree.fun/api/'
];

const REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
};

const JSON_HEADERS = {
    'Content-Type': 'application/json'
};

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
const DEFAULT_SOURCE = 'netease';
const DEFAULT_KEYWORD = 'Lo-Fi';

type NormalizedSong = {
    id: string;
    name: string;
    artist: string;
    album?: string;
    pic?: string;
    source?: string;
    url?: string;
    lrc?: string;
};

function jsonResponse(body: unknown, status = 200, cache = 'public, max-age=120') {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...JSON_HEADERS,
            'Cache-Control': cache
        }
    });
}

function normalizeSongs(payload: any, fallbackSource: string): NormalizedSong[] {
    const candidates = payload?.data?.results ?? payload?.data ?? payload?.results ?? payload ?? [];
    if (!Array.isArray(candidates)) return [];

    return candidates
        .map((item: any) => {
            const artistField = item.artist ?? item.artists ?? item.singer ?? item.singers ?? item.artistname;
            const artist = Array.isArray(artistField) ? artistField.join(', ') : artistField;
            const id = item.id ?? item.songmid ?? item.mid ?? item.songId ?? item.rid;
            const source = (item.platform ?? item.source ?? fallbackSource) as string | undefined;

            return {
                id: String(id ?? ''),
                name: item.name ?? item.title ?? item.song ?? item.songname ?? '',
                artist: artist || '',
                album: item.album ?? item.albumname ?? item.albumName ?? '',
                pic: item.pic ?? item.cover ?? item.picUrl ?? item.picurl ?? item.albumPic ?? item.coverUrl ?? '',
                source,
                url: item.url ?? item.playUrl ?? item.play_url ?? item.playurl ?? item.playUrl320,
                lrc: item.lrc ?? item.lyric ?? item.lyrics ?? item.lrcUrl ?? item.lyricUrl,
            };
        })
        .filter((song: NormalizedSong) => song.id && song.name);
}

async function fetchJSON(params: URLSearchParams): Promise<any | null> {
    for (const baseUrl of API_ENDPOINTS) {
        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            const upstream = await fetch(targetUrl.toString(), {
                method: 'GET',
                headers: REQUEST_HEADERS
            });

            if (!upstream.ok) continue;

            const contentType = upstream.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) continue;

            return await upstream.json();
        } catch (error) {
            console.error(`API ${baseUrl} error:`, error);
            continue;
        }
    }
    return null;
}

async function resolveMediaUrl(type: 'url' | 'pic', source: string, id: string): Promise<string | null> {
    const params = new URLSearchParams({ source, type, id });

    for (const baseUrl of API_ENDPOINTS) {
        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            const upstream = await fetch(targetUrl.toString(), {
                method: 'GET',
                redirect: 'manual',
                headers: REQUEST_HEADERS
            });

            const location = upstream.headers.get('location');
            if (location) return location;

            if (REDIRECT_STATUS.has(upstream.status) && location) return location;

            if (upstream.ok) {
                const contentType = upstream.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const data = await upstream.json().catch(() => null);
                    const direct = data?.url ?? data?.data?.url ?? data?.data;
                    if (typeof direct === 'string') return direct;
                }
                // If the upstream is directly streaming the media, fall back to its URL
                if (!contentType.includes('application/json')) {
                    return targetUrl.toString();
                }
            }
        } catch (error) {
            console.error(`API ${baseUrl} media error:`, error);
            continue;
        }
    }

    return null;
}

async function fetchLyricsLines(source: string, id: string, hintedUrl?: string): Promise<LyricLine[]> {
    const fetchText = async (target: string) => {
        try {
            const res = await fetch(target, { headers: REQUEST_HEADERS });
            if (!res.ok) return null;
            return await res.text();
        } catch (error) {
            console.error('Lyrics fetch error:', error);
            return null;
        }
    };

    if (hintedUrl) {
        const text = await fetchText(hintedUrl);
        if (text) return parseLrc(text);
    }

    const params = new URLSearchParams({ source, type: 'lrc', id });
    for (const baseUrl of API_ENDPOINTS) {
        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            const upstream = await fetch(targetUrl.toString(), {
                method: 'GET',
                headers: REQUEST_HEADERS
            });

            if (!upstream.ok) continue;

            const lyricsText = await upstream.text();
            if (lyricsText) {
                return parseLrc(lyricsText);
            }
        } catch (error) {
            console.error(`API ${baseUrl} lyrics error:`, error);
            continue;
        }
    }

    return [];
}

async function handleSearch(keyword: string, source: string, limit?: number) {
    const params = new URLSearchParams();
    params.set('source', source === 'all' ? 'all' : source);
    params.set('type', source === 'all' ? 'aggregateSearch' : 'search');
    params.set('keyword', keyword);
    if (limit) params.set('limit', String(limit));

    const payload = await fetchJSON(params);
    if (!payload) {
        return jsonResponse({ songs: [], error: 'Upstream unavailable' }, 502, 'no-store');
    }

    const songs = normalizeSongs(payload, source);
    return jsonResponse({ songs }, 200, 'public, max-age=300');
}

async function routeHandler(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    let body: Record<string, any> = {};
    if (request.method === 'POST') {
        try {
            body = await request.json();
        } catch {
            body = {};
        }
    }

    const action = (searchParams.get('action') || searchParams.get('type') || body.action || '').toLowerCase();
    const source = (body.source || searchParams.get('source') || DEFAULT_SOURCE).toLowerCase();
    const id = body.id ?? searchParams.get('id');
    const keyword = body.keyword ?? searchParams.get('keyword');
    const limitParam = body.limit ?? searchParams.get('limit');
    const limit = limitParam ? parseInt(String(limitParam), 10) : undefined;

    if (action === 'search') {
        if (!keyword) {
            return jsonResponse({ error: 'Missing keyword' }, 400);
        }
        return handleSearch(keyword, source, limit);
    }

    if (action === 'hot') {
        const key = keyword || DEFAULT_KEYWORD;
        return handleSearch(key, source, limit || 50);
    }

    if (action === 'url' || action === 'pic') {
        if (!id) {
            return jsonResponse({ error: 'Missing id' }, 400);
        }
        if (body.url && action === 'url') {
            return jsonResponse({ url: body.url }, 200, 'public, max-age=600');
        }
        const mediaUrl = await resolveMediaUrl(action, source, String(id));
        if (mediaUrl) {
            return jsonResponse({ url: mediaUrl }, 200, 'public, max-age=300');
        }
        return jsonResponse({ error: 'Media not found' }, 502);
    }

    if (action === 'lyrics' || action === 'lrc') {
        if (!id) {
            return jsonResponse({ error: 'Missing id' }, 400);
        }
        const lines = await fetchLyricsLines(source, String(id), body.lrc || body.lyric || body.lyricUrl);
        return jsonResponse({ lyrics: lines }, 200, 'public, max-age=600');
    }

    return jsonResponse({ error: 'Unsupported action' }, 400);
}

export const GET: APIRoute = async ({ request }) => routeHandler(request);
export const POST: APIRoute = async ({ request }) => routeHandler(request);
