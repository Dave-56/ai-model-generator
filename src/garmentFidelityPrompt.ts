import type { PdpStylePreset, AnglePreset } from './types';

/**
 * Garment-fidelity prompt for "flat lay → dressed model" flow.
 * Used with Nano Banana 2 (Gemini 3.1 Flash Image). The garment in the output
 * must match the flat lay exactly (detail-lock: buttons, zippers, logos, etc.).
 *
 * Inputs to the model are expected to be:
 * 1) Flat lay image (garment to copy)
 * 2) Model reference image (person to keep consistent)
 * 3) This text prompt (with angle + style snippets filled)
 */
const GARMENT_FIDELITY_INSTRUCTIONS = `You are given two images:
1) A flat lay product photo of a single garment (clothing item).
2) A reference photo of a fashion model (full body, same person to keep consistent).

TASK: Generate a new image of the SAME person as in image 2, in the same style and lighting, but wearing the EXACT garment from image 1. The garment must be placed naturally on the model's body for the requested pose.

GARMENT FIDELITY (critical — do not alter):
- Copy the garment from the flat lay exactly: same color, pattern, print, and texture.
- Preserve all visible details: buttons, zippers, logos, labels, stitching, hardware, pockets, seams.
- Do not add or remove design elements. Do not change neckline, sleeve length, or hem.
- Preserve the garment's length and hem exactly as in the flat lay; do not shorten, crop, or lengthen the item.
- Fabric must look the same (e.g. denim, knit, satin) as in the flat lay.

STYLING (standard quality — keep consistent, no random styles):
- If the flat lay shows only ONE garment (e.g. a top only, or a bottom only): replace ONLY that garment from the flat lay. Keep all other clothing exactly as in the reference model image (e.g. keep the same shorts, same bottom, same top). Do not change, replace, or invent the model's shorts or other pieces that are not in the flat lay.
- If the flat lay shows a full outfit (top and bottom), the model wears exactly those items; do not add or change other clothing.
- Never invent patterns, logos, or text that are not in the flat lay. Non-garment clothing must match the reference image and must not distract from the product.

POSE & FRAMING:
{{ANGLE_SNIPPET}}
- Full body from head to toe. Leave clear space above the head and below the feet. Do not crop the head or feet; the entire body must be visible.
- Match the reference model's pose and angle only; use consistent, centered framing with similar margins (do not copy tight or loose crop from the reference).
{{STYLE_SNIPPET}}

FOOTWEAR: Model is barefoot. No shoes.

Output: One photorealistic image, high resolution, sharp details. The person must be clearly the same as in the reference; only the clothing changes to match the flat lay garment.`;

/**
 * Builds the full garment-fidelity prompt for one pose, with angle and PDP style
 * snippets injected. Use this when generating "model dressed from flat lay" images.
 */
export function generateGarmentFidelityPrompt(
  anglePreset: AnglePreset,
  stylePreset: PdpStylePreset
): string {
  return GARMENT_FIDELITY_INSTRUCTIONS.replace('{{ANGLE_SNIPPET}}', anglePreset.promptSnippet).replace(
    '{{STYLE_SNIPPET}}',
    stylePreset.promptSnippet
  );
}
