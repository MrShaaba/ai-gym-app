import type { TrainerClient } from '@/types/assignment';

// Marko's client roster
export const CLIENTS: TrainerClient[] = [
  {
    clientId: 'cl-01',
    clientName: 'Sarah Mitchell',
    clientInitials: 'SM',
    goal: 'Weight Loss',
    email: 'sarah.m@email.com',
    active: true,
    lastActive: '2h ago',
    workoutCount: 18,
    assignmentCount: 3,
    adherencePercent: 85,
    memberSince: 'Jan 2026',
  },
  {
    clientId: 'cl-02',
    clientName: 'James Kim',
    clientInitials: 'JK',
    goal: 'Muscle Gain',
    email: 'james.k@email.com',
    active: true,
    lastActive: '5h ago',
    workoutCount: 24,
    assignmentCount: 2,
    adherencePercent: 92,
    memberSince: 'Nov 2025',
  },
  {
    clientId: 'cl-03',
    clientName: 'Lisa Torres',
    clientInitials: 'LT',
    goal: 'General Fitness',
    email: 'lisa.t@email.com',
    active: true,
    lastActive: '1d ago',
    workoutCount: 12,
    assignmentCount: 1,
    adherencePercent: 67,
    memberSince: 'Mar 2026',
  },
  {
    clientId: 'cl-04',
    clientName: 'Mark Davis',
    clientInitials: 'MD',
    goal: 'Powerlifting',
    email: 'mark.d@email.com',
    active: false,
    lastActive: '14d ago',
    workoutCount: 31,
    assignmentCount: 0,
    adherencePercent: 45,
    memberSince: 'Sep 2025',
  },
  {
    clientId: 'cl-05',
    clientName: 'Alex Johnson',
    clientInitials: 'AJ',
    goal: 'Athletic Performance',
    email: 'alex.j@email.com',
    active: true,
    lastActive: 'Just now',
    workoutCount: 42,
    assignmentCount: 4,
    adherencePercent: 94,
    memberSince: 'Aug 2025',
  },
];

export function getClient(id: string): TrainerClient | undefined {
  return CLIENTS.find((c) => c.clientId === id);
}
