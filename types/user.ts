export type UserRole = 'client' | 'trainer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface TrainerProfile extends User {
  role: 'trainer';
  bio?: string;
  specialties?: string[];
  clientCount?: number;
}

export interface ClientProfile extends User {
  role: 'client';
  goal?: string;
  workoutCount?: number;
  memberSince?: string;
}
