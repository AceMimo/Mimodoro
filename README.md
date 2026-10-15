# Mimodoro

A customizable Pomodoro timer with ambient sound, animated and video backgrounds, a lightweight task list, and focus statistics. The app runs in the browser and stores settings and task/stat data locally in `localStorage`; it does not require an API key or backend.

## Requirements

- Node.js 20 or later
- npm

## Run locally

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Verify and build

```bash
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`. `npm run build` runs TypeScript checking before bundling.

## Notes

- Local audio and video files are selected in the browser and are not uploaded.
- Imported local media uses temporary browser object URLs and must be selected again after a reload.
- YouTube and Spotify embeds, internet radio, remote background images, and Google Fonts require an internet connection and are subject to their providers' availability and browser autoplay restrictions.
- Timer settings, tasks, and focus stats are saved per browser profile. Use **Reset All Data** in Settings to clear the app's saved data.
