import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  History, 
  Settings, 
  User, 
  Plus, 
  Download, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  Loader2, 
  Image as ImageIcon,
  RefreshCw,
  Copy,
  Check,
  Sun,
  Moon,
  Maximize2,
  X
} from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ModelAttributes, GeneratedImage, ViewMode, PdpStylePreset, AnglePreset } from './types';
import { PDP_STYLE_PRESETS, ANGLE_PRESETS } from './pdpPresets';
import { buildPromptFromSpec } from './garmentFidelityPrompt';
import { normalizeReferenceImage } from './normalizeReferenceImage';
import { extractGarmentSpec } from './garmentSpec';
import { cropToTargetAspectRatio } from './deterministicCrop';

// Extend Window interface for AI Studio API key selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

/** Extract base64 from a GeneratedImage (data URL or fetch remote). Used for dress-model ref and pre-fetch. */
async function extractBase64FromImage(img: { url: string }): Promise<string | null> {
  if (img.url.startsWith('data:')) {
    return img.url.split(',')[1] ?? null;
  }
  if (img.url.startsWith('http')) {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return dataUrl.split(',')[1] ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

const DEFAULT_ATTRIBUTES: ModelAttributes = {
  name: '',
  gender: 'Female',
  ethnicity: 'Black / African Descent',
  skinTone: 'Deep Ebony',
  bodyBuild: 'Slender / Slim',
  height: '5\'10" (178cm)',
  hairStyle: 'Buzz cut',
  hairColor: 'Black',
  ageRange: '18–24'
};

const OPTIONS = {
  ethnicities: ['Black / African Descent', 'East Asian', 'South Asian', 'Hispanic / Latino', 'Middle Eastern', 'White / Caucasian', 'Mixed / Multi-racial', 'Indigenous / Native'],
  skinTones: ['Fair / Porcelain', 'Light / Ivory', 'Medium / Olive', 'Tan / Bronze', 'Rich Caramel', 'Deep Ebony'],
  bodyBuilds: {
    'Female': ['Slender / Slim', 'Athletic / Toned', 'Curvy / Hourglass', 'Petite', 'Pear Shaped', 'Average'],
    'Male': ['Slender / Slim', 'Athletic / Toned', 'Muscular / Buff', 'Broad Shoulders', 'V-Taper', 'Average'],
    'Non-binary': ['Slender / Slim', 'Athletic / Toned', 'Petite', 'Muscular', 'Androgynous', 'Average']
  } as Record<string, string[]>,
  heights: ['5\'2" (157cm)', '5\'5" (165cm)', '5\'8" (173cm)', '5\'10" (178cm)', '6\'0" (183cm)'],
  ageRanges: ['18–24', '25–34', '35–44', '45–54', '55+'],
  hairStyles: {
    'Female': ['Pixie cut', 'Bob', 'Shoulder length', 'Long straight', 'Long wavy', 'Curly / Afro', 'Braids / Locs', 'Ponytail', 'Bun', 'Bald'],
    'Male': ['Buzz cut', 'Crew cut', 'Undercut', 'Pompadour', 'Short messy', 'Man bun', 'Bald', 'Braids / Locs'],
    'Non-binary': ['Buzz cut', 'Pixie cut', 'Bob', 'Shoulder length', 'Long straight', 'Long wavy', 'Curly / Afro', 'Braids / Locs', 'Bald', 'Androgynous']
  } as Record<string, string[]>,
  hairColors: ['Black', 'Dark Brown', 'Light Brown', 'Blonde', 'Red / Auburn', 'Grey / Silver', 'Platinum Blonde']
};

const SKIN_TONE_COLORS: Record<string, string> = {
  'Fair / Porcelain': '#FAD7B1',
  'Light / Ivory': '#F1C27D',
  'Medium / Olive': '#E0AC69',
  'Tan / Bronze': '#C68642',
  'Rich Caramel': '#8D5524',
  'Deep Ebony': '#3C2E28'
};

const ETHNICITY_PRESETS: Record<string, Record<string, Partial<ModelAttributes>>> = {
  'Black / African Descent': {
    'Female': { skinTone: 'Deep Ebony', hairStyle: 'Braids / Locs', hairColor: 'Black', bodyBuild: 'Curvy / Hourglass', height: '5\'10" (178cm)' },
    'Male': { skinTone: 'Deep Ebony', hairStyle: 'Buzz cut', hairColor: 'Black', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Deep Ebony', hairStyle: 'Braids / Locs', hairColor: 'Black', bodyBuild: 'Athletic / Toned', height: '5\'8" (173cm)' }
  },
  'East Asian': {
    'Female': { skinTone: 'Fair / Porcelain', hairStyle: 'Long straight', hairColor: 'Black', bodyBuild: 'Slender / Slim', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Fair / Porcelain', hairStyle: 'Short messy', hairColor: 'Black', bodyBuild: 'Slender / Slim', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Fair / Porcelain', hairStyle: 'Bob', hairColor: 'Black', bodyBuild: 'Slender / Slim', height: '5\'5" (165cm)' }
  },
  'South Asian': {
    'Female': { skinTone: 'Tan / Bronze', hairStyle: 'Long wavy', hairColor: 'Black', bodyBuild: 'Slender / Slim', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Tan / Bronze', hairStyle: 'Short messy', hairColor: 'Black', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Tan / Bronze', hairStyle: 'Shoulder length', hairColor: 'Black', bodyBuild: 'Average', height: '5\'5" (165cm)' }
  },
  'Hispanic / Latino': {
    'Female': { skinTone: 'Medium / Olive', hairStyle: 'Long wavy', hairColor: 'Dark Brown', bodyBuild: 'Curvy / Hourglass', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Medium / Olive', hairStyle: 'Short messy', hairColor: 'Dark Brown', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Medium / Olive', hairStyle: 'Shoulder length', hairColor: 'Dark Brown', bodyBuild: 'Average', height: '5\'5" (165cm)' }
  },
  'Middle Eastern': {
    'Female': { skinTone: 'Medium / Olive', hairStyle: 'Long wavy', hairColor: 'Black', bodyBuild: 'Slender / Slim', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Medium / Olive', hairStyle: 'Short messy', hairColor: 'Black', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Medium / Olive', hairStyle: 'Shoulder length', hairColor: 'Black', bodyBuild: 'Average', height: '5\'5" (165cm)' }
  },
  'White / Caucasian': {
    'Female': { skinTone: 'Light / Ivory', hairStyle: 'Long wavy', hairColor: 'Blonde', bodyBuild: 'Slender / Slim', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Light / Ivory', hairStyle: 'Short messy', hairColor: 'Light Brown', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Light / Ivory', hairStyle: 'Shoulder length', hairColor: 'Light Brown', bodyBuild: 'Average', height: '5\'5" (165cm)' }
  },
  'Mixed / Multi-racial': {
    'Female': { skinTone: 'Tan / Bronze', hairStyle: 'Curly / Afro', hairColor: 'Dark Brown', bodyBuild: 'Athletic / Toned', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Tan / Bronze', hairStyle: 'Short messy', hairColor: 'Dark Brown', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Tan / Bronze', hairStyle: 'Curly / Afro', hairColor: 'Dark Brown', bodyBuild: 'Average', height: '5\'5" (165cm)' }
  },
  'Indigenous / Native': {
    'Female': { skinTone: 'Tan / Bronze', hairStyle: 'Long straight', hairColor: 'Black', bodyBuild: 'Slender / Slim', height: '5\'5" (165cm)' },
    'Male': { skinTone: 'Tan / Bronze', hairStyle: 'Long straight', hairColor: 'Black', bodyBuild: 'Athletic / Toned', height: '5\'10" (178cm)' },
    'Non-binary': { skinTone: 'Tan / Bronze', hairStyle: 'Long straight', hairColor: 'Black', bodyBuild: 'Average', height: '5\'5" (165cm)' }
  }
};

const MAX_SAVED_MODELS = 50; // Blob URLs are small; only old base64 data could hit quota

const Logo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <circle cx="35" cy="35" r="28" />
    <circle cx="65" cy="35" r="28" />
    <circle cx="35" cy="65" r="28" />
    <circle cx="65" cy="65" r="28" />
    <path d="M 45 55 Q 55 55 55 45" stroke="white" strokeWidth="12" fill="none" strokeLinecap="round" transform="rotate(180 50 50)" />
  </svg>
);

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  const [attributes, setAttributes] = useState<ModelAttributes>(DEFAULT_ATTRIBUTES);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [isGeneratingOutfit, setIsGeneratingOutfit] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number; label?: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => {
    try {
      const saved = localStorage.getItem('nanobanana_models');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading saved models:", e);
      return [];
    }
  });
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  /** Per-batch index for gallery carousel (which pose is shown in each card). */
  const [galleryBatchIndex, setGalleryBatchIndex] = useState<Record<string, number>>({});

  // Brand PDP style (separate from model). Multi-select; used for fashion PDP photoshoots.
  const [activeTab, setActiveTab] = useState<'model' | 'brand-style' | 'dress-model'>('model');
  // Dress model (flat lay) flow: front flat lay (required) + optional back flat lay.
  const [flatLayFrontDataUrl, setFlatLayFrontDataUrl] = useState<string | null>(null);
  const [flatLayBackDataUrl, setFlatLayBackDataUrl] = useState<string | null>(null);
  const [dressModelSkuName, setDressModelSkuName] = useState('');
  const [selectedDressBatchId, setSelectedDressBatchId] = useState<string | null>(null);
  const [dressModelError, setDressModelError] = useState<string | null>(null);
  /** Pre-fetched model ref base64 for the selected dress batch; avoids delay when user clicks Generate. */
  const dressModelRefCache = useRef<{ batchId: string; base64: string | null }>({ batchId: '', base64: null });
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nanobanana_pdp_presets');
      if (saved) {
        const parsed = JSON.parse(saved) as { styleId?: string; styleIds?: string[] };
        if (Array.isArray(parsed.styleIds) && parsed.styleIds.length > 0) {
          const valid = parsed.styleIds.filter((id: string) => PDP_STYLE_PRESETS.some(p => p.id === id));
          if (valid.length > 0) return valid;
        }
        if (parsed.styleId && PDP_STYLE_PRESETS.some(p => p.id === parsed.styleId)) return [parsed.styleId];
      }
    } catch (_) {}
    return [PDP_STYLE_PRESETS[0].id];
  });
  // Multiple angles per PDP (e.g. front, 3/4, back) — default all three.
  const [selectedAngleIds, setSelectedAngleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nanobanana_pdp_presets');
      if (saved) {
        const parsed = JSON.parse(saved) as { angleId?: string; angleIds?: string[] };
        if (Array.isArray(parsed.angleIds) && parsed.angleIds.length > 0) {
          const valid = parsed.angleIds.filter((id: string) => ANGLE_PRESETS.some(p => p.id === id));
          if (valid.length > 0) return valid;
        }
        if (parsed.angleId && ANGLE_PRESETS.some(p => p.id === parsed.angleId)) return [parsed.angleId];
      }
    } catch (_) {}
    return ANGLE_PRESETS.map(p => p.id);
  });

  const [brandStyleSaveFeedback, setBrandStyleSaveFeedback] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('nanobanana_pdp_presets', JSON.stringify({ styleIds: selectedStyleIds, angleIds: selectedAngleIds }));
    } catch (_) {}
  }, [selectedStyleIds, selectedAngleIds]);

  const handleSaveBrandStyle = () => {
    try {
      localStorage.setItem('nanobanana_pdp_presets', JSON.stringify({ styleIds: selectedStyleIds, angleIds: selectedAngleIds }));
      setBrandStyleSaveFeedback(true);
      window.setTimeout(() => setBrandStyleSaveFeedback(false), 2000);
    } catch (_) {}
  };

  const toggleAngleId = (angleId: string) => {
    setSelectedAngleIds(prev => {
      const next = prev.includes(angleId) ? prev.filter(id => id !== angleId) : [...prev, angleId];
      return next.length > 0 ? next : prev;
    });
  };

  const toggleStyleId = (styleId: string) => {
    setSelectedStyleIds(prev => {
      const next = prev.includes(styleId) ? prev.filter(id => id !== styleId) : [...prev, styleId];
      return next.length > 0 ? next : [PDP_STYLE_PRESETS[0].id];
    });
  };

  useEffect(() => {
    try {
      // Only persist images with http(s) URLs to avoid QuotaExceededError (base64 data URLs are huge)
      const toSave = generatedImages
        .filter((img) => img.url.startsWith('http'))
        .slice(0, MAX_SAVED_MODELS);
      localStorage.setItem('nanobanana_models', JSON.stringify(toSave));
      setError((prev) => (prev?.includes('Gallery storage') ? null : prev));
    } catch (e: any) {
      console.error("Error saving models to local storage:", e);
      if (e?.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem('nanobanana_models');
          setError(null);
        } catch {
          setError("Gallery storage is full. Clear site data for this app or use fewer saved models.");
        }
      }
    }
  }, [generatedImages]);

  // Pre-fetch model ref base64 when selected dress batch changes so Generate starts faster
  useEffect(() => {
    const byBatch = new Map<string, GeneratedImage[]>();
    for (const img of generatedImages) {
      const bid = img.batchId ?? img.id;
      if (!byBatch.has(bid)) byBatch.set(bid, []);
      byBatch.get(bid)!.push(img);
    }
    const effectiveBatchId =
      selectedDressBatchId ??
      (currentImage ? (currentImage.batchId ?? currentImage.id) : null) ??
      (generatedImages[0] ? (generatedImages[0].batchId ?? generatedImages[0].id) : null);
    const batchImages: GeneratedImage[] = effectiveBatchId
      ? (byBatch.get(effectiveBatchId) ?? []).slice().sort((a, b) => a.timestamp - b.timestamp)
      : [];
    if (batchImages.length === 0) return;
    const refFrontImg = batchImages.find((img) => img.angleId === 'front') ?? batchImages[0];
    if (dressModelRefCache.current.batchId === effectiveBatchId && dressModelRefCache.current.base64) return;
    let cancelled = false;
    extractBase64FromImage(refFrontImg).then((base64) => {
      if (!cancelled && base64) dressModelRefCache.current = { batchId: effectiveBatchId!, base64 };
    });
    return () => {
      cancelled = true;
    };
  }, [generatedImages, selectedDressBatchId, currentImage?.id, currentImage?.batchId]);

  useEffect(() => {
    checkApiKey();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Default builder to latest model's front pose when we have no selection or current image is an outfit
  useEffect(() => {
    if (viewMode !== 'builder') return;
    if (currentImage !== null && currentImage.sourceType !== 'flat_lay') return;
    const modelOnly = generatedImages.filter(img => img.sourceType !== 'flat_lay');
    if (modelOnly.length === 0) return;
    const byBatch = new Map<string, GeneratedImage[]>();
    for (const img of modelOnly) {
      const bid = img.batchId ?? img.id;
      if (!byBatch.has(bid)) byBatch.set(bid, []);
      byBatch.get(bid)!.push(img);
    }
    const batches = Array.from(byBatch.entries()).map(([batchId, imgs]) => ({
      batchId,
      images: imgs.sort((a, b) => a.timestamp - b.timestamp),
    }));
    const latestBatch = batches.sort((a, b) => {
      const aMax = Math.max(...a.images.map(i => i.timestamp));
      const bMax = Math.max(...b.images.map(i => i.timestamp));
      return bMax - aMax;
    })[0];
    if (!latestBatch || latestBatch.images.length === 0) return;
    const frontPose = latestBatch.images.find(img => img.angleId === 'front') ?? latestBatch.images[0];
    setCurrentImage(frontPose);
    if (frontPose.attributes) setAttributes(frontPose.attributes);
  }, [viewMode, generatedImages]);

  const updateAttribute = (key: keyof ModelAttributes, value: string) => {
    setAttributes(prev => ({ ...prev, [key]: value }));
    setValidationErrors(prev => prev.filter(err => !err.toLowerCase().includes(key.toLowerCase())));
    if (error && error.includes("complete the model profile")) {
      setError(null);
    }
  };

  // Update body build and hair style if they're not valid for the current gender
  // AND apply presets if not customizing
  useEffect(() => {
    const gender = attributes.gender;
    const ethnicity = attributes.ethnicity;
    
    if (!isCustomizing && ethnicity && gender) {
      const ethnicityData = ETHNICITY_PRESETS[ethnicity];
      if (ethnicityData) {
        const preset = ethnicityData[gender] || ethnicityData['Non-binary'];
        if (preset) {
          setAttributes(prev => ({ ...prev, ...preset }));
          return; // Preset application handles validity
        }
      }
    }

    // Fallback validity check if customizing or no preset
    const validBuilds = OPTIONS.bodyBuilds[gender] || OPTIONS.bodyBuilds['Non-binary'];
    if (validBuilds && !validBuilds.includes(attributes.bodyBuild)) {
      setAttributes(prev => ({ ...prev, bodyBuild: validBuilds[0] }));
    }

    const validHairStyles = OPTIONS.hairStyles[gender] || OPTIONS.hairStyles['Non-binary'];
    if (validHairStyles && !validHairStyles.includes(attributes.hairStyle)) {
      setAttributes(prev => ({ ...prev, hairStyle: validHairStyles[0] }));
    }
  }, [attributes.gender, attributes.ethnicity, isCustomizing]);

  const checkApiKey = async () => {
    try {
      // Use key from .env when running locally
      if (process.env.GEMINI_API_KEY?.trim()) {
        setHasApiKey(true);
        return;
      }
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    } catch (e) {
      console.error("Error checking API key:", e);
    }
  };

  const handleSelectKey = async () => {
    try {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } else {
        setError("API Key selector is not available in this environment.");
      }
    } catch (e) {
      console.error("Error opening key selector:", e);
      setError("Failed to open API key selector.");
    }
  };

  const generatePrompt = (attrs: ModelAttributes, stylePreset: PdpStylePreset, anglePreset: AnglePreset) => {
    const namePart = attrs.name ? `Name: ${attrs.name}\n` : '';
    return `Generate a photorealistic fashion model portrait with these attributes:

${namePart}Gender: ${attrs.gender}
Ethnicity: ${attrs.ethnicity}
Skin tone: ${attrs.skinTone}
Body build: ${attrs.bodyBuild}
Height: ${attrs.height}
Hair: ${attrs.hairStyle}, ${attrs.hairColor}
Age range: ${attrs.ageRange}

REQUIREMENTS:
- ${stylePreset.promptSnippet}
- ${anglePreset.promptSnippet}
- Full body portrait from head to toe
- IMPORTANT: Must not crop head or feet. The entire body from head to toes must be visible.
- 2:3 portrait framing. Center the model with even margins on all sides.
- OUTFIT (locked — use this exact description every time, no variation): Black short-sleeve fitted crop top ending at midriff. Black high-waist short shorts (hotpants length, upper thigh only). Same garment style for all models.
- Footwear: Model must be BAREFOOT. No shoes, no heels, no sandals, no footwear of any kind.
- High resolution, sharp details
- The model should look like a real person, not AI-generated`;
  };

  const handleGenerate = async (useReference = false) => {
    if (!hasApiKey) {
      await handleSelectKey();
      return;
    }

    const errors: string[] = [];
    if (!attributes.name.trim()) errors.push('Model Name is required');
    else {
      const nameLower = attributes.name.trim().toLowerCase();
      if (generatedImages.some((img) => img.attributes.name.trim().toLowerCase() === nameLower)) {
        errors.push('Model name must be unique');
      }
    }
    const requiredFields = ['gender', 'ethnicity', 'skinTone', 'bodyBuild', 'height', 'hairStyle', 'hairColor', 'ageRange'];
    requiredFields.forEach(field => {
      if (!attributes[field as keyof ModelAttributes]) errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
    });
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError("Please complete the model profile before generating.");
      const customizationFields = ['skinTone', 'bodyBuild', 'height', 'hairStyle', 'hairColor'];
      if (errors.some(err => customizationFields.some(field => err.toLowerCase().includes(field.toLowerCase())))) setIsCustomizing(true);
      return;
    }

    setValidationErrors([]);
    setIsGeneratingModel(true);
    setCurrentImage(null);
    setError(null);
    setViewMode('builder');

    const stylePresets = selectedStyleIds
      .map(id => PDP_STYLE_PRESETS.find(p => p.id === id))
      .filter((p): p is PdpStylePreset => !!p);
    if (stylePresets.length === 0) stylePresets.push(PDP_STYLE_PRESETS[0]);
    const anglePresetsOrdered = ANGLE_PRESETS.filter(p => selectedAngleIds.includes(p.id));
    const anglePresetsList = anglePresetsOrdered.length > 0 ? anglePresetsOrdered : [ANGLE_PRESETS[0]];
    const totalImages = anglePresetsList.length * stylePresets.length;
    const runId = Date.now().toString(36).slice(-6);

    try {
      console.log(`[model-gen ${runId}] Starting: ${anglePresetsList.length} angle(s) × ${stylePresets.length} style(s) = ${totalImages} image(s)`);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const batchId = Math.random().toString(36).substring(7);
      let workingAttributes = { ...attributes };
      let firstGeneratedImage: GeneratedImage | null = null;
      let imageCount = 0;

      // Angle-outer, style-inner: first style at each angle becomes the reference
      // for subsequent styles at that same angle (avoids cross-style contamination).
      for (let ai_idx = 0; ai_idx < anglePresetsList.length; ai_idx++) {
        const anglePreset = anglePresetsList[ai_idx];
        let angleRefImage: GeneratedImage | null = null;

        for (let si = 0; si < stylePresets.length; si++) {
          const stylePreset = stylePresets[si];
          imageCount++;
          setGeneratingProgress({ current: imageCount, total: totalImages });

          const imageLabel = `${anglePreset.id}/${stylePreset.id} (${imageCount}/${totalImages})`;
          console.log(`[model-gen ${runId}] Image ${imageLabel}: request start`);

          const isReference = firstGeneratedImage !== null;
          let prompt: string;
          const parts: any[] = [];

          if (isReference && firstGeneratedImage) {
            const refImage = angleRefImage ?? firstGeneratedImage;
            prompt = `You are given a reference photo of a fashion model. Generate a NEW image of this EXACT same person.

IDENTITY PRESERVATION (critical — do not alter):
- Strictly preserve the model's identity from the reference image: same face, same facial features, same skin tone, same skin texture, same body proportions, same body physique, same hair length, same hair style, same hair color.
- Do not change, age, or alter the person in any way. The output must be unmistakably the same individual.

WHAT TO KEEP FROM THE REFERENCE IMAGE:
- Face, facial expression, skin tone, skin texture
- Body proportions, body physique, height
- Hair length, hair style, hair color
- Exact outfit: black short-sleeve fitted crop top ending at midriff, black high-waist short shorts (hotpants length). Do not change, add, or remove any clothing.
- Barefoot. No shoes.

WHAT TO CHANGE:
- ${anglePreset.promptSnippet}
- ${stylePreset.promptSnippet}

FRAMING:
- Full body from head to toe. The entire body must be visible — do not crop the head or feet.
- 2:3 portrait framing. Center the model with even margins on all sides.
- High resolution, sharp details, photorealistic.

The ONLY changes are pose/angle and background/lighting. Everything else must be identical to the reference.`;
            const refBase64Raw = refImage.url.split(',')[1];
            let refBase64Normalized: string;
            try {
              refBase64Normalized = await normalizeReferenceImage(refBase64Raw, 'image/png');
            } catch (_) {
              refBase64Normalized = refBase64Raw;
            }
            parts.push({ inlineData: { data: refBase64Normalized, mimeType: 'image/png' } }, { text: prompt });
          } else {
            prompt = generatePrompt(attributes, stylePreset, anglePreset);
            parts.push({ text: prompt });
          }

          const tGen = performance.now();
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: {
              temperature: 0.4,
              imageConfig: { aspectRatio: "2:3", imageSize: "1K" },
              thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
            },
          });
          const genMs = Math.round(performance.now() - tGen);
          const usage = (response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;
          if (usage) {
            console.log(`[model-gen ${runId}] Image ${imageLabel}: done in ${genMs}ms | tokens: prompt=${usage.promptTokenCount ?? '?'} candidates=${usage.candidatesTokenCount ?? '?'} total=${usage.totalTokenCount ?? '?'}`);
          } else {
            console.log(`[model-gen ${runId}] Image ${imageLabel}: done in ${genMs}ms`);
          }

          let imageUrl = '';
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
          if (!imageUrl) {
            const c0 = response.candidates?.[0];
            const finishReason = c0?.finishReason ?? null;
            console.warn(`[model-gen ${runId}] Image ${imageLabel} No image in response:`, {
              candidatesLength: response.candidates?.length ?? 0,
              finishReason,
              partsLength: c0?.content?.parts?.length ?? 0,
            });
            throw new Error("No image data returned from model.");
          }

          const tCrop = performance.now();
          try {
            imageUrl = await cropToTargetAspectRatio(imageUrl, 2 / 3);
          } catch (_) {
            // keep uncropped if crop fails
          }
          console.log(`[model-gen ${runId}] Image ${imageLabel}: crop in ${Math.round(performance.now() - tCrop)}ms`);

          let finalUrl = imageUrl;
          const uploadAvailable = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location?.hostname ?? '');
          if (uploadAvailable) {
            try {
              const base64 = imageUrl.split(',')[1];
              if (base64) {
                // Requires Vercel (deploy or `vercel dev`); 404 when using plain Vite dev — we keep data URL
                const uploadRes = await fetch('/api/upload-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: base64 }),
                });
                if (uploadRes.ok) {
                  const { url } = await uploadRes.json();
                  if (url) finalUrl = url;
                }
              }
            } catch (_) {}
          }

          let estimatedAgeRange = workingAttributes.ageRange;
          if (!firstGeneratedImage) {
            try {
              console.log(`[model-gen ${runId}] Image ${imageLabel}: age estimation start`);
              const ageResponse = await ai.models.generateContent({
                model: 'gemini-3.1-flash-image-preview',
                contents: {
                  parts: [
                    { inlineData: { data: imageUrl.split(',')[1], mimeType: 'image/png' } },
                    { text: `Look at this fashion model image. What age range does this person appear to be? Reply with exactly one of these options, nothing else: 18–24, 25–34, 35–44, 45–54, 55+` },
                  ],
                },
              });
              const ageText = (ageResponse.candidates?.[0]?.content?.parts?.[0] as { text?: string })?.text?.trim() || '';
              const match = OPTIONS.ageRanges.find(r => ageText.includes(r));
              if (match) estimatedAgeRange = match;
              console.log(`[model-gen ${runId}] Image ${imageLabel}: age estimation done → ${estimatedAgeRange}`);
            } catch (e) {
              console.warn(`[model-gen ${runId}] Image ${imageLabel}: age estimation failed`, e);
            }
          }
          workingAttributes = { ...workingAttributes, ageRange: estimatedAgeRange };

          const newImage: GeneratedImage = {
            id: Math.random().toString(36).substring(7),
            url: finalUrl,
            attributes: workingAttributes,
            timestamp: Date.now(),
            prompt,
            styleId: stylePreset.id,
            angleId: anglePreset.id,
            batchId,
          };
          if (!firstGeneratedImage) firstGeneratedImage = newImage;
          if (!angleRefImage) angleRefImage = newImage;
          setAttributes(workingAttributes);
          setGeneratedImages(prev => [newImage, ...prev]);
          setCurrentImage(newImage);
        }
      }
      console.log(`[model-gen ${runId}] Finished: ${totalImages} image(s)`);
      if (firstGeneratedImage) setCurrentImage(firstGeneratedImage);
      setAttributes(prev => ({ ...prev, name: '' }));
    } catch (err: any) {
      console.error(`[model-gen ${runId}] Generation error:`, err?.message ?? err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key session expired. Please re-select your key.");
      } else {
        setError(err.message || "Failed to generate image. Please try again.");
      }
    } finally {
      setIsGeneratingModel(false);
      setGeneratingProgress(null);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `tiny-lemon-${(name || 'unnamed').toLowerCase()}-${Date.now()}.png`;
    link.click();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      setGeneratedImages(prev => prev.filter(img => img.id !== id));
      if (currentImage?.id === id) {
        setCurrentImage(null);
      }
    }
  };

  const handleDressFromFlatLay = async () => {
    if (!hasApiKey || !flatLayFrontDataUrl) {
      setDressModelError('Upload a front flat lay image.');
      return;
    }
    const byBatch = new Map<string, GeneratedImage[]>();
    for (const img of generatedImages) {
      const bid = img.batchId ?? img.id;
      if (!byBatch.has(bid)) byBatch.set(bid, []);
      byBatch.get(bid)!.push(img);
    }
    const effectiveBatchId = selectedDressBatchId ?? (currentImage ? (currentImage.batchId ?? currentImage.id) : null) ?? (generatedImages[0] ? (generatedImages[0].batchId ?? generatedImages[0].id) : null);
    const batchImages: GeneratedImage[] = effectiveBatchId ? (byBatch.get(effectiveBatchId) ?? []).slice().sort((a, b) => a.timestamp - b.timestamp) : [];
    const batchSourceType = batchImages[0]?.sourceType;
    console.log('[flat-lay] Batch selection:', {
      selectedDressBatchId: selectedDressBatchId ?? null,
      currentImageId: currentImage?.id ?? null,
      currentImageBatchId: currentImage?.batchId ?? currentImage?.id ?? null,
      currentImageSourceType: currentImage?.sourceType ?? null,
      effectiveBatchId: effectiveBatchId ?? null,
      batchImageCount: batchImages.length,
      batchSourceType: batchSourceType ?? null,
      isOutfitBatch: batchSourceType === 'flat_lay',
    });
    if (batchImages.length === 0) {
      setDressModelError('Select a model first. Generate a model in the Model tab.');
      return;
    }

    const flatLayFrontMatch = flatLayFrontDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    const flatLayFrontBase64 = flatLayFrontMatch?.[2] ?? null;
    const flatLayFrontMime = (flatLayFrontMatch?.[1] ?? 'image/png').toLowerCase();
    if (!flatLayFrontBase64) {
      setDressModelError('Invalid front flat lay image.');
      return;
    }
    const flatLayBackMatch = flatLayBackDataUrl?.match(/^data:([^;]+);base64,(.+)$/);
    const flatLayBackBase64 = flatLayBackMatch?.[2] ?? null;
    const flatLayBackMime = (flatLayBackMatch?.[1] ?? 'image/png').toLowerCase();

    // Angle-matched refs: use the model's front / three-quarter / back image per turn so pose matches.
    const refFrontImg = batchImages.find((img) => img.angleId === 'front') ?? batchImages[0];
    const refThreeQuarterImg = batchImages.find((img) => img.angleId === 'three-quarter') ?? refFrontImg;
    const refBackImg = batchImages.find((img) => img.angleId === 'back') ?? refFrontImg;

    setDressModelError(null);
    setIsGeneratingOutfit(true);
    setViewMode('outfit-gallery');
    const batchId = Math.random().toString(36).substring(7);
    const skuName = dressModelSkuName.trim() || undefined;
    const apiKey = process.env.GEMINI_API_KEY ?? '';
    const stylePreset = selectedStyleIds.length > 0
      ? PDP_STYLE_PRESETS.find(p => p.id === selectedStyleIds[0]) ?? PDP_STYLE_PRESETS[0]
      : PDP_STYLE_PRESETS[0];
    const styleSnippet = stylePreset.promptSnippet;
    const refImage = batchImages[0];

    const runId = Date.now().toString(36).slice(-6);
    try {
      console.log(`[flat-lay ${runId}] Starting: garment spec + angle-matched refs + 3 poses`);

      setGeneratingProgress({ current: 0, total: 4, label: 'Analyzing garment & preparing…' });
      const t0 = performance.now();
      const [spec, frontB64, threeQuarterB64, backB64] = await Promise.all([
        extractGarmentSpec(flatLayFrontBase64, flatLayFrontMime, apiKey),
        dressModelRefCache.current.batchId === effectiveBatchId && dressModelRefCache.current.base64
          ? Promise.resolve(dressModelRefCache.current.base64)
          : extractBase64FromImage(refFrontImg),
        extractBase64FromImage(refThreeQuarterImg),
        extractBase64FromImage(refBackImg),
      ]);
      if (!frontB64) {
        setDressModelError('Selected model image must be available (try re-generating the model).');
        setIsGeneratingOutfit(false);
        return;
      }
      const [normalizedFrontRef, normalizedThreeQuarterRef, normalizedBackRef] = await Promise.all([
        normalizeReferenceImage(frontB64, 'image/png').catch(() => frontB64),
        normalizeReferenceImage(threeQuarterB64 ?? frontB64, 'image/png').catch(() => threeQuarterB64 ?? frontB64),
        normalizeReferenceImage(backB64 ?? frontB64, 'image/png').catch(() => backB64 ?? frontB64),
      ]);
      if (dressModelRefCache.current.batchId === effectiveBatchId) {
        dressModelRefCache.current = { batchId: effectiveBatchId, base64: frontB64 };
      }
      console.log(`[flat-lay ${runId}] Spec + refs done in ${Math.round(performance.now() - t0)}ms`);

      const ai = new GoogleGenAI({ apiKey });
      const genConfig = {
        temperature: 0.2,
        imageConfig: { aspectRatio: '2:3' as const, imageSize: '1K' as const },
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      };
      const chat = ai.chats.create({
        model: 'gemini-3.1-flash-image-preview',
        config: genConfig,
      });

      const flatLayMime = flatLayFrontMime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const poses: Array<{ pose: 'front' | 'three-quarter' | 'back'; angleId: string }> = [
        { pose: 'front', angleId: 'front' },
        { pose: 'three-quarter', angleId: 'three-quarter' },
        { pose: 'back', angleId: 'back' },
      ];

      function extractImageFromResponse(
        response: { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ inlineData?: { data?: string }; text?: string }> } }> },
        logPrefix: string
      ): string {
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
        const c0 = response.candidates?.[0];
        const finishReason = c0?.finishReason ?? null;
        console.warn(`${logPrefix} No image in response:`, {
          candidatesLength: response.candidates?.length ?? 0,
          finishReason,
          partsLength: c0?.content?.parts?.length ?? 0,
          partTypes: (c0?.content?.parts ?? []).map((p) => ('inlineData' in p && p.inlineData ? 'inlineData' : 'text' in p ? 'text' : 'other')),
        });
        // Google's safety layer removed the generated image; no parts returned.
        if (finishReason === 'IMAGE_SAFETY' || finishReason === 'SAFETY') {
          const err = new Error('This image was filtered by safety filters. Try a different pose or reference.') as Error & { finishReason?: string };
          err.finishReason = finishReason;
          throw err;
        }
        throw new Error('No image data returned from model.');
      }

      const newImages: GeneratedImage[] = [];

      const uploadAvailable = typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location?.hostname ?? '');
      let frontResultBase64: string | null = null;
      for (let i = 0; i < poses.length; i++) {
        const { pose, angleId } = poses[i];
        const isLongPose = i >= 1;
        setGeneratingProgress({
          current: i + 1,
          total: 4,
          label: isLongPose ? `Pose ${i + 1}/3 – may take 1–2 min` : undefined,
        });

        const hasLengthAnchor = pose !== 'front' && !!frontResultBase64;
        const promptText = buildPromptFromSpec(spec, pose, styleSnippet, !!flatLayBackBase64, hasLengthAnchor, attributes.height);
        // Turn 1: front flat lay + model ref + text. Turns 2/3: flat lay + model ref + length anchor (front result) + text.
        const anchorPart = hasLengthAnchor ? [{ inlineData: { data: frontResultBase64!, mimeType: 'image/png' as const } }] : [];
        const message =
          pose === 'front'
            ? [
                { inlineData: { data: flatLayFrontBase64, mimeType: flatLayMime } },
                { inlineData: { data: normalizedFrontRef, mimeType: 'image/png' } },
                { text: promptText },
              ]
            : pose === 'three-quarter'
              ? [
                  { inlineData: { data: flatLayFrontBase64, mimeType: flatLayMime } },
                  { inlineData: { data: normalizedThreeQuarterRef, mimeType: 'image/png' } },
                  ...anchorPart,
                  { text: promptText },
                ]
              : [
                  { inlineData: { data: flatLayBackBase64 ?? flatLayFrontBase64, mimeType: (flatLayBackBase64 ? (flatLayBackMime === 'image/jpeg' ? 'image/jpeg' : 'image/png') : flatLayMime) as 'image/png' | 'image/jpeg' } },
                  { inlineData: { data: normalizedBackRef, mimeType: 'image/png' } },
                  ...anchorPart,
                  { text: promptText },
                ];

        const poseLabel = `${pose} (${i + 1}/3)`;
        console.log(`[flat-lay ${runId}] Pose ${poseLabel}: request start`);
        const tPose = performance.now();
        const response = await chat.sendMessage({
          message,
          config: genConfig,
        });
        const poseMs = Math.round(performance.now() - tPose);
        const usage = (response as { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }).usageMetadata;
        if (usage) {
          console.log(`[flat-lay ${runId}] Pose ${poseLabel}: done in ${poseMs}ms | tokens: prompt=${usage.promptTokenCount ?? '?'} candidates=${usage.candidatesTokenCount ?? '?'} total=${usage.totalTokenCount ?? '?'}`);
        } else {
          console.log(`[flat-lay ${runId}] Pose ${poseLabel}: done in ${poseMs}ms`);
        }

        let imageUrl = extractImageFromResponse(response, `[flat-lay ${runId}] Pose ${poseLabel}`);
        // Capture front result base64 before crop — used as length anchor for turns 2/3
        if (pose === 'front') {
          frontResultBase64 = imageUrl.replace(/^data:[^;]+;base64,/, '');
        }
        const tCrop = performance.now();
        try {
          imageUrl = await cropToTargetAspectRatio(imageUrl, 2 / 3);
        } catch (_) {
          // keep uncropped if crop fails
        }
        console.log(`[flat-lay ${runId}] Pose ${poseLabel}: crop in ${Math.round(performance.now() - tCrop)}ms`);

        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          attributes: refImage.attributes,
          timestamp: Date.now(),
          prompt: promptText,
          styleId: stylePreset.id,
          angleId,
          batchId,
          sourceType: 'flat_lay',
          skuName,
        };
        newImages.push(newImage);
        if (uploadAvailable) {
          const base64 = imageUrl.split(',')[1];
          if (base64) {
            fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64 }),
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((data: { url?: string } | null) => {
                if (data?.url) {
                  setGeneratedImages((prev) =>
                    prev.map((i) => (i.id === newImage.id ? { ...i, url: data.url! } : i))
                  );
                }
              })
              .catch((e) => console.warn(`[flat-lay ${runId}] Pose ${poseLabel}: upload failed`, e));
          }
        }
      }

      setGeneratedImages(prev => [...newImages, ...prev]);
      if (newImages.length > 0) setCurrentImage(newImages[newImages.length - 1]);
      setViewMode('outfit-gallery');
      console.log(`[flat-lay ${runId}] Finished: ${newImages.length} images`);
    } catch (err: any) {
      console.error(`[flat-lay ${runId}] Error:`, err?.message ?? err);
      if (err?.response?.status) console.error(`[flat-lay ${runId}] Response status:`, err.response.status);
      setDressModelError(err?.message || 'Failed to generate. Try again.');
    } finally {
      setIsGeneratingOutfit(false);
      setGeneratingProgress(null);
    }
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-krea-bg p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-krea-btn-bg rounded-2xl flex items-center justify-center shadow-2xl">
              <Logo className="w-12 h-12 text-krea-btn-text" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold tracking-tight">Tiny Lemon</h1>
            <p className="text-krea-muted text-lg">
              To use the high-quality image generation model, you need to select a paid Gemini API key.
            </p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="krea-button w-full py-4 text-lg"
            >
              Select API Key
            </button>
            <p className="text-xs text-krea-muted">
              Requires a paid Google Cloud project. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-white">Learn more about billing</a>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-krea-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-krea-sidebar border-r border-krea-border flex flex-col z-20">
        <div className="p-6 flex items-center border-b border-krea-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-krea-btn-bg rounded-lg flex items-center justify-center">
              <Logo className="w-5 h-5 text-krea-btn-text" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">Tiny Lemon</h1>
          </div>
        </div>

        {/* Tab bar: Dress model | Model | Brand style */}
        <div className="flex border-b border-krea-border">
          <button
            onClick={() => setActiveTab('dress-model')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'dress-model' ? 'text-krea-text border-krea-text' : 'text-krea-muted border-transparent hover:text-krea-text'
            }`}
          >
            Dress model
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'model' ? 'text-krea-text border-krea-text' : 'text-krea-muted border-transparent hover:text-krea-text'
            }`}
          >
            Model
          </button>
          <button
            onClick={() => setActiveTab('brand-style')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'brand-style' ? 'text-krea-text border-krea-text' : 'text-krea-muted border-transparent hover:text-krea-text'
            }`}
          >
            Brand style
          </button>
        </div>

          {activeTab === 'model' ? (
          <>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Identity</label>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-krea-muted">Model Name</label>
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Required</span>
                  </div>
                  <input 
                    type="text" 
                    value={attributes.name}
                    onChange={(e) => updateAttribute('name', e.target.value)}
                    className={`krea-input w-full ${validationErrors.some(e => e.includes('Model Name') || e.includes('unique')) ? 'border-red-500/50 focus:border-red-500' : ''}`}
                    placeholder="e.g. Zara"
                  />
                  {validationErrors.includes('Model Name is required') && (
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Name is required to generate</p>
                  )}
                  {validationErrors.includes('Model name must be unique') && (
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">That name is already used. Choose another.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm text-krea-muted">Gender</label>
                    <select 
                      value={attributes.gender}
                      onChange={(e) => updateAttribute('gender', e.target.value)}
                      className="krea-input w-full appearance-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-krea-muted">Age Range</label>
                    <select 
                      value={attributes.ageRange}
                      onChange={(e) => updateAttribute('ageRange', e.target.value)}
                      className="krea-input w-full appearance-none"
                    >
                      {OPTIONS.ageRanges.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-krea-muted">Ethnicity</label>
                  <select 
                    value={attributes.ethnicity}
                    onChange={(e) => updateAttribute('ethnicity', e.target.value)}
                    className="krea-input w-full appearance-none"
                  >
                    {OPTIONS.ethnicities.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setIsCustomizing(!isCustomizing)}
                className={`flex items-center justify-between w-full p-3 rounded-xl border transition-colors group ${validationErrors.some(err => ['skinTone', 'bodyBuild', 'height', 'hairStyle', 'hairColor'].some(field => err.toLowerCase().includes(field.toLowerCase()))) ? 'border-red-500/50 bg-red-500/5' : 'border-krea-border hover:bg-krea-btn-sec-bg'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${validationErrors.some(err => ['skinTone', 'bodyBuild', 'height', 'hairStyle', 'hairColor'].some(field => err.toLowerCase().includes(field.toLowerCase()))) ? 'bg-red-500 animate-pulse' : (isCustomizing ? 'bg-emerald-500' : 'bg-krea-muted')}`} />
                  <span className="text-sm font-medium text-krea-text">Customize Appearance</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-krea-muted transition-transform duration-300 ${isCustomizing ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <AnimatePresence>
              {isCustomizing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-8 overflow-hidden"
                >
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Appearance</label>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-sm text-krea-muted">Skin Tone</label>
                        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 krea-scrollbar">
                          {OPTIONS.skinTones.map(tone => (
                            <button
                              key={tone}
                              onClick={() => updateAttribute('skinTone', tone)}
                              className={`flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all ${
                                attributes.skinTone === tone 
                                  ? 'border-krea-accent scale-110 shadow-md ring-2 ring-krea-accent/20' 
                                  : 'border-krea-border opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: SKIN_TONE_COLORS[tone] }}
                              title={tone}
                            />
                          ))}
                        </div>
                        <div className="bg-krea-input-bg rounded-lg py-1.5 px-3 border border-krea-border">
                          <p className="text-xs text-krea-text text-center font-medium">{attributes.skinTone}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-krea-muted">Body Build</label>
                        <select 
                          value={attributes.bodyBuild}
                          onChange={(e) => updateAttribute('bodyBuild', e.target.value)}
                          className="krea-input w-full appearance-none"
                        >
                          {(OPTIONS.bodyBuilds[attributes.gender] || OPTIONS.bodyBuilds['Non-binary']).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-krea-muted">Height</label>
                        <select 
                          value={attributes.height}
                          onChange={(e) => updateAttribute('height', e.target.value)}
                          className="krea-input w-full appearance-none"
                        >
                          {OPTIONS.heights.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Hair</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm text-krea-muted">Style</label>
                        <select 
                          value={attributes.hairStyle}
                          onChange={(e) => updateAttribute('hairStyle', e.target.value)}
                          className="krea-input w-full appearance-none"
                        >
                          {(OPTIONS.hairStyles[attributes.gender] || OPTIONS.hairStyles['Non-binary']).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-krea-muted">Color</label>
                        <select 
                          value={attributes.hairColor}
                          onChange={(e) => updateAttribute('hairColor', e.target.value)}
                          className="krea-input w-full appearance-none"
                        >
                          {OPTIONS.hairColors.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        <div className="p-6 border-t border-krea-border space-y-3">
          {error && activeTab === 'model' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-1 rounded-full bg-red-400" />
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Incomplete Profile</p>
              </div>
              <p className="text-red-400 text-xs text-center font-medium">{error}</p>
              {validationErrors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i} className="text-[10px] text-red-400/80 text-center">• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <motion.button 
            onClick={() => handleGenerate(false)}
            disabled={isGeneratingModel}
            animate={validationErrors.length > 0 && !isGeneratingModel ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="krea-button w-full flex items-center justify-center gap-2 py-3"
          >
            {isGeneratingModel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {generatingProgress ? `Generating ${generatingProgress.current}/${generatingProgress.total}...` : 'Generating...'}
              </>
            ) : (
              (() => {
                const numAngles = selectedAngleIds.length;
                const numStyles = selectedStyleIds.length;
                const total = numAngles * numStyles;
                return total > 1 ? `Generate model (${total} images)` : 'Generate Model';
              })()
            )}
          </motion.button>
        </div>
          </>
          ) : activeTab === 'brand-style' ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Brand PDP Style</label>
                <p className="text-xs text-krea-muted">Choose one or more looks for your fashion PDP photoshoots (model wearing clothes). Saved to your workspace.</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-krea-muted">Styles</label>
                    <p className="text-[10px] text-krea-muted">Select the styles your brand uses. We’ll use these when generating PDP images.</p>
                    <div className="space-y-3">
                      {PDP_STYLE_PRESETS.map((p) => (
                        <label key={p.id} className="flex gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedStyleIds.includes(p.id)}
                            onChange={() => toggleStyleId(p.id)}
                            className="mt-1 rounded border-krea-border bg-krea-input-bg text-krea-accent focus:ring-krea-accent flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-krea-text block">{p.label}</span>
                            {p.description && (
                              <p className="text-[10px] text-krea-muted mt-0.5">{p.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                <div className="space-y-2">
                  <label className="text-sm text-krea-muted">Angles (for each PDP)</label>
                  <p className="text-[10px] text-krea-muted">Same model in these poses per outfit — e.g. front, 3/4, back.</p>
                  <div className="space-y-2">
                    {ANGLE_PRESETS.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAngleIds.includes(p.id)}
                          onChange={() => toggleAngleId(p.id)}
                          className="rounded border-krea-border bg-krea-input-bg text-krea-accent focus:ring-krea-accent"
                        />
                        <span className="text-sm text-krea-text">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-krea-border">
              <button
                onClick={handleSaveBrandStyle}
                className="krea-button w-full flex items-center justify-center gap-2 py-3"
              >
                {brandStyleSaveFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  'Save brand style'
                )}
              </button>
            </div>
          </div>
          ) : (
          /* Dress model tab */
          (() => {
            const modelOnly = generatedImages.filter(img => img.sourceType !== 'flat_lay');
            const byBatch = new Map<string, GeneratedImage[]>();
            for (const img of modelOnly) {
              const bid = img.batchId ?? img.id;
              if (!byBatch.has(bid)) byBatch.set(bid, []);
              byBatch.get(bid)!.push(img);
            }
            const batches = Array.from(byBatch.entries()).map(([batchId, imgs]) => ({
              batchId,
              images: imgs.sort((a, b) => a.timestamp - b.timestamp),
            }));
            const defaultBatchId = currentImage && currentImage.sourceType !== 'flat_lay' ? (currentImage.batchId ?? currentImage.id) : (modelOnly[0] ? (modelOnly[0].batchId ?? modelOnly[0].id) : null);
            const effectiveDressBatchId = selectedDressBatchId ?? defaultBatchId;
            const selectedBatch = batches.find(b => b.batchId === effectiveDressBatchId);
            return (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Flat lay</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Front flat lay (required) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-krea-muted">Front</label>
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Required</span>
                      </div>
                      {flatLayFrontDataUrl ? (
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-krea-border bg-krea-input-bg">
                          <img src={flatLayFrontDataUrl} alt="Front flat lay" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setFlatLayFrontDataUrl(null)}
                            className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed border-krea-border hover:border-krea-muted bg-krea-input-bg cursor-pointer transition-colors">
                          <Plus className="w-5 h-5 text-krea-muted mb-1" />
                          <span className="text-[10px] text-krea-muted">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setFlatLayFrontDataUrl(reader.result as string);
                                reader.readAsDataURL(file);
                                setDressModelError(null);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {/* Back flat lay (optional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-krea-muted">Back</label>
                        <span className="text-[10px] text-krea-muted font-bold uppercase tracking-widest">Optional</span>
                      </div>
                      {flatLayBackDataUrl ? (
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-krea-border bg-krea-input-bg">
                          <img src={flatLayBackDataUrl} alt="Back flat lay" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setFlatLayBackDataUrl(null)}
                            className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full aspect-square rounded-lg border-2 border-dashed border-krea-border hover:border-krea-muted bg-krea-input-bg cursor-pointer transition-colors">
                          <Plus className="w-5 h-5 text-krea-muted mb-1" />
                          <span className="text-[10px] text-krea-muted">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setFlatLayBackDataUrl(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-krea-muted">Outfit name (optional)</label>
                    <input
                      type="text"
                      value={dressModelSkuName}
                      onChange={(e) => setDressModelSkuName(e.target.value)}
                      className="krea-input w-full"
                      placeholder="e.g. Satin Slip Dress"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-krea-muted">Select model</label>
                    <select
                      value={effectiveDressBatchId ?? ''}
                      onChange={(e) => setSelectedDressBatchId(e.target.value || null)}
                      className="krea-input w-full appearance-none"
                    >
                      {batches.length === 0 ? (
                        <option value="">No models yet — generate one first</option>
                      ) : (
                        batches.map(({ batchId, images }) => (
                          <option key={batchId} value={batchId}>
                            {images[0]?.attributes?.name || 'Unnamed'} ({images.length} pose{images.length !== 1 ? 's' : ''})
                          </option>
                        ))
                      )}
                    </select>
                    <p className="text-[10px] text-krea-muted">
                      3 poses (front, 3/4, back)
                    </p>
                  </div>
                </div>
                <div className="p-6 border-t border-krea-border space-y-3">
                  {dressModelError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-xs font-medium">{dressModelError}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleDressFromFlatLay()}
                    disabled={isGeneratingOutfit || !flatLayFrontDataUrl || !selectedBatch}
                    className="krea-button w-full flex items-center justify-center gap-2 py-3"
                  >
                    {isGeneratingOutfit && generatingProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {generatingProgress.label ?? (generatingProgress.current === 0 ? 'Analyzing garment…' : generatingProgress.current === 1 ? 'Preparing…' : `Generating ${generatingProgress.current}/3…`)}
                      </>
                    ) : (
                      'Dress model (3 images)'
                    )}
                  </button>
                </div>
              </div>
            );
          })()
          )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-krea-border flex items-center justify-between px-8 bg-krea-bg/50 backdrop-blur-md z-10">
          <div className="flex gap-6">
            <button 
              onClick={() => setViewMode('gallery')}
              className={`text-sm font-medium transition-colors ${viewMode === 'gallery' ? 'text-krea-text border-b-2 border-krea-text pb-0.5' : 'text-krea-muted hover:text-krea-text border-b-2 border-transparent pb-0.5'}`}
            >
              Models ({(() => {
                const modelOnly = generatedImages.filter(img => img.sourceType !== 'flat_lay');
                return new Set(modelOnly.map(img => img.batchId ?? img.id)).size;
              })()})
            </button>
            <button 
              onClick={() => setViewMode('outfit-gallery')}
              className={`text-sm font-medium transition-colors ${viewMode === 'outfit-gallery' ? 'text-krea-text border-b-2 border-krea-text pb-0.5' : 'text-krea-muted hover:text-krea-text border-b-2 border-transparent pb-0.5'}`}
            >
              Outfits ({(() => {
                const flatLayBatches = new Set(
                  generatedImages.filter(img => img.sourceType === 'flat_lay').map(img => img.batchId ?? img.id)
                );
                return flatLayBatches.size;
              })()})
            </button>
            <button 
              onClick={() => setViewMode('builder')}
              className={`text-sm font-medium transition-colors ${viewMode === 'builder' ? 'text-krea-text border-b-2 border-krea-text pb-0.5' : 'text-krea-muted hover:text-krea-text border-b-2 border-transparent pb-0.5'}`}
            >
              Builder
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-krea-muted hover:text-krea-text transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {viewMode === 'gallery' && generatedImages.some(img => img.sourceType !== 'flat_lay') && (
              <button 
                onClick={() => {
                  if (confirm('Clear all models? This cannot be undone.')) {
                    setGeneratedImages(prev => prev.filter(img => img.sourceType === 'flat_lay'));
                    if (currentImage && currentImage.sourceType !== 'flat_lay') setCurrentImage(null);
                    setGalleryBatchIndex({});
                  }
                }}
                className="p-2 text-krea-muted hover:text-red-400 transition-colors"
                title="Clear all models"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {viewMode === 'outfit-gallery' && generatedImages.some(img => img.sourceType === 'flat_lay') && (
              <button 
                onClick={() => {
                  if (confirm('Clear all outfits? This cannot be undone.')) {
                    setGeneratedImages(prev => prev.filter(img => img.sourceType !== 'flat_lay'));
                    if (currentImage?.sourceType === 'flat_lay') setCurrentImage(null);
                    setGalleryBatchIndex({});
                  }
                }}
                className="p-2 text-krea-muted hover:text-red-400 transition-colors"
                title="Clear all outfits"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button className="p-2 text-krea-muted hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-krea-btn-sec-bg flex items-center justify-center">
              <User className="w-4 h-4 text-krea-text" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {viewMode === 'builder' ? (
              <motion.div 
                key="builder"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center max-w-4xl mx-auto"
              >
                {!currentImage && !isGeneratingModel ? (
                  <div className="text-center space-y-6">
                    <div className="w-24 h-24 bg-krea-input-bg rounded-3xl flex items-center justify-center mx-auto border border-krea-border">
                      <ImageIcon className="w-10 h-10 text-krea-muted" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-display font-bold">Ready to create</h2>
                      <p className="text-krea-muted">Adjust attributes in the sidebar and click generate to build your AI model.</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
                    {/* Image Preview + Pose gallery */}
                    <div className="space-y-3">
                    <div className="relative w-auto h-[min(65vh,560px)] aspect-[2/3] bg-krea-input-bg rounded-2xl overflow-hidden border border-krea-border shadow-2xl group min-h-0">
                      {isGeneratingModel ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-krea-bg/40 backdrop-blur-sm z-10">
                          <Loader2 className="w-10 h-10 animate-spin text-krea-text" />
                          <p className="text-sm font-medium animate-pulse text-krea-text">Crafting your model...</p>
                        </div>
                      ) : null}
                      
                      {currentImage ? (
                        <>
                          <img 
                            src={currentImage.url} 
                            alt="Generated Model" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxOpen(true);
                              }}
                              className="p-2 bg-black/50 backdrop-blur-md rounded-lg hover:bg-black/70 transition-colors"
                              title="Expand"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentImage && currentImage.attributes) {
                                  handleDownload(currentImage.url, currentImage.attributes.name);
                                }
                              }}
                              className="p-2 bg-black/50 backdrop-blur-md rounded-lg hover:bg-black/70 transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentImage) handleDelete(currentImage.id);
                              }}
                              className="p-2 bg-black/50 backdrop-blur-md rounded-lg hover:bg-red-500/70 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-white/10" />
                        </div>
                      )}
                    </div>
                    {/* Pose gallery strip - same model, different angles */}
                    {currentImage && currentImage.sourceType !== 'flat_lay' && (() => {
                      const batchId = currentImage.batchId ?? currentImage.id;
                      const modelOnly = generatedImages.filter(img => img.sourceType !== 'flat_lay');
                      const batchImages = modelOnly
                        .filter(img => (img.batchId ?? img.id) === batchId)
                        .sort((a, b) => {
                          const aAngle = ANGLE_PRESETS.findIndex(p => p.id === (a.angleId ?? ''));
                          const bAngle = ANGLE_PRESETS.findIndex(p => p.id === (b.angleId ?? ''));
                          const angleCmp = (aAngle >= 0 ? aAngle : 999) - (bAngle >= 0 ? bAngle : 999);
                          if (angleCmp !== 0) return angleCmp;
                          const aStyle = PDP_STYLE_PRESETS.findIndex(p => p.id === (a.styleId ?? ''));
                          const bStyle = PDP_STYLE_PRESETS.findIndex(p => p.id === (b.styleId ?? ''));
                          return (aStyle >= 0 ? aStyle : 999) - (bStyle >= 0 ? bStyle : 999);
                        });
                      if (batchImages.length <= 1) return null;
                      return (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted self-center shrink-0 mr-1">Poses</p>
                          {batchImages.map((img) => {
                            const isActive = currentImage?.id === img.id;
                            const angleLabel = ANGLE_PRESETS.find(p => p.id === img.angleId)?.label ?? img.angleId ?? 'Pose';
                            const styleLabel = PDP_STYLE_PRESETS.find(p => p.id === img.styleId)?.label;
                            const hasMultipleStyles = new Set(batchImages.map(i => i.styleId)).size > 1;
                            const thumbTitle = hasMultipleStyles && styleLabel ? `${angleLabel} · ${styleLabel}` : angleLabel;
                            return (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => {
                                  setCurrentImage(img);
                                  if (img.attributes) setAttributes(img.attributes);
                                }}
                                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                  isActive ? 'border-krea-text ring-2 ring-krea-text/20' : 'border-krea-border hover:border-krea-muted'
                                }`}
                                title={thumbTitle}
                              >
                                <img
                                  src={img.url}
                                  alt={thumbTitle}
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    </div>

                    {/* Details - same height as preview card, button aligned with card bottom */}
                    <div className="flex flex-col h-[min(65vh,560px)] min-h-0">
                      <div className="flex flex-col gap-6 md:gap-8 flex-shrink-0">
                        <div className="space-y-1">
                          <h2 className="text-3xl font-display font-bold">
                            {(currentImage?.attributes?.name || attributes.name) || 'Unnamed Model'}
                          </h2>
                          <p className="text-krea-muted">Base Model Profile</p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Gender</p>
                            <p className="text-sm">{currentImage?.attributes?.gender || attributes.gender}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Ethnicity</p>
                            <p className="text-sm">{currentImage?.attributes?.ethnicity || attributes.ethnicity}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Age Range</p>
                            <p className="text-sm">{currentImage?.attributes?.ageRange || attributes.ageRange}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Skin Tone</p>
                            <p className="text-sm">{currentImage?.attributes?.skinTone || attributes.skinTone}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Height</p>
                            <p className="text-sm">{currentImage?.attributes?.height || attributes.height}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-auto pt-4">
                        <button 
                          onClick={() => handleGenerate(false)}
                          disabled={isGeneratingModel}
                          className="flex-1 krea-button flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${isGeneratingModel ? 'animate-spin' : ''}`} />
                          Regenerate
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : viewMode === 'outfit-gallery' ? (
              <motion.div 
                key="outfit-gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {(() => {
                  const flatLayImages = generatedImages.filter(img => img.sourceType === 'flat_lay');
                  const byBatch = new Map<string, GeneratedImage[]>();
                  for (const img of flatLayImages) {
                    const bid = img.batchId ?? img.id;
                    if (!byBatch.has(bid)) byBatch.set(bid, []);
                    byBatch.get(bid)!.push(img);
                  }
                  const batches = Array.from(byBatch.entries()).map(([batchId, imgs]) => ({
                    batchId,
                    images: imgs.sort((a, b) => a.timestamp - b.timestamp),
                  }));
                  if (batches.length === 0) {
                    if (isGeneratingOutfit) {
                      return (
                        <div className="col-span-full py-20 text-center space-y-4">
                          <Loader2 className="w-12 h-12 text-krea-text animate-spin mx-auto" />
                          <p className="text-krea-text font-medium">
                            {generatingProgress
                              ? generatingProgress.label ?? (generatingProgress.current === 0 ? 'Analyzing garment…' : generatingProgress.current === 1 ? 'Preparing…' : `Generating pose ${generatingProgress.current}/3…`)
                              : 'Generating…'}
                          </p>
                          <p className="text-sm text-krea-muted">Your model-in-outfit shots will appear here when ready.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="col-span-full py-20 text-center space-y-4">
                        <History className="w-12 h-12 text-krea-muted mx-auto" />
                        <p className="text-krea-muted">No outfits yet. Use Dress model to generate model-in-outfit shots from a flat lay.</p>
                      </div>
                    );
                  }
                  return (
                    <>
                      <div className="col-span-full mb-4 flex items-center justify-between">
                        <p className="text-xs text-krea-muted">Showing {batches.length} outfit{batches.length !== 1 ? 's' : ''}.</p>
                        <button 
                          onClick={() => {
                            if (confirm('Clear all outfits? This cannot be undone.')) {
                              setGeneratedImages(prev => prev.filter(img => img.sourceType !== 'flat_lay'));
                              if (currentImage?.sourceType === 'flat_lay') setCurrentImage(null);
                              setGalleryBatchIndex({});
                            }
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      </div>
                      {isGeneratingOutfit && (
                        <div className="space-y-2">
                          <div className="aspect-[2/3] bg-krea-input-bg rounded-xl overflow-hidden border border-krea-border border-dashed flex flex-col items-center justify-center gap-3 p-4">
                            <Loader2 className="w-10 h-10 text-krea-text animate-spin shrink-0" />
                            <p className="text-sm font-medium text-krea-text text-center">
                              {generatingProgress
                                ? generatingProgress.label ?? (generatingProgress.current === 0 ? 'Analyzing garment…' : generatingProgress.current === 1 ? 'Preparing…' : `Generating pose ${generatingProgress.current}/3…`)
                                : 'Generating…'}
                            </p>
                            <p className="text-xs text-krea-muted text-center">New outfit will appear here</p>
                          </div>
                        </div>
                      )}
                      {batches.map(({ batchId, images }) => {
                        const idx = galleryBatchIndex[batchId] ?? 0;
                        const currentImg = images[Math.min(idx, images.length - 1)];
                        const hasMultiple = images.length > 1;
                        return (
                          <div key={batchId} className="space-y-2">
                            <motion.div
                              layoutId={`outfit-${batchId}`}
                              className="group relative aspect-[2/3] bg-krea-input-bg rounded-xl overflow-hidden border border-krea-border cursor-pointer"
                              onClick={() => {
                                setCurrentImage(currentImg);
                                if (currentImg.attributes) setAttributes(currentImg.attributes);
                                setLightboxOpen(true);
                              }}
                            >
                              <img
                                src={currentImg.url}
                                alt={currentImg.attributes?.name ?? 'Outfit'}
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              {hasMultiple && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setGalleryBatchIndex(prev => ({ ...prev, [batchId]: (prev[batchId] ?? 0) - 1 })); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10 disabled:opacity-40"
                                    disabled={idx <= 0}
                                  >
                                    <ChevronLeft className="w-5 h-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setGalleryBatchIndex(prev => ({ ...prev, [batchId]: (prev[batchId] ?? 0) + 1 })); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10 disabled:opacity-40"
                                    disabled={idx >= images.length - 1}
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end items-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this outfit and all its poses?')) {
                                      setGeneratedImages(prev => prev.filter(img => (img.batchId ?? img.id) !== batchId));
                                      if (currentImage && ((currentImage.batchId ?? currentImage.id) === batchId)) setCurrentImage(null);
                                      setGalleryBatchIndex(prev => { const next = { ...prev }; delete next[batchId]; return next; });
                                    }
                                  }}
                                  className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                            <div className="text-center">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-krea-muted truncate mb-0.5">
                                Flat lay{images[0]?.skuName ? ` · ${images[0].skuName}` : ''}
                              </p>
                              <p className="font-medium text-krea-text truncate">{currentImg.attributes?.name || 'Unnamed'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div 
                key="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {(() => {
                  const modelOnly = generatedImages.filter(img => img.sourceType !== 'flat_lay');
                  if (modelOnly.length === 0) {
                    return (
                      <div className="col-span-full py-20 text-center space-y-4">
                        <History className="w-12 h-12 text-krea-muted mx-auto" />
                        <p className="text-krea-muted">No models generated yet.</p>
                      </div>
                    );
                  }
                  const byBatch = new Map<string, GeneratedImage[]>();
                  for (const img of modelOnly) {
                    const bid = img.batchId ?? img.id;
                    if (!byBatch.has(bid)) byBatch.set(bid, []);
                    byBatch.get(bid)!.push(img);
                  }
                  const batches = Array.from(byBatch.entries()).map(([batchId, imgs]) => ({
                    batchId,
                    images: imgs.sort((a, b) => a.timestamp - b.timestamp),
                  }));
                  return (
                    <>
                      <div className="col-span-full mb-4 flex items-center justify-between">
                        <p className="text-xs text-krea-muted">
                          Showing {batches.length} model{batches.length !== 1 ? 's' : ''}.
                          {generatedImages.length > MAX_SAVED_MODELS && ` (Only the last ${MAX_SAVED_MODELS} are saved permanently)`}
                        </p>
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to clear all models? This cannot be undone.')) {
                              setGeneratedImages(prev => prev.filter(img => img.sourceType === 'flat_lay'));
                              if (currentImage && currentImage.sourceType !== 'flat_lay') setCurrentImage(null);
                              setGalleryBatchIndex({});
                            }
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear All
                        </button>
                      </div>
                      {batches.map(({ batchId, images }) => {
                        const idx = galleryBatchIndex[batchId] ?? 0;
                        const currentImg = images[Math.min(idx, images.length - 1)];
                        const hasMultiple = images.length > 1;
                        return (
                          <div key={batchId} className="space-y-2">
                            <motion.div
                              layoutId={batchId}
                              className="group relative aspect-[2/3] bg-krea-input-bg rounded-xl overflow-hidden border border-krea-border cursor-pointer"
                              onClick={() => {
                                setCurrentImage(currentImg);
                                if (currentImg.attributes) setAttributes(currentImg.attributes);
                                setLightboxOpen(true);
                              }}
                            >
                              <img
                                src={currentImg.url}
                                alt={currentImg.attributes.name}
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              {hasMultiple && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryBatchIndex(prev => ({ ...prev, [batchId]: (prev[batchId] ?? 0) - 1 }));
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10 disabled:opacity-40"
                                  disabled={idx <= 0}
                                >
                                  <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryBatchIndex(prev => ({ ...prev, [batchId]: (prev[batchId] ?? 0) + 1 }));
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10 disabled:opacity-40"
                                  disabled={idx >= images.length - 1}
                                >
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end items-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this model and all its poses?')) {
                                    setGeneratedImages(prev => prev.filter(img => (img.batchId ?? img.id) !== batchId));
                                    if (currentImage && ((currentImage.batchId ?? currentImage.id) === batchId)) setCurrentImage(null);
                                    setGalleryBatchIndex(prev => { const next = { ...prev }; delete next[batchId]; return next; });
                                  }
                                }}
                                className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            </motion.div>
                            <div className="text-center">
                              {(currentImg.sourceType === 'flat_lay' || images.some(img => img.sourceType === 'flat_lay')) && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-krea-muted truncate mb-0.5">
                                  Flat lay{images[0]?.skuName ? ` · ${images[0].skuName}` : ''}
                                </p>
                              )}
                              <p className="font-medium text-krea-text truncate">
                                {currentImg.attributes?.name || 'Unnamed'}
                              </p>
                              <p className="text-sm text-krea-muted truncate">
                                {currentImg.attributes?.ethnicity || '—'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxOpen && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={currentImage.url}
              alt="Generated Model"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
