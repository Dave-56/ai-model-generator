<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/32327be8-40a6-4a30-adf5-b43483261a72

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   - **`npm run dev`** — Vite only; images stay as data URLs and are not uploaded. You may see `POST /api/upload-image 404` in the console; that’s expected.
   - **`vercel dev`** — Runs Vite + Vercel API routes so `/api/upload-image` works and images get persistent blob URLs (and can be saved to the gallery across reloads).
