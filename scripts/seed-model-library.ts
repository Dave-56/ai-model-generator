/**
 * Seed script: generates pre-built model library.
 *
 * Usage:
 *   npm run seed:models                        → generate all missing models
 *   npm run seed:models -- --model=model-03    → regenerate one specific model
 *
 * Output:
 *   - Each image uploaded to Vercel Blob (public, stable CDN URL)
 *   - public/preset-models.json updated
 *
 * NOTE: Re-running with --model= generates a new Blob URL for that entry and
 * updates the JSON. Commit the updated preset-models.json after any re-run.
 * Existing entries are skipped unless explicitly targeted with --model=.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { MODEL_DEFINITIONS, type PresetModel } from './model-definitions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, '../public/preset-models.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresetModelEntry extends PresetModel {
  imageUrl: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`  [${label}] attempt ${attempt + 1} failed — retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

// Mirrors generatePrompt() in App.tsx exactly — same outfit, same angle, same style.
// White studio + front angle are hardcoded since library models are always front/white.
function buildPrompt(model: PresetModel): string {
  return `Generate a photorealistic fashion model portrait with these attributes:

Name: ${model.name}
Gender: ${model.gender}
Ethnicity: ${model.ethnicity}
Skin tone: ${model.skinTone}
Body build: ${model.bodyBuild}
Height: ${model.height}
Hair: ${model.hairStyle}, ${model.hairColor}
Age range: ${model.ageRange}

REQUIREMENTS:
- Background: pure white (#FFFFFF). Soft, even studio lighting. Clean, minimal e-commerce look.
- Front-facing, neutral expression, confident posture. Camera directly in front.
- Full body portrait from head to toe
- IMPORTANT: Must not crop head or feet. The entire body from head to toes must be visible.
- 2:3 portrait framing. Center the model with even margins on all sides.
- OUTFIT (locked — use this exact description every time, no variation): ${model.gender === 'Male' ? 'Fitted black crew-neck t-shirt, full length with hem sitting at the waist. Black slim-fit shorts, mid-thigh length.' : 'Black short-sleeve fitted crop top ending at midriff. Black high-waist short shorts (hotpants length, upper thigh only).'} Same garment style for all models.
- Footwear: Model must be BAREFOOT. No shoes, no heels, no sandals, no footwear of any kind.
- High resolution, sharp details
- The model should look like a real person, not AI-generated`;
}

async function cropTo2x3(base64: string): Promise<Buffer> {
  const input = Buffer.from(base64, 'base64');
  const meta = await sharp(input).metadata();
  const w = meta.width!;
  const h = meta.height!;

  // Target 2:3 ratio
  let cropW = w;
  let cropH = Math.round(w * 3 / 2);
  if (cropH > h) {
    cropH = h;
    cropW = Math.round(h * 2 / 3);
  }

  // Center horizontally; 10% bias from top to preserve head
  const left = Math.round((w - cropW) / 2);
  const top = Math.max(0, Math.round((h - cropH) * 0.1));

  return sharp(input)
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer();
}

function loadManifest(): Record<string, PresetModelEntry> {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  const entries: PresetModelEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  return entries.reduce<Record<string, PresetModelEntry>>((acc, e) => {
    acc[e.id] = e;
    return acc;
  }, {});
}

function writeManifest(results: Record<string, PresetModelEntry>) {
  const manifest = MODEL_DEFINITIONS.map(m => results[m.id]).filter(Boolean);
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written → public/preset-models.json (${manifest.length} models)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const modelArg = process.argv.find(a => a.startsWith('--model='))?.split('=')[1];
  const force = process.argv.includes('--force');

  const apiKey = process.env.GEMINI_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env.local');
  if (!blobToken) throw new Error('BLOB_READ_WRITE_TOKEN not set in .env.local');

  const ai = new GoogleGenAI({ apiKey });
  const existing = loadManifest();
  const results: Record<string, PresetModelEntry> = { ...existing };

  const targets = modelArg
    ? MODEL_DEFINITIONS.filter(m => m.id === modelArg)
    : MODEL_DEFINITIONS;

  if (modelArg && targets.length === 0) {
    throw new Error(`No model found with id "${modelArg}". Valid ids: ${MODEL_DEFINITIONS.map(m => m.id).join(', ')}`);
  }

  console.log(`\nSeed model library — ${targets.length} target(s)\n`);

  for (let i = 0; i < targets.length; i++) {
    const model = targets[i];

    if (!modelArg && !force && existing[model.id]) {
      console.log(`[${model.id}] already seeded — skipping`);
      continue;
    }

    console.log(`[${model.id}] generating ${model.name} (${model.ethnicity}, ${model.gender}, ${model.ageRange})...`);

    const base64 = await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: buildPrompt(model) }] },
        config: {
          temperature: 0.4,
          imageConfig: { aspectRatio: '2:3', imageSize: '1K' },
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) return part.inlineData.data;
      }
      throw new Error('No image data in response');
    }, model.id);

    console.log(`[${model.id}] cropping to 2:3...`);
    const cropped = await cropTo2x3(base64);

    console.log(`[${model.id}] uploading to Vercel Blob...`);
    const { url } = await put(`preset-models/${model.id}.png`, cropped, {
      access: 'public',
      contentType: 'image/png',
      token: blobToken,
    });

    results[model.id] = {
      ...model,
      imageUrl: url,
      generatedAt: new Date().toISOString(),
    };

    console.log(`[${model.id}] done → ${url}`);

    // Rate limit buffer between generations (not after the last one)
    if (i < targets.length - 1) {
      await sleep(2000);
    }
  }

  writeManifest(results);
}

main().catch(err => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
