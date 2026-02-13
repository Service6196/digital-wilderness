# 🎵 Music Player Package

A reusable, configurable music player component for Astro websites.

## Features

- 🎨 **Capsule UI** - Minimal floating player with expandable panel
- 🔍 **Search capability** - Search for songs via your API
- 📂 **Mode presets** - Deep Work, Reading, Chill modes
- 🎤 **Lyrics sync** - Real-time lyrics display
- 💾 **State persistence** - Remembers playback state across pages
- 📱 **Mobile responsive** - Works on all screen sizes
- ⚙️ **Configurable API** - Bring your own backend

## Installation

Copy the `/packages/music-player` folder to your Astro project.

## Usage

```astro
---
import MusicPlayer from '@/packages/music-player';
---

<MusicPlayer config={{
    api: {
        search: '/api/music?action=search',
        songUrl: '/api/music?action=url',
        lyrics: '/api/music?action=lyrics',
        hotMix: '/api/music?action=hot',  // Optional
    },
    defaults: {
        keyword: 'Lo-Fi',
        mode: 'deep-work',
    },
    ui: {
        position: 'bottom-right',   // or 'bottom-left'
        iconUrl: '/images/music-icon.png',
        persist: true,              // Persist across Astro page navigations
    },
}} />
```

## API Requirements

Your backend must implement these endpoints:

### `GET /api/music?action=search&keyword=xxx`
Returns:
```json
{
    "songs": [
        {
            "id": "123",
            "name": "Song Title",
            "artist": "Artist Name",
            "pic": "https://example.com/cover.jpg"
        }
    ]
}
```

### `POST /api/music?action=url`
Body: Song object
Returns:
```json
{
    "url": "https://example.com/audio.mp3"
}
```

### `POST /api/music?action=lyrics`
Body: Song object
Returns:
```json
{
    "lyrics": [
        { "time": 0, "text": "First line" },
        { "time": 5.5, "text": "Second line" }
    ]
}
```

### `GET /api/music?action=hot&limit=50` (Optional)
Returns hot/recommended songs in same format as search.

## Customization

### CSS Variables

The component uses these CSS variables for theming:

```css
:root {
    --surface: #ffffff;      /* Panel background */
    --bg: #f5f5f5;           /* Page background */
    --text: #333333;         /* Text color */
    --grid-line: rgba(0,0,0,0.1);  /* Borders */
}
```

### Dark Mode

Just set the CSS variables for dark mode:

```css
.dark {
    --surface: #1a1a1a;
    --bg: #0a0a0a;
    --text: #ffffff;
    --grid-line: rgba(255,255,255,0.1);
}
```

## License

MIT
