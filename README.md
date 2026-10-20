# TiktokEnhance 🎬

A modern, serverless web app that **pre-optimizes your videos for TikTok** before you upload them — so TikTok's compression doesn't destroy your quality.

## Why?

TikTok re-compresses every video you upload, often reducing quality significantly. By encoding your video with optimal settings *before* uploading, the final result on TikTok looks much sharper and cleaner.

## Features

- 🎯 **Resolution selector** — Portrait 1080×1920 (TikTok native), Landscape, Square, or keep original
- ✨ **Quality presets** — Maximum (~8–12 Mbps), High (~4–6 Mbps), Good (~2–3 Mbps)
- 🎞️ **FPS control** — 60fps (smoothest), 30fps, 24fps (cinematic)
- 📊 **Video metadata preview** — reads your original resolution & duration before upload
- ☁️ **Serverless** — Cloudinary handles all re-encoding on their servers (no local FFmpeg needed)
- 🔥 **Firestore** — upload history persisted automatically
- 📱 **Mobile-first** — responsive sidebar on desktop, bottom tab bar on mobile
- 🔗 **Copy URL** — one-click copy of the optimized Cloudinary URL

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** + **shadcn/ui** components
- **Cloudinary** — video upload + eager transformations (re-encoding)
- **Firebase Firestore** — serverless database
- **Zustand** — state management

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` with your credentials:
   ```env
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
4. **Cloudinary setup**: In your Cloudinary upload preset, make sure **eager transformations** are allowed.
5. Run the dev server:
   ```bash
   npm run dev
   ```

## How it works

When you click **Optimize & Upload**, the app sends your video directly to Cloudinary with an [eager transformation](https://cloudinary.com/documentation/video_manipulation_and_delivery#eager_transformations) like:

```
w_1080,h_1920,c_fill,q_auto:best,r_60/mp4
```

Cloudinary re-encodes the video on their servers and returns the optimized URL. This is the TikTok-ready version. No local backend, no FFmpeg installation needed.

## License

MIT
