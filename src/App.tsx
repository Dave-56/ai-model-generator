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
  name: 'Aaliyah',
  gender: 'Female',
  skinTone: 'Deep ebony',
  bodyBuild: 'Slender, athletic',
  height: "Tall",
  hairStyle: 'Buzz cut',
  hairColor: 'Black',
  ageRange: '20–25'
};

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  const [attributes, setAttributes] = useState<ModelAttributes>(DEFAULT_ATTRIBUTES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

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

  const checkApiKey = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      console.error("Error checking API key:", e);
    }
  };

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } catch (e) {
      console.error("Error opening key selector:", e);
    }
  };

  const generatePrompt = (attrs: ModelAttributes) => {
    return `Generate a photorealistic fashion model portrait with these attributes:

Name: ${attrs.name}
Gender: ${attrs.gender}
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

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatePrompt(attributes));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nanobanana-${name.toLowerCase()}-${Date.now()}.png`;
    link.click();
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
              <Sparkles className="w-10 h-10 text-krea-btn-text" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold tracking-tight">Nanobanana-2</h1>
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
              <Sparkles className="w-5 h-5 text-krea-btn-text" />
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
                <label className="text-sm text-krea-muted">Model Name</label>
                <input 
                  type="text" 
                  value={attributes.name}
                  onChange={(e) => setAttributes({...attributes, name: e.target.value})}
                  className="krea-input w-full"
                  placeholder="e.g. Zara"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Gender</label>
                <select 
                  value={attributes.gender}
                  onChange={(e) => setAttributes({...attributes, gender: e.target.value})}
                  className="krea-input w-full appearance-none"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Age Range</label>
                <input 
                  type="text" 
                  value={attributes.ageRange}
                  onChange={(e) => setAttributes({...attributes, ageRange: e.target.value})}
                  className="krea-input w-full"
                  placeholder="e.g. 25–34"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Appearance</label>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Skin Tone</label>
                <input 
                  type="text" 
                  value={attributes.skinTone}
                  onChange={(e) => setAttributes({...attributes, skinTone: e.target.value})}
                  className="krea-input w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Body Build</label>
                <input 
                  type="text" 
                  value={attributes.bodyBuild}
                  onChange={(e) => setAttributes({...attributes, bodyBuild: e.target.value})}
                  className="krea-input w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Height</label>
                <input 
                  type="text" 
                  value={attributes.height}
                  onChange={(e) => setAttributes({...attributes, height: e.target.value})}
                  className="krea-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-krea-muted">Hair</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Style</label>
                <input 
                  type="text" 
                  value={attributes.hairStyle}
                  onChange={(e) => setAttributes({...attributes, hairStyle: e.target.value})}
                  className="krea-input w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-krea-muted">Color</label>
                <input 
                  type="text" 
                  value={attributes.hairColor}
                  onChange={(e) => setAttributes({...attributes, hairColor: e.target.value})}
                  className="krea-input w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-krea-border space-y-3">
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button 
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="krea-button w-full flex items-center justify-center gap-2 py-3"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Model
              </>
            )}
          </button>
          <button 
            onClick={handleCopyPrompt}
            className="krea-button-secondary w-full flex items-center justify-center gap-2 py-3"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
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
                              onClick={() => handleDownload(currentImage.url, currentImage.attributes.name)}
                              className="p-2 bg-black/50 backdrop-blur-md rounded-lg hover:bg-black/70 transition-colors"
                            >
                              <Download className="w-4 h-4" />
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
                        <h2 className="text-3xl font-display font-bold">{currentImage?.attributes.name || attributes.name}</h2>
                        <p className="text-krea-muted">Base Model Profile</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Gender</p>
                          <p className="text-sm">{currentImage?.attributes.gender || attributes.gender}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Age Range</p>
                          <p className="text-sm">{currentImage?.attributes.ageRange || attributes.ageRange}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Skin Tone</p>
                          <p className="text-sm">{currentImage?.attributes.skinTone || attributes.skinTone}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-krea-muted">Height</p>
                          <p className="text-sm">{currentImage?.attributes.height || attributes.height}</p>
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
                  generatedImages.map((img) => (
                    <motion.div 
                      key={img.id}
                      layoutId={img.id}
                      className="group relative aspect-square bg-krea-input-bg rounded-xl overflow-hidden border border-krea-border cursor-pointer"
                      onClick={() => {
                        setCurrentImage(img);
                        setAttributes(img.attributes);
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
                        <p className="font-bold">{img.attributes.name}</p>
                        <p className="text-xs text-krea-muted">{new Date(img.timestamp).toLocaleDateString()}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
