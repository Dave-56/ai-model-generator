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
- Fabric must look the same (e.g. denim, knit, satin) as in the flat lay.

POSE & FRAMING:
{{ANGLE_SNIPPET}}
- Full body from head to toe, same framing as the reference model image.
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
