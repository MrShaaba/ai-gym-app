export const APP_NAME = 'AI Gym';

export const FEATURES = {
  ENABLE_AI_GENERATION: false,
  ENABLE_CHAT: false,
  ENABLE_VOIP: false,
  ENABLE_SUBSCRIPTIONS: false,
} as const;

export const ROLES = {
  CLIENT: 'client',
  TRAINER: 'trainer',
} as const;
