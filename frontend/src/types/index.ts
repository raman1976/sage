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
    color: '#4dffb8',
    gradient:
      'linear-gradient(135deg, rgba(26, 58, 42, 0.95) 0%, rgba(42, 78, 58, 0.85) 40%, rgba(88, 140, 110, 0.7) 100%)',
    glowColor: 'rgba(77, 255, 184, 0.45)',
  },
  {
    id: 'companion',
    label: 'Companion',
    subtitle: 'Think out loud',
    icon: '💜',
    color: '#ff7ebd',
    gradient:
      'linear-gradient(135deg, rgba(48, 24, 60, 0.95) 0%, rgba(72, 32, 84, 0.85) 40%, rgba(110, 52, 120, 0.7) 100%)',
    glowColor: 'rgba(255, 126, 189, 0.45)',
  },
  {
    id: 'calm',
    label: 'Calm',
    subtitle: 'Feel better',
    icon: '🌙',
    color: '#d4bfff',
    gradient:
      'linear-gradient(135deg, rgba(38, 26, 56, 0.95) 0%, rgba(58, 38, 82, 0.85) 40%, rgba(90, 64, 120, 0.7) 100%)',
    glowColor: 'rgba(212, 191, 255, 0.45)',
  },
  {
    id: 'plan',
    label: 'Plan',
    subtitle: 'Get started',
    icon: '✨',
    color: '#ffd78a',
    gradient:
      'linear-gradient(135deg, rgba(42, 32, 22, 0.95) 0%, rgba(68, 48, 28, 0.85) 40%, rgba(110, 76, 38, 0.7) 100%)',
    glowColor: 'rgba(255, 215, 138, 0.45)',
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