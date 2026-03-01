export interface ModelAttributes {
  name: string;
  gender: string;
  ethnicity: string;
  skinTone: string;
  bodyBuild: string;
  height: string;
  hairStyle: string;
  hairColor: string;
  ageRange: string;
}

export interface PdpStylePreset {
  id: string;
  label: string;
  /** Optional short description for workspace UI (e.g. White / Grey studio). */
  description?: string;
  promptSnippet: string;
}

export interface AnglePreset {
  id: string;
  label: string;
  promptSnippet: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  attributes: ModelAttributes;
  timestamp: number;
  prompt: string;
  styleId?: string;
  angleId?: string;
  /** Same for all images in one generation (multi-angle run). Used to group gallery cards. */
  batchId?: string;
  /** 'flat_lay' = dressed from flat lay upload; undefined = model-only generation. */
  sourceType?: 'model_only' | 'flat_lay';
  /** Optional SKU label (for flat-lay runs); display/badges and future batch. */
  skuName?: string;
}

export type ViewMode = 'builder' | 'gallery';
