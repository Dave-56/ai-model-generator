/**
 * Pre-built model library roster — 8F / 6M / 1NB = 15 models.
 * IDs are stable slugs — never encode attributes in the ID.
 * This file is the source of truth; preset-models.json is generated output.
 */

export interface PresetModel {
  id: string;
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

export const MODEL_DEFINITIONS: PresetModel[] = [
  // ── Female (8) ────────────────────────────────────────────────────────────
  {
    id: 'model-01',
    name: 'Aisha',
    gender: 'Female',
    ethnicity: 'Black / African Descent',
    skinTone: 'Deep Ebony',
    bodyBuild: 'Slender / Slim',
    height: '5\'10" (178cm)',
    hairStyle: 'Long box braids',
    hairColor: 'Black',
    ageRange: '18–24',
  },
  {
    id: 'model-02',
    name: 'Zara',
    gender: 'Female',
    ethnicity: 'Black / African Descent',
    skinTone: 'Rich Caramel',
    bodyBuild: 'Curvy / Hourglass',
    height: '5\'8" (173cm)',
    hairStyle: 'Natural afro',
    hairColor: 'Black',
    ageRange: '25–34',
  },
  {
    id: 'model-03',
    name: 'Mei',
    gender: 'Female',
    ethnicity: 'East Asian',
    skinTone: 'Fair / Porcelain',
    bodyBuild: 'Slender / Slim',
    height: '5\'8" (173cm)',
    hairStyle: 'Straight, long',
    hairColor: 'Black',
    ageRange: '18–24',
  },
  {
    id: 'model-04',
    name: 'Priya',
    gender: 'Female',
    ethnicity: 'South Asian',
    skinTone: 'Medium / Olive',
    bodyBuild: 'Slender / Slim',
    height: '5\'8" (173cm)',
    hairStyle: 'Straight, long',
    hairColor: 'Black',
    ageRange: '18–24',
  },
  {
    id: 'model-05',
    name: 'Sofia',
    gender: 'Female',
    ethnicity: 'Hispanic / Latino',
    skinTone: 'Tan / Bronze',
    bodyBuild: 'Curvy / Hourglass',
    height: '5\'8" (173cm)',
    hairStyle: 'Wavy, shoulder length',
    hairColor: 'Dark Brown',
    ageRange: '25–34',
  },
  {
    id: 'model-06',
    name: 'Emma',
    gender: 'Female',
    ethnicity: 'White / Caucasian',
    skinTone: 'Fair / Porcelain',
    bodyBuild: 'Slender / Slim',
    height: '5\'10" (178cm)',
    hairStyle: 'Straight, long',
    hairColor: 'Blonde',
    ageRange: '18–24',
  },
  {
    id: 'model-07',
    name: 'Layla',
    gender: 'Female',
    ethnicity: 'Middle Eastern',
    skinTone: 'Medium / Olive',
    bodyBuild: 'Slender / Slim',
    height: '5\'8" (173cm)',
    hairStyle: 'Long waves',
    hairColor: 'Dark Brown',
    ageRange: '18–24',
  },
  {
    id: 'model-08',
    name: 'Nia',
    gender: 'Female',
    ethnicity: 'Mixed / Multi-racial',
    skinTone: 'Tan / Bronze',
    bodyBuild: 'Slender / Slim',
    height: '5\'8" (173cm)',
    hairStyle: 'Curly, medium length',
    hairColor: 'Dark Brown',
    ageRange: '25–34',
  },

  // ── Male (6) ──────────────────────────────────────────────────────────────
  {
    id: 'model-09',
    name: 'Kofi',
    gender: 'Male',
    ethnicity: 'Black / African Descent',
    skinTone: 'Deep Ebony',
    bodyBuild: 'Athletic / Toned',
    height: '6\'0" (183cm)',
    hairStyle: 'Low fade',
    hairColor: 'Black',
    ageRange: '25–34',
  },
  {
    id: 'model-10',
    name: 'Kai',
    gender: 'Male',
    ethnicity: 'East Asian',
    skinTone: 'Fair / Porcelain',
    bodyBuild: 'Slender / Slim',
    height: '5\'10" (178cm)',
    hairStyle: 'Short textured',
    hairColor: 'Black',
    ageRange: '18–24',
  },
  {
    id: 'model-11',
    name: 'Arjun',
    gender: 'Male',
    ethnicity: 'South Asian',
    skinTone: 'Medium / Olive',
    bodyBuild: 'Athletic / Toned',
    height: '5\'10" (178cm)',
    hairStyle: 'Short, neat',
    hairColor: 'Black',
    ageRange: '25–34',
  },
  {
    id: 'model-12',
    name: 'Diego',
    gender: 'Male',
    ethnicity: 'Hispanic / Latino',
    skinTone: 'Tan / Bronze',
    bodyBuild: 'Athletic / Toned',
    height: '5\'10" (178cm)',
    hairStyle: 'Short textured',
    hairColor: 'Black',
    ageRange: '25–34',
  },
  {
    id: 'model-13',
    name: 'Liam',
    gender: 'Male',
    ethnicity: 'White / Caucasian',
    skinTone: 'Light / Ivory',
    bodyBuild: 'Athletic / Toned',
    height: '6\'0" (183cm)',
    hairStyle: 'Short, neat',
    hairColor: 'Brown',
    ageRange: '25–34',
  },
  {
    id: 'model-14',
    name: 'Tariq',
    gender: 'Male',
    ethnicity: 'Middle Eastern',
    skinTone: 'Tan / Bronze',
    bodyBuild: 'Slender / Slim',
    height: '5\'10" (178cm)',
    hairStyle: 'Short, neat',
    hairColor: 'Black',
    ageRange: '25–34',
  },

  // ── Non-binary (1) ────────────────────────────────────────────────────────
  {
    id: 'model-15',
    name: 'River',
    gender: 'Non-binary',
    ethnicity: 'Mixed / Multi-racial',
    skinTone: 'Medium / Olive',
    bodyBuild: 'Slender / Slim',
    height: '5\'8" (173cm)',
    hairStyle: 'Cropped, androgynous',
    hairColor: 'Dark Brown',
    ageRange: '25–34',
  },
];
