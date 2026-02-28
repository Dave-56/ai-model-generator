export interface ModelAttributes {
  name: string;
  gender: string;
  skinTone: string;
  bodyBuild: string;
  height: string;
  hairStyle: string;
  hairColor: string;
  ageRange: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  attributes: ModelAttributes;
  timestamp: number;
  prompt: string;
}

export type ViewMode = 'builder' | 'gallery';
