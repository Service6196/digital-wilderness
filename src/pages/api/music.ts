// API proxy endpoint for TuneFree music API
// Translates the player-friendly `/api/music?action=...` calls to the upstream
// `type/source/id` format and normalizes responses for the frontend.

import type { APIRoute } from 'astro';
import type { LyricLine } from '../../components/MusicPlayer/types';
import { parseLrc } from '../../components/MusicPlayer/utils';

// ============ TuneHub V3 API Configuration ============
const TUNEHUB_BASE_URL = 'https://tunehub.sayqz.com/api';
const TUNEHUB_API_KEY = 'th_a14c04351a0be0c7e7061893dc0e5283057310338a04a6c5';

const TUNEHUB_HEADERS = {
    'Content-Type': 'application/json',
    'X-API-Key': TUNEHUB_API_KEY,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// TuneHub支持的平台映射
const TUNEHUB_PLATFORMS: Record<string, string> = {
    'netease': 'netease',
    'qq': 'qq',
    'kuwo': 'kuwo'
};

// ============ Legacy API Configuration ============
// Upstream music API mirrors (ordered by preference)
const API_ENDPOINTS = [
    'https://api.tunefree.fun/api/',
    'https://music-dl.sayqz.com/api/'
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
const REQUEST_TIMEOUT_MS = 3500;
const ENDPOINT_COOLDOWN_MS = 120000;
const MAX_CONSECUTIVE_FAILURES = 1;

type EndpointState = {
    consecutiveFailures: number;
    cooldownUntil: number;
};

const endpointHealth = new Map<string, EndpointState>();

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

function logDebug(...args: unknown[]) {
    if (import.meta.env.DEV) {
        console.warn('[music-api]', ...args);
    }
}

function getEndpointState(baseUrl: string): EndpointState {
    const current = endpointHealth.get(baseUrl);
    if (current) return current;
    const initial = { consecutiveFailures: 0, cooldownUntil: 0 };
    endpointHealth.set(baseUrl, initial);
    return initial;
}

function isEndpointCoolingDown(baseUrl: string): boolean {
    const state = getEndpointState(baseUrl);
    return state.cooldownUntil > Date.now();
}

function markEndpointSuccess(baseUrl: string) {
    endpointHealth.set(baseUrl, { consecutiveFailures: 0, cooldownUntil: 0 });
}

function markEndpointFailure(baseUrl: string, reason: unknown) {
    const now = Date.now();
    const state = getEndpointState(baseUrl);
    const failures = state.consecutiveFailures + 1;

    if (failures >= MAX_CONSECUTIVE_FAILURES) {
        endpointHealth.set(baseUrl, {
            consecutiveFailures: 0,
            cooldownUntil: now + ENDPOINT_COOLDOWN_MS
        });
        logDebug(`Endpoint cooldown: ${baseUrl}`, reason);
        return;
    }

    endpointHealth.set(baseUrl, {
        consecutiveFailures: failures,
        cooldownUntil: 0
    });
    logDebug(`Endpoint failure (${failures}/${MAX_CONSECUTIVE_FAILURES}): ${baseUrl}`, reason);
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
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

// ============ TuneHub V3 API Functions ============

/**
 * 使用TuneHub Methods接口获取搜索配置并执行搜索
 * 这是免费接口，不消耗积分
 */
async function tuneHubSearch(keyword: string, platform: string, page = 1, pageSize = 30): Promise<NormalizedSong[]> {
    const tuneHubPlatform = TUNEHUB_PLATFORMS[platform];
    if (!tuneHubPlatform) {
        console.log(`TuneHub: Platform ${platform} not supported, skipping`);
        return [];
    }

    try {
        // Step 1: 获取搜索方法配置
        const methodUrl = `${TUNEHUB_BASE_URL}/v1/methods/${tuneHubPlatform}/search`;
        const methodRes = await fetch(methodUrl, {
            method: 'GET',
            headers: TUNEHUB_HEADERS
        });

        if (!methodRes.ok) {
            console.error(`TuneHub methods API error: ${methodRes.status}`);
            return [];
        }

        const methodConfig = await methodRes.json();
        if (!methodConfig.data) {
            console.error('TuneHub: Invalid method config response');
            return [];
        }

        const config = methodConfig.data;

        // Step 2: 根据配置执行实际搜索请求
        let searchUrl = config.url
            .replace('{{keyword}}', encodeURIComponent(keyword))
            .replace('{{page}}', String(page))
            .replace('{{pageSize}}', String(pageSize));

        // 处理params中的变量替换
        const params = new URLSearchParams();
        if (config.params) {
            for (const [key, value] of Object.entries(config.params)) {
                let paramValue = String(value);
                paramValue = paramValue
                    .replace('{{keyword}}', keyword)
                    .replace('{{page}}', String(page))
                    .replace('{{pageSize}}', String(pageSize));
                params.set(key, paramValue);
            }
        }

        const finalUrl = params.toString() ? `${searchUrl}?${params.toString()}` : searchUrl;

        const searchRes = await fetch(finalUrl, {
            method: config.method || 'GET',
            headers: { ...REQUEST_HEADERS, ...(config.headers || {}) }
        });

        if (!searchRes.ok) {
            console.error(`TuneHub search request error: ${searchRes.status}`);
            return [];
        }

        const searchData = await searchRes.json();

        // Step 3: 使用transform规则解析响应
        return normalizeSongs(searchData, platform);
    } catch (error) {
        console.error('TuneHub search error:', error);
        return [];
    }
}

/**
 * 使用TuneHub Parse接口获取歌曲播放URL
 * 这会消耗积分，但能获取高质量音频
 */
async function tuneHubParse(platform: string, id: string, quality = '320k'): Promise<{ url?: string; pic?: string; lrc?: string } | null> {
    const tuneHubPlatform = TUNEHUB_PLATFORMS[platform];
    if (!tuneHubPlatform) {
        console.log(`TuneHub: Platform ${platform} not supported for parsing`);
        return null;
    }

    try {
        const parseUrl = `${TUNEHUB_BASE_URL}/v1/parse`;
        const res = await fetch(parseUrl, {
            method: 'POST',
            headers: TUNEHUB_HEADERS,
            body: JSON.stringify({
                platform: tuneHubPlatform,
                ids: String(id),
                quality: quality
            })
        });

        if (!res.ok) {
            console.error(`TuneHub parse API error: ${res.status}`);
            return null;
        }

        const data = await res.json();

        // 解析响应数据
        if (data.code === 200 && data.data && data.data.length > 0) {
            const song = data.data[0];
            return {
                url: song.url || song.playUrl,
                pic: song.pic || song.cover || song.picUrl,
                lrc: song.lrc || song.lyric
            };
        }

        return null;
    } catch (error) {
        console.error('TuneHub parse error:', error);
        return null;
    }
}

// ============ Legacy API Functions ============

async function fetchJSON(params: URLSearchParams): Promise<any | null> {
    for (const baseUrl of API_ENDPOINTS) {
        if (isEndpointCoolingDown(baseUrl)) continue;

        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            const upstream = await fetchWithTimeout(targetUrl.toString(), {
                method: 'GET',
                headers: REQUEST_HEADERS
            });

            if (!upstream.ok) {
                if (upstream.status >= 500 || upstream.status === 429) {
                    markEndpointFailure(baseUrl, `status=${upstream.status}`);
                }
                continue;
            }

            const contentType = upstream.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                markEndpointFailure(baseUrl, 'invalid-content-type');
                continue;
            }

            const payload = await upstream.json();
            markEndpointSuccess(baseUrl);
            return payload;
        } catch (error) {
            markEndpointFailure(baseUrl, error);
            continue;
        }
    }
    return null;
}

async function resolveMediaUrl(type: 'url' | 'pic', source: string, id: string, br?: string): Promise<string | null> {
    const params = new URLSearchParams({ source, type, id });
    if (br) params.set('br', br);

    for (const baseUrl of API_ENDPOINTS) {
        if (isEndpointCoolingDown(baseUrl)) continue;

        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            const upstream = await fetchWithTimeout(targetUrl.toString(), {
                method: 'GET',
                redirect: 'manual',
                headers: REQUEST_HEADERS
            });

            const location = upstream.headers.get('location');
            if (location) {
                markEndpointSuccess(baseUrl);
                return location;
            }

            if (REDIRECT_STATUS.has(upstream.status) && location) return location;

            if (upstream.ok) {
                const contentType = upstream.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const data = await upstream.json().catch(() => null);
                    const direct = data?.url ?? data?.data?.url ?? data?.data;
                    if (typeof direct === 'string') {
                        markEndpointSuccess(baseUrl);
                        return direct;
                    }
                }
                // If the upstream is directly streaming the media, fall back to its URL
                if (!contentType.includes('application/json')) {
                    markEndpointSuccess(baseUrl);
                    return targetUrl.toString();
                }
            } else if (upstream.status >= 500 || upstream.status === 429) {
                markEndpointFailure(baseUrl, `status=${upstream.status}`);
            }
        } catch (error) {
            markEndpointFailure(baseUrl, error);
            continue;
        }
    }

    return null;
}

