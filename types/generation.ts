import type { Difficulty, MuscleGroup, Equipment, WorkoutExercise } from '@/types/workout';

/* ── Generation Request ─────────────────────────────────────── */

export type GenerationHorizon = 'today' | 'week' | 'month';

export interface GenerationRequest {
  goal: string;
  horizon: GenerationHorizon;
  daysPerWeek: number;
  durationMinutes: number;
  difficulty: Difficulty;
  equipment: Equipment[];
  focusAreas: MuscleGroup[];
}

/* ── Generation Response ────────────────────────────────────── */

export interface GeneratedRoutine {
  name: string;
  difficulty: Difficulty;
  durationMinutes: number;
  exercises: WorkoutExercise[];
}

export interface GeneratedPlan {
  title: string;
  goal: string;
  summary: string;
  horizon: GenerationHorizon;
  daysPerWeek: number;
  routines: GeneratedRoutine[];
  generatedAt: string;
  model: string;
  request: GenerationRequest;
}

/* ── Generation Status ──────────────────────────────────────── */

export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface GenerationError {
  error: string;
  message: string;
  used?: number;
  limit?: number;
}

export type GenerationFailureCode =
  | 'transport_failure'
  | 'backend_unavailable'
  | 'generation_limit_reached'
  | 'generation_failed';

export interface AppGenerationError extends Error {
  code: GenerationFailureCode;
  used?: number;
  limit?: number;
  retryable?: boolean;
}

/* ── Program Source ──────────────────────────────────────────── */

export type ProgramSource = 'client' | 'trainer' | 'ai' | 'ai_endorsed';

/* ── Goal Presets ────────────────────────────────────────────── */

export const GOAL_OPTIONS = [
  'Build Muscle',
  'Lose Fat',
  'Increase Strength',
  'Improve Endurance',
  'General Fitness',
  'Athletic Performance',
] as const;

export type GoalOption = (typeof GOAL_OPTIONS)[number];

export const HORIZON_OPTIONS: { label: string; value: GenerationHorizon; description: string }[] = [
  { label: 'Today', value: 'today', description: '1 workout' },
  { label: 'This Week', value: 'week', description: 'Full week plan' },
  { label: 'This Month', value: 'month', description: '4-week program' },
];

export const DURATION_OPTIONS = [30, 45, 60, 75, 90] as const;
