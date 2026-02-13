/**
 * Music Player Utilities
 * Helper functions for the music player.
 */

/**
 * Format seconds into MM:SS string
 */
export function formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse LRC format lyrics into LyricLine array
 */
export function parseLrc(lrcText: string): { time: number; text: string }[] {
    const lines = lrcText.split('\n');
    const result: { time: number; text: string }[] = [];

    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
        const matches = [...line.matchAll(timeRegex)];
        if (matches.length === 0) continue;

        const text = line.replace(timeRegex, '').trim();
        if (!text) continue;

        for (const match of matches) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
            const time = minutes * 60 + seconds + ms / 1000;
            result.push({ time, text });
        }
    }

    return result.sort((a, b) => a.time - b.time);
}

/**
 * Shuffle an array (Fisher-Yates)
 */
export function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Local storage wrapper with error handling
 */
export const storage = {
    get<T>(key: string, fallback: T): T {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },
    set(key: string, value: any): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.warn('Storage set failed:', err);
        }
    },
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch { }
    }
};