async function fetchLyricsLines(source: string, id: string, hintedUrl?: string): Promise<LyricLine[]> {
    const fetchText = async (target: string) => {
        try {
            const res = await fetchWithTimeout(target, { headers: REQUEST_HEADERS });
            if (!res.ok) return null;

            const text = await res.text();
            if (!text) return null;

            // Some mirrors return JSON-wrapped lyrics
            if (text.trim().startsWith('{') || res.headers.get('content-type')?.includes('application/json')) {
                try {
                    const json = JSON.parse(text);
                    const raw = json?.data?.lrc || json?.lrc || json?.data || '';
                    if (typeof raw === 'string' && raw.trim()) return raw;
                } catch {
                    /* ignore json parse errors and fall back to raw text */
                }
            }

            return text;
        } catch (error) {
            logDebug('Lyrics fetch error:', error);
            return null;
        }
    };

    if (hintedUrl) {
        const text = await fetchText(hintedUrl);
        if (text) return parseLrc(text);
    }

    const params = new URLSearchParams({ source, type: 'lrc', id });
    for (const baseUrl of API_ENDPOINTS) {
        if (isEndpointCoolingDown(baseUrl)) continue;

        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            const upstream = await fetchWithTimeout(targetUrl.toString(), {
                method: 'GET',
                headers: REQUEST_HEADERS
            });

            if (!upstream.ok) {
                if (upstream.status >= 500 || upstream.status === 429) {
                    markEndpointFailure(baseUrl, `status=${upstream.status}`);
                }
                continue;
            }

            const lyricsText = await upstream.text();
            if (!lyricsText) continue;

            const contentType = upstream.headers.get('content-type') || '';
            if (contentType.includes('application/json') || lyricsText.trim().startsWith('{')) {
                try {
                    const payload = JSON.parse(lyricsText);
                    const raw = payload?.data?.lrc || payload?.lrc || payload?.data || '';
                    if (typeof raw === 'string' && raw.trim()) {
                        markEndpointSuccess(baseUrl);
                        return parseLrc(raw);
                    }
                } catch (error) {
                    logDebug('Lyrics JSON parse error:', error);
                }
            }

            markEndpointSuccess(baseUrl);
            return parseLrc(lyricsText);
        } catch (error) {
            markEndpointFailure(baseUrl, error);
            continue;
        }
    }

    return [];
}

