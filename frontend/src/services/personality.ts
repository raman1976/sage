import type { SageAvatar } from '../components/character';

/**
 * Sage's four personalities — one per character/mode. Sent with every
 * Nemotron request so the backend can layer the right vibe on top of the
 * shared core identity.
 */
export type SagePersonality = 'bee' | 'cat' | 'bunny' | 'ladybug';

/** Map the selected avatar to its personality (Bunny Sage = the lavender avatar). */
const AVATAR_PERSONALITY: Record<SageAvatar, SagePersonality> = {
  bee: 'bee',
  cat: 'cat',
  lavender: 'bunny',
  ladybug: 'ladybug',
};

export const personalityForAvatar = (avatar: SageAvatar): SagePersonality =>
  AVATAR_PERSONALITY[avatar] ?? 'bee';

let currentPersonality: SagePersonality = 'bee';

/** Remember which character is active so every chat request carries it. */
export const setSagePersonality = (personality: SagePersonality): void => {
  currentPersonality = personality;
};

export const getSagePersonality = (): SagePersonality => currentPersonality;
