# TODO

## Current Focus
- [x] Styling direction layer for outfit generation — infrastructure complete
- [x] 3/4 angle fixed from 30° → 45° (industry standard)
- [x] Default pose updated to contrapposto (Universal PDP Neutral from framework)
- [x] 6 styling direction presets rewritten from framework evidence
- [x] localStorage migration: clean → minimal

---

## Option A — P0: Ship to Shopify App Store
These must all be done before App Store submission. Build in this order — each step unlocks the next.

### 1. Scaffold Shopify Remix app
- [x] Run `npm init @shopify/app@latest`, choose Remix template
- [x] Verify Shopify OAuth works end-to-end (install → session → authenticated route)
- [x] Confirm App Bridge embedding works inside Shopify admin iframe
- [ ] Test canvas operations, file uploads, and lightbox UI inside the iframe — some browser APIs behave differently there
- [x] Deployment host: Vercel (matches existing Vercel Blob setup)
- [x] Deploy tiny-lemon to Vercel — https://tinylemon.vercel.app
- [x] Add all env vars to Vercel dashboard
- [x] Update `application_url` and `redirect_urls` in `shopify.app.toml` to the Vercel domain
- [x] Deploy app config via `shopify app deploy`

### 2. GDPR webhooks (App Store approval gate — do not leave for last)
- [x] Implement `customers/data_request` — returns 200, no PII stored yet
- [x] Implement `customers/redact` — returns 200, no PII stored yet
- [x] Implement `shop/redact` — deletes Shop record (cascades to all app data) + sessions
- [x] Register all three in `shopify.app.toml`

### 3. Database schema (Prisma + Neon)
- [x] `Session` table — Shopify OAuth sessions
- [x] `Shop` table — primary key is `myshopify_domain`
- [x] `Outfit` table — flat-lay uploads, garment spec, status, jobId (ready for Trigger.dev)
- [x] `GeneratedImage` table — pose results linked to outfit
- [x] `CreditBalance` table — per-shop balance
- [x] `CreditTransaction` table — usage history, purchase events
- [x] Cascade deletes on all child relations
- [x] Migration applied to Neon — all tables live
- [ ] Add `Model` table — user-generated models need their own table (see below), run migration

**Missing Model table — add before Phase 3 of step 4:**
```prisma
model Model {
  id        String   @id @default(cuid())
  shopId    String
  name      String
  gender    String
  ethnicity String
  skinTone  String
  bodyBuild String
  height    String
  hairStyle String
  hairColor String
  ageRange  String
  imageUrl  String   // Vercel Blob URL
  batchId   String   // groups multi-pose generation run
  createdAt DateTime @default(now())

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)
}
```

### 4. Migrate UI to Remix routes (decompose App.tsx)

**Decision: Polaris + Tailwind coexist**
Use Polaris for Shopify-owned UI (AppProvider, NavMenu, Toast, Modal, billing flows).
Use Tailwind for all app content UI (model builder, outfit generation, galleries).
Do not rewrite existing Tailwind components in Polaris — that's weeks of work with no user value.

**Route structure:**
```
app/routes/
  app.tsx                ← shell layout — add tab nav here (Link + useLocation)
  app._index.tsx         ← redirect → /app/dress-model
  app.model-builder.tsx  ← Model tab
  app.brand-style.tsx    ← Brand Style tab
  app.dress-model.tsx    ← Dress Model tab (main feature)
```
View modes (builder / gallery / outfit-gallery) stay as client-side state inside `app.dress-model.tsx` — they are panel states, not pages.

**Components to extract into `app/components/`:**
| Component | Source (App.tsx) | Route |
|---|---|---|
| `ModelBuilderForm` | lines ~1386–1550 | model-builder |
| `ModelGallery` | lines ~1976–2198 | model-builder |
| `BrandStyleForm` | lines ~1590–1870 | brand-style |
| `OutfitQueue` | lines ~1870–1943 | dress-model |
| `OutfitGallery` | lines ~2199–end | dress-model |
| `BuilderView` | lines ~2018–2199 | dress-model |
| `Lightbox` | scattered | shared |

**What moves to DB loaders/actions in this step:**
- Brand style prefs (`selectedStyleIds`, `selectedAngleIds`, `stylingDirectionId`) → DB loader + action (replaces localStorage)
- Model library (`generatedImages` where sourceType = model_only) → DB loader + action (needs Model table)

**What stays local state — do NOT move to DB yet:**
- `batchOutfits` — tightly coupled to job progress and cancellation, Trigger.dev owns this in step 5. Moving it now means rewriting it again in two weeks.
- `batchProgress`, lightbox, carousel, regenPoses — UI-only state, never goes to DB