async function handleSearch(keyword: string, source: string, limit?: number, page?: number) {
    // 使用旧API进行搜索（TuneHub Methods接口网络不稳定）
    // TuneHub Parse接口只用于获取播放URL
    const params = new URLSearchParams();
    params.set('type', source === 'all' ? 'aggregateSearch' : 'search');
    if (source !== 'all') {
        params.set('source', source);
    }
    params.set('keyword', keyword);
    if (limit) params.set('limit', String(limit));
    if (page) params.set('page', String(page));

    const payload = await fetchJSON(params);
    if (!payload) {
        return jsonResponse({ songs: [], error: 'Upstream unavailable' }, 200, 'no-store');
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
    const pageParam = body.page ?? searchParams.get('page');
    const limit = limitParam ? parseInt(String(limitParam), 10) : undefined;
    const page = pageParam ? parseInt(String(pageParam), 10) : undefined;

    if (action === 'search') {
        if (!keyword) {
            return jsonResponse({ error: 'Missing keyword' }, 400);
        }
        return handleSearch(keyword, source, limit, page);
    }

    if (action === 'hot') {
        const key = keyword || DEFAULT_KEYWORD;
        return handleSearch(key, source, limit || 50, page);
    }

    if (action === 'url' || action === 'pic') {
        if (!id) {
            return jsonResponse({ error: 'Missing id' }, 400);
        }
        if (body.url && action === 'url') {
            return jsonResponse({ url: body.url }, 200, 'public, max-age=600');
        }

        const bitrate = body.br ?? body.quality ?? searchParams.get('br') ?? searchParams.get('quality') ?? undefined;

        // 优先尝试TuneHub Parse接口获取高质量音频
        if (action === 'url') {
            const quality = bitrate || '320k';
            const tuneHubResult = await tuneHubParse(source, String(id), quality);
            if (tuneHubResult?.url) {
                console.log(`TuneHub: Got URL for song ${id}`);
                return jsonResponse({ url: tuneHubResult.url }, 200, 'public, max-age=300');
            }
            console.log('TuneHub parse failed, falling back to legacy API');
        }

        // 回退到旧API
        const mediaUrl = await resolveMediaUrl(action, source, String(id), bitrate ? String(bitrate) : undefined);
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
