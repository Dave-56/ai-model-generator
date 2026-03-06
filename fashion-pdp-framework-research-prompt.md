# Manus Research Prompt: Fashion PDP Visual Framework

## What We're Building
We are building an AI fashion photography platform that generates on-model product images from flat-lay photos for Shopify brands. We need to define a rigorous **Fashion PDP (Product Detail Page) Visual Framework** — a set of evidence-based standards that govern what "correct" fashion e-commerce imagery looks like across pose, expression, styling energy, garment category, and brand tier.

This framework will directly inform:
- The default pose/styling direction presets in our product
- The prompts we send to our AI image generation model
- How we advise brand owners on what imagery to produce

We need this to be grounded in actual industry practice, conversion research, and what top fashion e-commerce brands do — not opinion.

---

## Research Brief

### 1. The "Fashion PDP Neutral" — What Is the Industry Default Pose?

The most important question: what does the actual default "neutral" stance look like on a real fashion PDP? Not mannequin-neutral (arms rigidly at sides), but the pose that major fashion retailers use as their baseline hero shot.

Research this by analyzing the product pages of:
- **Mass market:** ASOS, H&M, Zara, Mango, Uniqlo
- **Mid-market:** Reformation, & Other Stories, COS, Arket, Reiss
- **Premium/luxury:** Sandro, Maje, Ted Baker, Whistles
- **Streetwear/youth:** ASOS Design, Weekday, Monki, Urban Outfitters
- **Activewear:** Lululemon, Gymshark, Alo Yoga, Sweaty Betty

For each, observe and document:
- Exact body position for the hero (front) shot: weight distribution, arm position, hand position, hip angle, foot stance
- Is there a consistent "industry default" across multiple retailers?
- How does this differ from a mannequin or retail catalog pose?
- What expression do models typically have (neutral, slight smile, direct gaze, looking away)?

---

### 2. Pose Standards by Garment Category

Does the correct PDP pose change depending on what garment is being shown? Research whether top retailers use different stances for different product types:

| Category | Hypothesis to validate |
| :--- | :--- |
| Dresses / Skirts | More movement, slight turn to show silhouette |
| Tops / Blouses | Neutral but arms positioned to show sleeve detail |
| Trousers / Jeans | Weight shift, one leg slightly forward to show leg line |
| Outerwear / Jackets | Open/held jacket, slight angle to show layering |
| Knitwear / Loungewear | Relaxed, softer pose |
| Activewear | Stronger stance, more dynamic energy |
| Occasion / Formal wear | More upright, elegant posture |
| Swimwear / Lingerie | Specific conventions around confidence and body language |

For each category: what arm, hand, hip, and foot positions are standard? What expression and energy level?

---

### 3. Angle Conventions — What Views Do Retailers Actually Use?

We currently generate front, three-quarter (30° turn), and back. Research whether this is the actual industry standard or whether conventions vary:

- What is the exact degree of the "three-quarter" turn? Is it 30°, 45°, or something else?
- Do retailers consistently use back shots? For which categories is back mandatory (e.g. outerwear, swimwear) vs. rarely used?
- Are there additional angles we're missing — e.g. side profile (90°), detail close-ups, seated?
- How many total images does a typical Shopify fashion PDP have? What is the breakdown of angle types?
- Is there evidence (conversion studies, A/B tests, industry reports) on which angles drive the most engagement or conversion?

---

### 4. Brand Tier and Styling Energy

Does the "energy" or mood of the model differ by brand tier or aesthetic? Research and document the visual vocabulary of:

- **Clean / Minimal** (COS, Uniqlo, Arket): posture, expression, energy level
- **Accessible / Friendly** (H&M, ASOS): posture, expression, energy level
- **Editorial / Aspirational** (Zara, Mango, Reformation): posture, expression, energy level
- **Premium / Luxe** (Sandro, Reiss, Ted Baker): posture, expression, energy level
- **Streetwear / Youth** (Urban Outfitters, Weekday): posture, expression, energy level
- **Athletic / Performance** (Lululemon, Gymshark): posture, expression, energy level

For each: how would you describe the model's body language in one sentence? What is the hand position? Where is the gaze directed?

---

### 5. Background and Lighting Standards by Tier

- What backgrounds do retailers use at each brand tier (pure white, off-white, grey, gradient, textured, lifestyle)?
- Is there a standard lighting approach (soft even light, directional, high contrast)?
- Do backgrounds correlate with brand positioning?
- What are the technical specs: is there a standard aspect ratio for fashion PDP? (2:3, 3:4, 1:1 for mobile?)

---

### 6. Conversion Research — What Actually Sells

Find any published research, A/B test results, or industry reports on:
- Does on-model imagery outperform flat-lay in conversion? By how much?
- Do multiple angles increase conversion vs. a single hero shot?
- Does model diversity (ethnicity, body type) affect conversion or trust metrics?
- Does "lifestyle" context (model in a setting) vs. "studio" (plain background) perform better for different categories or brand tiers?
- Any data on the impact of model expression (smiling vs. neutral) on conversion

Sources to check: Shopify blog, Baymard Institute, Nosto, Yotpo, Nielsen Norman Group, IXIS, Econsultancy, any fashion-specific conversion studies.

---

### 7. The Complete PDP Image Set — What Does a "Done" Catalog Listing Look Like?

For a typical Shopify fashion product that is performing well, document the complete image set:
- How many images total?
- What is each image's purpose (hero, angle, detail, scale/fit, lifestyle)?
- Is there a standard ordering convention?
- What do the top-converting Shopify fashion stores have in common in their product gallery?

---

## Deliverable

Produce a structured **Fashion PDP Visual Framework** document with:

1. **The Universal PDP Neutral** — a precise, replicable description of the industry-standard default pose (can be used as an AI image generation prompt)
2. **Pose Standards by Garment Category** — a table with specific pose descriptions per category
3. **Styling Energy Profiles** — 4–6 named profiles with precise body language descriptions, each mapped to brand tier/aesthetic
4. **Angle and Image Set Standards** — what views to generate, in what order, for what categories
5. **Background and Lighting Standards** — what works at each brand tier
6. **Key Conversion Insights** — 5–10 evidence-based findings that should directly inform our product decisions

The output should be specific enough to write AI image generation prompts from. Avoid vague language like "natural" or "relaxed" — describe exact body positions, weight distribution, arm and hand placement, and gaze direction.
