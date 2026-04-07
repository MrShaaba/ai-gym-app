import type { AssignmentSource } from '@/types/assignment';

/* ── Plan labels ─────────────────────────────────────────────── */

export const PLAN_LABEL: Record<AssignmentSource, string> = {
  trainer: 'Coach Plan',
  self: 'Self Plan',
  ai: 'AI Plan',
};

export const PLAN_COLOR: Record<AssignmentSource, string> = {
  trainer: '#60A5FA', // blue
  self: '#A78BFA', // purple
  ai: '#4ADE80', // green / accent
};

/* ── Section headers ─────────────────────────────────────────── */

export const HEADERS = {
  myPlans: 'My Plans',
  coachPlans: 'Coach Plans',
  selfPlans: 'Self-Guided Plans',
  aiPlans: 'AI Recommendations',
  todaySchedule: "Today's Schedule",
  availableRoutines: 'Available Routines',
} as const;

/* ── Buttons ─────────────────────────────────────────────────── */

export const BUTTONS = {
  assignToSchedule: 'Add to My Week',
  startPlan: 'Start Plan',
  viewPlan: 'View Plan',
  savePlan: 'Save Plan',
  continueWorkout: 'Continue Workout',
  exploreTrainers: 'Explore Trainers',
  generateWorkout: 'Generate Workout',
} as const;

/* ── Helper text ─────────────────────────────────────────────── */

export const HELPER = {
  planIntro: 'Build your own plan or follow one assigned by your trainer.',
  aiSave: 'AI plans can be saved instantly or reviewed by a trainer later.',
  coachExplain: 'Coach Plans are assigned by your trainer and designed for accountability.',
  selfExplain: 'Self Plans are flexible routines you manage yourself.',
} as const;

/* ── Empty states ────────────────────────────────────────────── */

export const EMPTY = {
  noSelfPlans: 'No self-assigned plans yet.',
  noCoachToday: 'No coach plans scheduled for today.',
  noPlansCTA: 'Create a plan, generate one with AI, or explore trainer guidance.',
  noSchedule: 'Nothing scheduled yet. Assign a plan to your week to get started.',
  noWorkoutsToday: 'No workouts scheduled for today.',
} as const;

/* ── Confirmations ───────────────────────────────────────────── */

export const CONFIRM = {
  addedToSchedule: 'Added to your schedule.',
  planSaved: 'Plan saved successfully.',
  endorsementSent: 'Endorsement request sent.',
  trainerApproved: 'Your trainer-approved plan is ready.',
} as const;