**What gets removed:**
- API key gate screen — key lives server-side, no longer needed
- All localStorage reads/writes (`nanobanana_models`, `nanobanana_pdp_presets`)

**Phase 1 — Shells + navigation**
- [x] Create 3 empty route files (app.dress-model.tsx, app.model-builder.tsx, app.brand-style.tsx)
- [x] Update `app.tsx` nav — Dress model / Model builder / Brand style links via `<s-app-nav>`
- [x] `app._index.tsx` redirects to `/app/dress-model`
- [x] Removed template boilerplate (product generator, metaobject demo, app.additional.tsx)
- [ ] Verify tabs switch correctly inside Shopify admin iframe after Vercel deploys

**Phase 2 — UI components**
- [ ] Extract and mount all 7 components from App.tsx into routes
- [ ] Generation logic stays client-side (copy handlers as-is from Vite app for now)
- [ ] App looks and works correctly inside iframe

**Phase 3 — Loaders + actions** (run Model table migration first)
- [ ] Add Model table migration (`npx prisma migrate dev --name add-model-table`)
- [ ] Create Shop record on first authenticated load (post-OAuth hook)
- [ ] Brand style: loader reads from DB, action saves (replaces localStorage)
- [ ] Model library: loader reads from DB, action saves/deletes

**Phase 4 — Cleanup**
- [ ] Remove all localStorage dependencies
- [ ] Remove API key gate

### 5. Generation pipeline → Trigger.dev
- [ ] Move batch outfit generation (`handleBatchDressFromFlatLay`) into a Trigger.dev background job — serverless functions will timeout on any real batch
- [ ] Client fires job → receives `runId`
- [ ] UI polls or subscribes to job progress events via `runId` (replaces current `batchProgress` React state)
- [ ] Cancel = `cancelJob(runId)` (replaces current `cancelBatchRef`)
- [ ] Gemini API key lives server-side in the job, never sent to client

### 6. Shopify Billing API
- [ ] Define subscription tiers (credit packs or recurring plan) — App Store rules require going through Shopify Billing API, not raw Stripe
- [ ] Wire purchase flow to `credit_balance` table
- [ ] Show credit balance in UI, block generation when balance is zero

### 7. Persistent outfit library
- [ ] Falls out of steps 3–5: shop ID is the key, outfits/images stored in Neon, loaded via Remix loaders
- [ ] Replace current localStorage persistence entirely

### 8. Pre-built model library
- [ ] Pre-generate 10–20 diverse models, store as static assets or Vercel Blob
- [ ] Load as static JSON — no backend required
- [ ] Can ship this independently before steps 3–7 are done — do it early for demos

## Option B — Messaging Pass (low effort, do last)
Update what the app says about itself to reflect the pain hierarchy (lead with speed + cost, not consistency).

- [ ] Onboarding / empty state copy
- [ ] Tab names and button labels
- [ ] Landing / API key gate screen copy

## Option C — User Validation (do after Option A)
Put the app in front of 5 real Shopify brand owners. Watch them use it. Don't ask what they think — watch what they do.

- [ ] Recruit 5 Scaler brand owners (5–50 SKUs, active Shopify store)
- [ ] Define 3 tasks to observe: upload flat-lay → generate → download to Shopify
- [ ] Document where they get stuck, what they ask, what surprises them
- [ ] Update PRODUCT.md with behavioural findings

## Recommendation
**A → C → B**
A first (you need real users). C after A (you need real behaviour, not forum data). B last (messaging is the final polish, not the foundation).

---

## Pose / Styling Direction (complete)
- [x] Infrastructure: state, localStorage, UI in Brand Style tab, discoverability hint in Dress Model tab
- [x] 6 presets from Fashion PDP Framework: Minimal Clarity, Accessible Warmth, Editorial Cool, Premium Poise, Street Energy, Athletic Performance
- [x] frontSnippet + energyCue split (full injection on front, terse cue on 3/4 and back)
- [x] Free-form custom override (replaces preset entirely)
- [x] Default: Minimal Clarity (contrapposto — industry standard PDP neutral)
- [ ] Test: same garment, same model — Minimal vs Accessible vs Editorial should feel noticeably different while angles stay identical

## Back View (next decision)
Framework confirms back view is category-dependent, not brand-level.
- [ ] Make back view optional per outfit (not a brand setting)
- [ ] Consider: auto-suggest back=on for dresses, outerwear, swimwear, activewear based on garment spec
