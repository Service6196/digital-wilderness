// API proxy endpoint for TuneFree music API
// This bypasses CORS restrictions by proxying requests through the server

import type { APIRoute } from 'astro';

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

function jsonResponse(body: unknown, status = 200, cache = 'public, max-age=120') {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...JSON_HEADERS,
            'Cache-Control': cache
        }
    });
}

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const id = searchParams.get('id');

    if (!type || !source) {
        return jsonResponse({ error: 'Missing required query parameters: type and source' }, 400);
    }

    if (type === 'search' && !searchParams.get('keyword')) {
        return jsonResponse({ error: 'Missing keyword for search' }, 400);
    }

    if ((type === 'url' || type === 'lrc' || type === 'pic') && !id) {
        return jsonResponse({ error: 'Missing id for requested resource' }, 400);
    }

    // Clone params so we can safely reuse them
    const params = new URLSearchParams(searchParams);

    for (const baseUrl of API_ENDPOINTS) {
        try {
            const targetUrl = new URL(baseUrl);
            params.forEach((value, key) => targetUrl.searchParams.set(key, value));

            // URL or cover requests return redirects/binary, not JSON
            if (type === 'url' || type === 'pic') {
                const upstream = await fetch(targetUrl.toString(), {
                    method: 'GET',
                    redirect: 'manual',
                    headers: REQUEST_HEADERS
                });

                const location = upstream.headers.get('location');

                if (REDIRECT_STATUS.has(upstream.status) && location) {
                    return jsonResponse({ url: location });
                }

                if (upstream.ok && location) {
                    return jsonResponse({ url: location });
                }

                if (upstream.ok && upstream.body) {
                    return new Response(upstream.body, {
                        status: upstream.status,
                        headers: {
                            'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream'
                        }
                    });
                }

                continue;
            }

            // Lyrics responses are plain text
            if (type === 'lrc') {
                const upstream = await fetch(targetUrl.toString(), {
                    method: 'GET',
                    headers: REQUEST_HEADERS
                });

                if (!upstream.ok) {
                    continue;
                }

                const lyrics = await upstream.text();
                return jsonResponse({ lrc: lyrics });
            }

            // Default: expect JSON (e.g., search)
            const upstream = await fetch(targetUrl.toString(), {
                method: 'GET',
                headers: REQUEST_HEADERS
            });

            if (!upstream.ok) {
                continue;
            }

            const contentType = upstream.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                continue;
            }

            const payload = await upstream.json();

            if (type === 'search') {
                const results = payload?.data?.results ?? payload?.data ?? payload?.results ?? [];
                if (!Array.isArray(results)) {
                    continue;
                }

                const normalized = results
                    .map((item: any) => {
                        const artistField = item.artist ?? item.artists ?? item.singer ?? item.singers ?? item.artistname;
                        const artist = Array.isArray(artistField) ? artistField.join(', ') : artistField;

                        return {
                            id: String(item.id ?? item.songmid ?? item.mid ?? item.songId ?? item.rid ?? ''),
                            name: item.name ?? item.title ?? item.song ?? '',
                            artist: artist || '',
                            album: item.album ?? item.albumname ?? '',
                            pic: item.pic ?? item.cover ?? item.picUrl ?? item.picurl ?? item.albumPic ?? '',
                            source: item.platform ?? item.source ?? source
                        };
                    })
                    .filter((item) => item.id && item.name);

                return jsonResponse(normalized, 200, 'public, max-age=300');
            }

            // Passthrough fallback for other JSON types
            return jsonResponse(payload);
        } catch (error) {
            console.error(`API ${baseUrl} error:`, error);
            continue;
        }
    }

    return jsonResponse({
        error: 'All API endpoints failed',
        tried: API_ENDPOINTS
    }, 502);
};
