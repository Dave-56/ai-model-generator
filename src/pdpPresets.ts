import type { PdpStylePreset, AnglePreset } from './types';

/**
 * PDP style presets. First item is the default (White Studio).
 * Do not reorder without updating default resolution in App.
 */
export const PDP_STYLE_PRESETS: PdpStylePreset[] = [
  {
    id: 'white-studio',
    label: 'White / clean studio',
    description: 'Pure or near-white background, soft even light. Classic product look, works for most retailers (e.g. ASOS, Zara). Very safe and versatile.',
    promptSnippet: 'Background: pure white (#FFFFFF). Soft, even studio lighting. Clean, minimal e-commerce look.',
  },
  {
    id: 'grey-studio',
    label: 'Grey / neutral studio',
    description: 'Light grey or neutral backdrop, soft shadows. Feels a bit more premium than pure white, still very "shop" and on-model.',
    promptSnippet: 'Background: neutral grey studio sweep. Soft, even studio lighting. Professional product photography look.',
  },
  {
    id: 'gradient-sweep',
    label: 'Gradient Sweep',
    promptSnippet: 'Background: subtle gradient sweep (light grey to white or soft tone). Even, flattering studio lighting. Modern e-commerce style.',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    promptSnippet: 'Background: contextual lifestyle setting (e.g. minimal interior, soft natural light). Relaxed, aspirational mood. Lifestyle product shot.',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    promptSnippet: 'Background: editorial style (dramatic lighting, slight shadow, high contrast). Fashion editorial photography. Bold, magazine-quality look.',
  },
];

/**
 * Angle presets. First item is the default (Front).
 * Do not reorder without updating default resolution in App.
 */
export const ANGLE_PRESETS: AnglePreset[] = [
  {
    id: 'front',
    label: 'Front',
    promptSnippet: 'Front-facing, neutral expression, confident posture. Camera directly in front.',
  },
  {
    id: 'three-quarter',
    label: 'Three-quarter',
    promptSnippet: 'Three-quarter turn: body at approximately 45° to camera. Shoulders slightly turned, natural stance. Neutral expression.',
  },
  {
    id: 'back',
    label: 'Back',
    promptSnippet: 'Back view: model facing away from camera. Full body from behind visible. Same confident posture.',
  },
];
