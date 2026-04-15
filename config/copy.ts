import type { AssignmentSource, DayRoutineResolutionReason } from '@/types/assignment';

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
  clearOverride: 'Clear override',
} as const;

/* ── Helper text ─────────────────────────────────────────────── */

export const HELPER = {
  planIntro: 'Build your own plan or follow one assigned by your trainer.',
  aiSave: 'AI plans can be saved instantly or reviewed by a trainer later.',
  coachExplain: 'Coach Plans are assigned by your trainer and designed for accountability.',
  selfExplain: 'Self Plans are flexible routines you manage yourself.',
  manualOverride: 'Manual override active for this day.',
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
  overrideCleared: 'Manual override cleared for this day.',
} as const;

/* ── Trainer conversion loop ─────────────────────────────────── */

export const TRAINER_LOOP = {
  // invite-client.tsx — post-link alerts
  clientLinkedTitle: 'Client Linked',
  clientLinkedBody: 'They will now appear in your client list.',
  clientLinkedNameBody: (name: string) => `${name} has been added to your client list.`,
  inviteCreatedTitle: 'Invite Created',
  invitePendingUsername:
    "A pending invite has been created. When they sign up with this username, they'll be auto-linked. You'll find them in your client list once they join.",
  invitePendingPhone:
    "A pending invite for this phone number has been created. You'll find them in your client list once they join.",
  btnAssignWorkout: 'Assign Workout',
  btnDone: 'Done',

  // assign.tsx — post-assignment alert
  assignedTitle: 'Workout Assigned',
  assignedBody: (routineName: string, clientName: string, days: string) =>
    `"${routineName}" has been assigned to ${clientName} for ${days}. They'll see it on their workout screen right away.`,
  btnViewClient: 'View Client',

  // client-detail.tsx — assignment status labels
  statusAwaitingClient: 'Awaiting Client',
  statusInProgress: 'In Progress',
  statusCompleted: 'Completed',
} as const;

/* ── Client notification card ────────────────────────────────── */

export const CLIENT_NOTIF = {
  viewWorkout: 'View Workout →',
  viewSchedule: 'View Schedule →',
  dismiss: 'Dismiss',
  moreNotifications: (count: number) => `+${count} more`,
} as const;

export const DAY_ROUTINE_REASON_LABEL: Record<DayRoutineResolutionReason, string> = {
  manual_override: 'Manual override',
  coach_assigned: 'Coach assigned',
  self_scheduled: 'Self scheduled',
  ai_scheduled: 'AI scheduled',
  empty: 'Empty day',
};
