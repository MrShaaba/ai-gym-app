export const APP_NAME = 'AI Gym';

export const FEATURES = {
  ENABLE_AI_GENERATION: true,
  ENABLE_CHAT: false,
  ENABLE_VOIP: false,
  ENABLE_SUBSCRIPTIONS: false,
  ENABLE_MARKETPLACE: true,
} as const;

/** Max free AI plan generations before premium gate. */
export const FREE_AI_GENERATION_LIMIT = 3;

export const ROLES = {
  CLIENT: 'client',
  TRAINER: 'trainer',
} as const;

export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
