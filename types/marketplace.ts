import type { Difficulty } from './workout';

/* ── Trainer Discovery ──────────────────────────────────────── */

export interface TrainerPublicProfile {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  introVideo: string | null;
  experienceYears: number;
  ratingAvg: number;
  ratingCount: number;
}

export const SPECIALTY_OPTIONS = [
  'Strength',
  'Hypertrophy',
  'Weight Loss',
  'HIIT',
  'Powerlifting',
  'Calisthenics',
  'Yoga',
  'CrossFit',
  'Sports Performance',
  'Rehabilitation',
  'Flexibility',
  'Endurance',
] as const;

export type Specialty = (typeof SPECIALTY_OPTIONS)[number];

/* ── Reviews ────────────────────────────────────────────────── */

export interface Review {
  id: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  rating: number;
  title: string;
  body: string;
  testimonialVideo: string | null;
  createdAt: string;
}

/* ── Invites ────────────────────────────────────────────────── */

export type InviteType = 'email' | 'username' | 'phone';
export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface Invite {
  id: string;
  trainerId: string;
  inviteType: InviteType;
  inviteValue: string;
  status: InviteStatus;
  createdAt: string;
  acceptedAt: string | null;
}
