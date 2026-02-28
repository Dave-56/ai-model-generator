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
  Loader2, 
  Image as ImageIcon,
  Camera,
  RefreshCw,
  Copy,
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ModelAttributes, GeneratedImage, ViewMode } from './types';

// Extend Window interface for AI Studio API key selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
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

const MAX_SAVED_MODELS = 6; // Keep only the most recent 6 models to avoid localStorage quota limits

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
  const [isGenerating, setIsGenerating] = useState(false);
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

  useEffect(() => {
    try {
      // Only save the most recent MAX_SAVED_MODELS to localStorage
      const modelsToSave = generatedImages.slice(0, MAX_SAVED_MODELS);
      localStorage.setItem('nanobanana_models', JSON.stringify(modelsToSave));
    } catch (e) {
      console.error("Error saving models to local storage:", e);
      setError("Gallery storage is full. Some older models may not be saved.");
    }
  }, [generatedImages]);

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

  const generatePrompt = (attrs: ModelAttributes) => {
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
- Professional fashion editorial photography style
- Background color: #FFFFFF (Pure white)
- Soft, even studio lighting
- Front-facing, neutral expression, confident posture
- Full body portrait from head to toe
- IMPORTANT: Must not crop head or feet. The entire body from head to toes must be visible.
- Outfit: Black cropped top and tight form-fitting short shorts.
- Footwear: Model must be BAREFOOT. No shoes, no heels, no sandals, no footwear of any kind.
- High resolution, sharp details
- The model should look like a real person, not AI-generated`;
  };

  const handleGenerate = async (useReference = false) => {
    if (!hasApiKey) {
      await handleSelectKey();
      return;
    }

    // Validation
    const errors: string[] = [];
    if (!attributes.name.trim()) {
      errors.push('Model Name is required');
    }
    
    // Ensure all other required attributes are present
    const requiredFields = ['gender', 'ethnicity', 'skinTone', 'bodyBuild', 'height', 'hairStyle', 'hairColor', 'ageRange'];
    requiredFields.forEach(field => {
      if (!attributes[field as keyof ModelAttributes]) {
        errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    });
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError("Please complete the model profile before generating.");
      
      // If any errors are in the customization section, expand it
      const customizationFields = ['skinTone', 'bodyBuild', 'height', 'hairStyle', 'hairColor'];
      if (errors.some(err => customizationFields.some(field => err.toLowerCase().includes(field.toLowerCase())))) {
        setIsCustomizing(true);
      }
      return;
    }

    setValidationErrors([]);
    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let prompt = generatePrompt(attributes);
      
      const parts: any[] = [{ text: prompt }];
      
      // If using reference, add the current image as a reference
      if (useReference && currentImage) {
        prompt = `Generate the same person in this exact image, but now:
- In a different pose (e.g. profile or walking)
- Same lighting, same background
- Same face, same body, same hair

Keep every detail identical. Only change the pose.`;
        
        // Extract base64 from data URL
        const base64Data = currentImage.url.split(',')[1];
        parts.unshift({
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        });
        parts[1].text = prompt; // Update text part
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: parts,
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        const newImage: GeneratedImage = {
          id: Math.random().toString(36).substring(7),
          url: imageUrl,
          attributes: { ...attributes },
          timestamp: Date.now(),
          prompt: prompt
        };
        setGeneratedImages(prev => [newImage, ...prev]);
        setCurrentImage(newImage);
      } else {
        throw new Error("No image data returned from model.");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("API Key session expired. Please re-select your key.");
      } else {
        setError(err.message || "Failed to generate image. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nanobanana-${(name || 'unnamed').toLowerCase()}-${Date.now()}.png`;
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
            <h1 className="text-4xl font-display font-bold tracking-tight">Nanobanana</h1>
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
        <div className="p-6 flex items-center justify-between border-b border-krea-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-krea-btn-bg rounded-lg flex items-center justify-center">
              <Logo className="w-5 h-5 text-krea-btn-text" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">Nanobanana</h1>
          </div>
          <button 
            onClick={() => setAttributes(DEFAULT_ATTRIBUTES)}
            className="p-2 text-krea-muted hover:text-white transition-colors"
            title="Reset to Default"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

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
                    className={`krea-input w-full ${validationErrors.includes('Model Name is required') ? 'border-red-500/50 focus:border-red-500' : ''}`}
                    placeholder="e.g. Zara"
                  />
                  {validationErrors.includes('Model Name is required') && (
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Name is required to generate</p>
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
          {error && (
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
            disabled={isGenerating}
            animate={validationErrors.length > 0 && !isGenerating ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="krea-button w-full flex items-center justify-center gap-2 py-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Model"
            )}
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-krea-border flex items-center justify-between px-8 bg-krea-bg/50 backdrop-blur-md z-10">
          <div className="flex gap-6">
            <button 
              onClick={() => setViewMode('builder')}
              className={`text-sm font-medium transition-colors ${viewMode === 'builder' ? 'text-white' : 'text-krea-muted hover:text-white'}`}
            >
              Builder
            </button>
            <button 
              onClick={() => setViewMode('gallery')}
              className={`text-sm font-medium transition-colors ${viewMode === 'gallery' ? 'text-white' : 'text-krea-muted hover:text-white'}`}
            >
              Gallery ({generatedImages.length})
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
            {viewMode === 'gallery' && generatedImages.length > 0 && (
              <button 
                onClick={() => {
                  if (confirm('Clear all generated models?')) {
                    setGeneratedImages([]);
                    setCurrentImage(null);
                  }
                }}
                className="p-2 text-krea-muted hover:text-red-400 transition-colors"
                title="Clear Gallery"
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
                {!currentImage && !isGenerating ? (
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
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    {/* Image Preview */}
                    <div className="relative aspect-square bg-krea-input-bg rounded-2xl overflow-hidden border border-krea-border shadow-2xl group">
                      {isGenerating ? (
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
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

                    {/* Details */}
                    <div className="space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-display font-bold">
                          {(currentImage?.attributes?.name || attributes.name) || 'Unnamed Model'}
                        </h2>
                        <p className="text-krea-muted">Base Model Profile</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Gender</p>
                          <p className="text-sm">{currentImage?.attributes?.gender || attributes.gender}</p>
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

                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Consistency Reference</p>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                        <p className="text-xs text-krea-muted leading-relaxed">
                          This image is now saved as your base reference. Subsequent generations can use this model's features for perfect consistency.
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleGenerate(false)}
                          disabled={isGenerating}
                          className="flex-1 krea-button flex items-center justify-center gap-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                          Regenerate
                        </button>
                        <button 
                          onClick={() => handleGenerate(true)}
                          disabled={isGenerating || !currentImage}
                          className="krea-button-secondary flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          New Pose
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {generatedImages.length === 0 ? (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <History className="w-12 h-12 text-krea-muted mx-auto" />
                    <p className="text-krea-muted">No models generated yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="col-span-full mb-4 flex items-center justify-between">
                      <p className="text-xs text-krea-muted">
                        Showing {generatedImages.length} models. 
                        {generatedImages.length > MAX_SAVED_MODELS && ` (Only the last ${MAX_SAVED_MODELS} are saved permanently)`}
                      </p>
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to clear all models? This cannot be undone.')) {
                            setGeneratedImages([]);
                            setCurrentImage(null);
                          }
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    </div>
                    {generatedImages.map((img) => (
                    <motion.div 
                      key={img.id}
                      layoutId={img.id}
                      className="group relative aspect-square bg-krea-input-bg rounded-xl overflow-hidden border border-krea-border cursor-pointer"
                      onClick={() => {
                        setCurrentImage(img);
                        if (img.attributes) {
                          setAttributes(img.attributes);
                        }
                        setViewMode('builder');
                      }}
                    >
                      <img 
                        src={img.url} 
                        alt={img.attributes.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold">{img.attributes.name || 'Unnamed Model'}</p>
                            <p className="text-xs text-krea-muted">{new Date(img.timestamp).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(img.id);
                            }}
                            className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
