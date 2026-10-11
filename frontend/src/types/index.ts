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
  icon: string;
  color: string;
  gradient: string;
}

export interface ApiConfig {
  baseUrl: string;
}

export const MODE_BUTTONS: ModeButtonConfig[] = [
  { id: 'focus', label: 'Focus', icon: '🍃', color: '#a8e6cf', gradient: 'linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%)' },
  { id: 'companion', label: 'Companion', icon: '💜', color: '#ffb3a7', gradient: 'linear-gradient(135deg, #ffb3a7 0%, #ff9a8c 100%)' },
  { id: 'calm', label: 'Calm', icon: '🌙', color: '#c5b4e3', gradient: 'linear-gradient(135deg, #c5b4e3 0%, #a894d1 100%)' },
  { id: 'plan', label: 'Plan', icon: '✨', color: '#a7d0ff', gradient: 'linear-gradient(135deg, #a7d0ff 0%, #8ab8e8 100%)' },
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