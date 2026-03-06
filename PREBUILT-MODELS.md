# Pre-Built Model Library

## Approach: Pre-generate offline, ship as static config

Run the existing model builder pipeline manually to generate a curated set of diverse models.
Store output images in Vercel Blob. Ship URLs + metadata as `src/prebuiltModels.ts`.

Zero runtime generation cost. Zero latency. You control quality exactly.

---

## Implementation Plan

### 1. Generate the models
Use the existing `handleGenerate()` flow in the app. For each model, generate at least the front hero shot (contrapposto, white studio, full-length 2:3). Optionally generate a second neutral angle for stronger identity anchoring during outfit generation.

### 2. Store images
Upload to Vercel Blob (already wired). Save the https URL.

### 3. Ship as static config
```ts
// src/prebuiltModels.ts
export const PREBUILT_MODELS: PrebuiltModel[] = [
  {
    id: 'model-maya',
    name: 'Maya',
    descriptor: '20s · South Asian · Petite',
    imageUrl: 'https://...',
    tier: 'free' | 'paid',
    tags: {
      gender: 'female',
      ageRange: '18-25',
      ethnicity: 'south-asian',
      bodyBuild: 'slim',
      skinTone: 'medium',
    },
    attributes: { /* full ModelAttributes object */ }
  },
  ...
]
```

### 4. UI
Gallery grid in the "Model" tab. Each card shows the model image, name, and descriptor.
Free-tier users see all models but locked ones are blurred with an upgrade prompt.
Selecting a model sets it as the active brand model — same as generating your own.

---

## UX Decision: Pick-and-Lock

Pre-built models are **pick-and-lock**, not a starting point for customisation.

Rationale:
- Simpler mental model — "this is your brand's model"
- Aligns with the consistency engine pitch — same model, every drop, forever
- Custom model builder remains the path for brands who want full control

Users can always switch to the model builder tab to create their own.

---

## The Model Set — 20 Models

Covers gender, ethnicity, body build, and age range. Enough diversity for any Shopify brand's target demographic.

### Women (13)

| ID | Name | Age Range | Ethnicity | Body Build | Skin Tone | Tier |
|---|---|---|---|---|---|---|
| model-w-01 | Maya | 20s | South Asian | Slim | Medium | Free |
| model-w-02 | Amara | 20s | Black / West African | Athletic | Deep | Free |
| model-w-03 | Chloe | 20s | White / Northern European | Slim | Fair | Free |
| model-w-04 | Sofia | 30s | Latina / Hispanic | Curvy | Medium-Deep | Paid |
| model-w-05 | Yuna | 20s | East Asian | Slim | Light | Paid |
| model-w-06 | Layla | 20s | Middle Eastern | Slim | Medium | Paid |
| model-w-07 | Nia | 30s | Black / East African | Slim | Deep | Paid |
| model-w-08 | Priya | 30s | South Asian | Curvy | Medium | Paid |
| model-w-09 | Elena | 30s | White / Southern European | Athletic | Medium | Paid |
| model-w-10 | Keiko | 20s | East Asian | Athletic | Light-Medium | Paid |
| model-w-11 | Fatima | 20s | North African | Slim | Medium | Paid |
| model-w-12 | Rosa | 40s | Latina / Hispanic | Curvy | Medium | Paid |
| model-w-13 | Ingrid | 30s | White / Scandinavian | Athletic | Fair | Paid |

### Men (7)

| ID | Name | Age Range | Ethnicity | Body Build | Skin Tone | Tier |
|---|---|---|---|---|---|---|
| model-m-01 | James | 20s | Black / West African | Athletic | Deep | Free |
| model-m-02 | Luca | 20s | White / Southern European | Slim | Medium | Free |
| model-m-03 | Kai | 20s | East Asian | Slim | Light | Paid |
| model-m-04 | Andre | 30s | Black / West African | Muscular | Deep | Paid |
| model-m-05 | Carlos | 30s | Latina / Hispanic | Athletic | Medium | Paid |
| model-m-06 | Rohan | 20s | South Asian | Slim | Medium | Paid |
| model-m-07 | Erik | 30s | White / Northern European | Athletic | Fair | Paid |

---

## Tier Gating

**Free:** Maya (W), Amara (W), Chloe (W), James (M), Luca (M) — 5 models, mixed ethnicity, one of each major demographic

**Paid (Starter+):** Full library of 20

The free models are selected to be genuinely useful — not deliberately bad — but limited enough that a brand targeting a specific demographic will likely need to upgrade. A brand targeting South Asian or East Asian women, for example, finds their demographic locked.

Locked models show as blurred thumbnails with an upgrade CTA. Users can see the full range exists — this is intentional. The diversity gap creates the upgrade motivation.

---

## Generation Spec

When generating each model, use these settings to ensure consistency across the library:

- **Style:** White studio, soft even lighting, full-length 2:3
- **Pose:** Universal PDP Neutral — contrapposto, weight on rear leg, slight hip shift, hands relaxed
- **Expression:** Slight smile (accessible warmth — works across the widest range of brand styles)
- **Background:** Pure white
- **ThinkingLevel:** HIGH
- **Temperature:** 0.4
- **Output size:** 1K, 2:3

All 20 models should feel like they came from the same shoot. Consistent lighting and pose is more important than any individual model looking "perfect."

---

## What Each Model Needs Before Shipping

- [ ] Front hero image (contrapposto, full-length, white studio)
- [ ] Image reviewed — no anatomy errors, no floating garments, clean hands
- [ ] Cropped to 2:3 via `deterministicCrop`
- [ ] Uploaded to Vercel Blob — https URL confirmed live
- [ ] `ModelAttributes` object filled in and saved to config
- [ ] Descriptor tag written (age · ethnicity · build)
- [ ] Tier assigned (free / paid)

---

## Open Questions

- [ ] Do we generate a second reference angle per model (e.g. 3/4) to improve outfit generation identity anchoring? Adds ~20 more images to generate but may improve consistency.
- [ ] Do we show model attributes (ethnicity, build) as visible filter tags in the UI, or keep it purely visual? (Visual-only is less clinical but harder to navigate at 20 models)
- [ ] Can users "favourite" a pre-built model and have it persist across sessions? Needs auth to be useful.
- [ ] If a user picks a pre-built model, can they still customise it (e.g. change hair colour)? Currently scoped as pick-and-lock — revisit post-launch.
