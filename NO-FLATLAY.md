# No Flat Lay — Feature Plan

## The Problem

The current pipeline requires a flat lay as input. But a significant slice of the Shopify brand market doesn't have flat lays:

- **Dropshippers** — only have manufacturer or supplier product images
- **New brands** — stock just arrived, photographed on a hanger or dress form
- **Brands with legacy assets** — have hanger shots or lookbook images from a previous season

These brands have the same pain (no professional on-model photos) but can't use the product today.

---

## What the Feature Does

Accept any clean product image — hanger shot, manufacturer photo, "article without model" — in place of a flat lay.

**Output 1: Clean product shot**
Take the uploaded image and present the garment against the brand's saved studio background (white or grey), hanger removed. This is the "article without model" format used by Mango — a clean, professional product image with no model, no hanger, no clutter.

**Output 2: On-model generation**
Use the uploaded product image as the garment reference and run the existing on-model pipeline (front → three-quarter → back). Same output as the flat lay flow.

A brand with only a hanger shot gets both in one run.

---

## How It Fits the Existing Architecture

The pipeline is unchanged. The only differences are:

1. The input image is a hanger/product shot instead of a flat lay
2. Prompt language changes from "flat lay" to "product photo" where it matters
3. A new `sourceType` value identifies the input

```
product image uploaded
        ↓
garment spec extraction    (unchanged — works on any clear garment image)
        ↓
Output 1: clean background shot   (new — single Gemini call, no model ref)
Output 2: on-model generation     (existing pipeline, unchanged)
```

---

## 1. Output 1 — Clean Background Shot

Single Gemini call. No model reference. No multi-turn chat.

### New function: `buildCleanProductShotPrompt(spec, styleSnippet)`

```ts
export function buildCleanProductShotPrompt(
  spec: GarmentSpec,
  styleSnippet: string,
): string
```

Prompt:

```
You are given 1 image:
1) A product photo of a garment (may be on a hanger, dress form, or plain surface).

TASK: Generate a clean professional product shot of this exact garment.
Remove the hanger, hook, or any supporting prop. Present the garment naturally —
hanging or lightly structured — as in a professional studio product shoot.
No model, no person, no body part visible.

GARMENT FIDELITY:
- Reproduce the garment exactly: same color, pattern, texture, buttons, zippers, stitching.
- Do not add or remove any design details.
- Preserve garment length and hem exactly as shown.

PRESENTATION:
- Front-facing, centered, full garment visible from collar to hem.
- 2:3 portrait framing. Garment fills 75–85% of the frame.

[styleSnippet]

Output: One photorealistic image in the style of professional fashion ecommerce
product photography. Natural drape and fabric texture — not flat, not composited.
```

### API call (mirrors `handleRegeneratePose` pattern — `ai.models.generateContent`)

```ts
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  config: genConfig, // temp 0.2, 2:3, 1K, HIGH
  contents: [{ role: 'user', parts: [
    { inlineData: { data: productImageBase64, mimeType } },
    { text: prompt },
  ]}],
});
// Save with angleId: 'product', same batchId and outfitQueueId
```

---

## 2. Output 2 — On-Model Generation

`handleBatchDressFromFlatLay` runs unchanged. The product image is passed in place of the flat lay. Garment spec extraction works on any clear garment image — no changes needed.

One prompt change: when `outfit.inputType === 'product_shot'`, replace "flat lay" with "product photo" in `buildHeader` and `buildPromptFromSpec`. Small conditional, no structural change.

---

## 3. Types

```ts
// GeneratedImage — add 'product_shot' to sourceType
sourceType?: 'model_only' | 'flat_lay' | 'product_shot';

// BatchOutfitItem — two new fields
/** How the garment image was sourced. Defaults to 'flat_lay'. */
inputType?: 'flat_lay' | 'product_shot';
/** Whether to generate a clean background product shot (Output 1). Auto-true for product_shot input. */
includeCleanShot?: boolean;
```

---

## 4. UI

### Dress Model tab — upload area

Secondary upload option alongside the existing flat lay uploader:

```
[ Upload flat lay ]   or   [ Upload product photo (hanger / manufacturer image) ]
```

When a product photo is uploaded: sets `inputType: 'product_shot'` and `includeCleanShot: true` on the queue item automatically.

### Queue card badge

Small label on each outfit card: `FLAT LAY` or `PRODUCT PHOTO`. No other change.

### Gallery — carousel

Clean product shot appears as the **first slide** (before on-model angles), tagged `angleId: 'product'`.

Slide-indicator badge (bottom-left overlay): `Product` / `Front` / `3/4` / `Back`. Required — without it the user can't tell which slide they're on. Small position-absolute label, similar to how `App.tsx:2118` already labels angles in the model gallery.

Regen button disabled for `angleId === 'product'` for MVP.

---

## 5. Files Changed

| File | Change |
|---|---|
| `src/garmentFidelityPrompt.ts` | Add `buildCleanProductShotPrompt()`; conditional "flat lay" → "product photo" in `buildHeader` + `buildPromptFromSpec` |
| `src/types.ts` | Add `'product_shot'` to `sourceType`; add `inputType` + `includeCleanShot` to `BatchOutfitItem` |
| `src/App.tsx` | Clean shot generation call; secondary upload UI; queue card badge; slide-indicator badge; disable regen on product slide |

No changes to `pdpPresets.ts`, `garmentSpec.ts`, or `normalizeReferenceImage.ts`.

---

## Tier Placement

**Growth tier.** Rationale:
- Flat lay input covers most brands at Starter
- Product photo input unlocks the dropshipper / no-studio segment
- The clean background shot (Output 1) is an immediate hook — useful before they even generate on-model images
- Upgrade story from Starter: "Don't have flat lays? Upload any product photo — we'll clean it up and put it on a model."

---

## Out of Scope

- Back product shot (clean background from back angle) — front only
- Batch product photo upload — one at a time to start
- Auto-detect input type (flat lay vs. hanger) — user selects manually
