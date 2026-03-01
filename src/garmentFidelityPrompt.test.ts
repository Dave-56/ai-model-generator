/**
 * Tests for flat-lay → dressed-model prompt generation.
 * Run with: npx vitest run src/garmentFidelityPrompt.test.ts
 * (Add vitest: npm i -D vitest, then add "test": "vitest" to package.json scripts.)
 */
import { describe, it, expect } from 'vitest';
import { generateGarmentFidelityPrompt } from './garmentFidelityPrompt';
import { ANGLE_PRESETS, PDP_STYLE_PRESETS } from './pdpPresets';

describe('generateGarmentFidelityPrompt', () => {
  it('includes the correct angle snippet for front pose', () => {
    const angle = ANGLE_PRESETS.find((p) => p.id === 'front')!;
    const style = PDP_STYLE_PRESETS[0];
    const prompt = generateGarmentFidelityPrompt(angle, style);
    expect(prompt).toContain(angle.promptSnippet);
    expect(prompt).toContain('Front-facing, neutral expression');
  });

  it('includes the correct angle snippet for three-quarter and back', () => {
    const style = PDP_STYLE_PRESETS[0];
    for (const angle of ANGLE_PRESETS) {
      const prompt = generateGarmentFidelityPrompt(angle, style);
      expect(prompt).toContain(angle.promptSnippet);
    }
  });

  it('includes the correct style snippet for white and grey studio', () => {
    const angle = ANGLE_PRESETS[0];
    for (const style of PDP_STYLE_PRESETS) {
      const prompt = generateGarmentFidelityPrompt(angle, style);
      expect(prompt).toContain(style.promptSnippet);
    }
  });

  it('has no unreplaced placeholders in the final string', () => {
    const angle = ANGLE_PRESETS[0];
    const style = PDP_STYLE_PRESETS[0];
    const prompt = generateGarmentFidelityPrompt(angle, style);
    expect(prompt).not.toMatch(/\{\{ANGLE_SNIPPET\}\}/);
    expect(prompt).not.toMatch(/\{\{STYLE_SNIPPET\}\}/);
  });

  it('includes garment fidelity instructions (detail-lock)', () => {
    const angle = ANGLE_PRESETS[0];
    const style = PDP_STYLE_PRESETS[0];
    const prompt = generateGarmentFidelityPrompt(angle, style);
    expect(prompt).toContain('GARMENT FIDELITY');
    expect(prompt).toContain('buttons');
    expect(prompt).toContain('zippers');
    expect(prompt).toContain('logos');
    expect(prompt).toContain('barefoot');
  });

  it('includes fixed styling constraints (neutral/complementary, formality, no invented branding)', () => {
    const angle = ANGLE_PRESETS[0];
    const style = PDP_STYLE_PRESETS[0];
    const prompt = generateGarmentFidelityPrompt(angle, style);
    expect(prompt).toContain('STYLING');
    expect(prompt).toContain('neutral and complementary');
    expect(prompt).toContain('Match the formality');
    expect(prompt).toContain('no invented logos');
    expect(prompt).toContain('full outfit');
  });
});
