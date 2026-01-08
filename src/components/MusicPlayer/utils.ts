import type { LyricLine } from './types';

/**
 * Format seconds into MM:SS string
 */
export function formatTime(sec: number): string {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse LRC format lyrics text into structured array
 */
export function parseLyrics(lrcText: string): LyricLine[] {
    const lines = lrcText.split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    const lyrics: LyricLine[] = [];

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const ms = parseInt(match[3]);
            // Handle 2 or 3 digit milliseconds
            const time = minutes * 60 + seconds + (ms < 100 ? ms / 100 : ms / 1000);
            const text = line.replace(timeRegex, '').trim();
            if (text) {
                lyrics.push({ time, text });
            }
        }
    }

    return lyrics;
}
