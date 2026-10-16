export type SageMode = 'idle' | 'companion' | 'focus' | 'calm' | 'plan' | 'listening' | 'thinking';

export type SageExpression = 'happy' | 'blink' | 'excited' | 'calm' | 'curious';

export interface AgentState {
  mode: SageMode;
}

export interface CharacterVariation {
  id: string;
  name: string;
  description: string;
}

export interface ActivityTheme {
  id: string;
  name: string;
  description: string;
}

export interface ModeButtonConfig {
  id: SageMode;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string;
  glowColor: string;
}

export interface ApiConfig {
  baseUrl: string;
}

export const MODE_BUTTONS: ModeButtonConfig[] = [
  {
    id: 'focus',
    label: 'Focus',
    subtitle: 'Stay on track',
    icon: '🌿',
    color: '#a8e6cf',
    gradient: 'linear-gradient(135deg, rgba(168,230,207,0.18) 0%, rgba(110,207,138,0.08) 100%)',
    glowColor: 'rgba(168,230,207,0.35)',
  },
  {
    id: 'companion',
    label: 'Companion',
    subtitle: 'Think out loud',
    icon: '💜',
    color: '#ffb3a7',
    gradient: 'linear-gradient(135deg, rgba(255,179,167,0.18) 0%, rgba(255,154,140,0.08) 100%)',
    glowColor: 'rgba(255,179,167,0.35)',
  },
  {
    id: 'calm',
    label: 'Calm',
    subtitle: 'Feel better',
    icon: '🌙',
    color: '#c5b4e3',
    gradient: 'linear-gradient(135deg, rgba(197,180,227,0.18) 0%, rgba(168,148,209,0.08) 100%)',
    glowColor: 'rgba(197,180,227,0.35)',
  },
  {
    id: 'plan',
    label: 'Plan',
    subtitle: 'Get started',
    icon: '✨',
    color: '#ffd166',
    gradient: 'linear-gradient(135deg, rgba(255,209,102,0.18) 0%, rgba(240,180,41,0.08) 100%)',
    glowColor: 'rgba(255,209,102,0.35)',
  },
];

export const CHARACTER_VARIATIONS: CharacterVariation[] = [
  { id: 'original', name: 'Original Sage', description: 'Lavender cat-ear hoodie with sprout' },
  { id: 'boba', name: 'Boba', description: 'Bubble tea themed outfit' },
  { id: 'astronaut', name: 'Astronaut', description: 'Space explorer suit' },
  { id: 'dinosaur', name: 'Dinosaur', description: 'Cute dino onesie' },
  { id: 'cat', name: 'Cat', description: 'Full cat costume' },
  { id: 'bee', name: 'Bee', description: 'Buzzing bee outfit' },
  { id: 'frog', name: 'Frog', description: 'Green frog onesie' },
  { id: 'axolotl', name: 'Axolotl', description: 'Pink axolotl gills' },
];

export const ACTIVITY_THEMES: ActivityTheme[] = [
  { id: 'study', name: 'Study', description: 'Glasses and book accessories' },
  { id: 'focus', name: 'Focus', description: 'Headphones and timer' },
  { id: 'chill', name: 'Chill', description: 'Cozy blanket and tea' },
  { id: 'chef', name: 'Chef', description: 'Chef hat and apron' },
  { id: 'workout', name: 'Workout', description: 'Sporty headband and weights' },
  { id: 'self-care', name: 'Self-Care', description: 'Face mask and cucumber slices' },
];