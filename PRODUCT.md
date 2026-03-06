# Product North Star

## Core Value Proposition

**"Turn your flat-lays into high-end studio shots in 60 seconds. Save $15,000/year on photoshoots and launch your collections 10x faster."**

Every product decision, every feature, every UX tradeoff should be tested against this statement.
If a feature doesn't make it faster or cheaper for a Shopify brand owner to get their product live with professional on-model photos, it doesn't ship.

---

## The Pain Hierarchy (Validated by Research)

Understanding what merchants actually feel, in order of urgency:

**Level 0 — The Burning Pain (why they open their wallet)**
- "I can't afford to shoot everything on a model" — a small brand spends $10,000–$24,000/year on traditional photoshoots
- "My photos look amateur" — they're losing customers who don't trust the brand
- Every 3-week shoot delay costs ~$6,000 in lost sales per product line

**Level 1 — The Operational Pain (why they stay)**
- "It takes too long to get my products live" — 120+ hours/year lost to shoot planning, execution, and editing
- New collection arrives, can't launch without photos

**Level 2 — The Brand Pain (why they never leave)**
- "My catalog looks inconsistent and messy" — different photographers, different lighting, different models
- This is consistency. It is real, but it is a retention driver, not an acquisition driver.

**The mistake to avoid:** leading with Level 2 (consistency) to people who are still suffering from Level 0. That's selling a uniformity tool to someone who doesn't have a uniform yet.

---

## The Evidence (Use These in Sales and Investor Conversations)

All figures sourced from Fashion PDP Visual Framework research (March 2026).

- **157% conversion increase** — Milaner (luxury retailer) switching from flat-lay to AI on-model imagery (Milaner case study). Use with context: this is a luxury retailer result, not a general benchmark.
- **+27% sales** — DueMaternity adding a multi-angle rotating image gallery
- **83% of consumers** say high-quality product imagery is "extremely influential" in purchase decisions (1WorldSync, 2025)
- **Fewer than 3 images triggers site abandonment** (Baymard Institute usability research)
- **94% of top fashion brand product images use plain/white backgrounds** — lifestyle imagery is secondary, not hero (Path Edits, top-25 brand analysis)
- **+18% CTR, +21% sales** from slight smile vs. neutral expression for accessible/mid-market brands (PiktID A/B test, 2024)
- **71% trust increase** when brands feature diverse models (industry research) — model diversity is a conversion lever, not a nice-to-have

---

## The "Better Visuals" Definition

When a Shopify merchant says they need "better product photos", they mean three specific gaps:

- **The Trust Gap** — "I need to look like a real brand, not a side hustle"
- **The Fit Gap** — "Customers need to see how it actually looks on a body"
- **The Cost Gap** — "I can't spend $500–$1,500 per shoot day every time I drop something new"

Better visuals = high-end studio shots on a model that close all three gaps at once.

---

## Target User: The "Scaler" Brand Owner

A small to mid-size Shopify fashion brand. 5–50 SKUs per collection. ~1M+ such stores exist on Shopify. They have flat-lay photos but no budget or time for a recurring photoshoot cadence.

**What they need:**
- Professional on-model photos that don't look AI-generated
- Fast enough to keep up with new drops — product live before the weekend, not in 3 weeks
- Cheap enough that the ROI is obvious on day one

**What they fear:**
- Wasting credits on unusable images with AI artifacts
- Looking cheap or "obviously AI" on their Shopify store

---

## Acquisition → Conversion → Retention Framework

How each layer of our product maps to merchant psychology:

| Stage | Their Question | Our Answer | How We Deliver |
| :--- | :--- | :--- | :--- |
| **Acquisition** | "Is it worth trying?" | Cost + Speed | "$1 instead of $100. Live in 60 seconds." |
| **Conversion** | "Is the quality good enough?" | Quality + Fit | Garment fidelity, anatomy accuracy, realistic drape |
| **Retention** | "Can I rely on this forever?" | Consistency | Same model, same aesthetic, every drop, forever |

Consistency is our lock-in — the secret sauce — not the headline.

---

## The Consistency Engine (Our Secret Sauce)

Our technical differentiator is the ability to maintain a consistent model identity and catalog aesthetic across every SKU. Competitors cannot reliably do this.

- Same model face, body, and proportions across all products
- Same background and lighting style across all images
- Same garment hem length, fit, and draping quality across all poses
- Predictable output — what worked for SKU 1 works the same way for SKU 30

This is not the reason someone buys. It is the reason they never leave.

---

## Pose & Styling Architecture

### Why angles are fixed (non-negotiable)
The three e-commerce standard angles — **front, three-quarter, back** — are fixed structural outputs, not creative choices. This is intentional:

- Shopify PDP convention expects these three views. Buyers are trained to look for them.
- Catalog consistency requires the same structural angles across all SKUs.
- A random or AI-directed angle per SKU breaks the coherence that is our core selling point.

### Where creative direction belongs: Styling Direction (not pose)
The energy, mood, and brand character of a shoot live in the *styling direction* layer — how the model inhabits those fixed angles, not which angles are used.

- "Editorial and confident" vs. "relaxed and approachable" vs. "athletic and dynamic"
- This is a brand-level setting (saved per workspace), not a per-image toggle
- It goes into the generation prompt without changing the structural output
- Think of it as the difference between what a creative director tells the model vs. what the photographer frames

**Model generation:** rigid structure (required for reliable reference images)
**Outfit generation:** fixed angles + styling direction layer for brand character

---

## What "Done" Looks Like

A Scaler brand owner uploads 10 flat-lay images on Monday morning.
By the time their coffee is ready, they have 30 professional studio shots (10 garments × 3 angles) of the same model, same background, same energy — ready to upload to Shopify.
They spent $0 on a photographer. They spent $0 on a model. Their new collection is live before lunch.

That is the product.

---

## What We Are Not Building (MVP)

- Video generation
- Lifestyle / outdoor backgrounds (studio only for MVP)
- Shopify direct API integration
- Real-time generation preview
- Custom model training on merchant-provided photos

These may be right for a later phase. They are not what gets the Scaler from flat-lay to Shopify listing in 60 seconds.

---

## Competitor Failure Modes to Avoid

From Shopify App Store reviews of Botika, SellerPic, Modelia:

1. **Credit waste on bad images** — merchants abandon apps that charge for unusable output. Our quality controls (garment spec extraction, length anchor, identity preservation, ThinkingLevel.HIGH) must be non-negotiable, never traded for speed.
2. **Inconsistency across SKUs** — the #1 reason merchants churn. One bad-looking image in a catalog breaks the whole store's aesthetic.
3. **Opaque billing** — merchants need to know exactly what a generation costs before they run it.
4. **Anatomy errors** — twisted hands, floating garments, proportional errors. Our pipeline must visibly outperform competitors here. This is a marketing claim we can make and prove.
