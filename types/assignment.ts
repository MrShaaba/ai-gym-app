// Phase 4: Trainer-Client relationship & assignment types

export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export type AssignmentSource = 'trainer' | 'self' | 'ai';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Assignment {
  id: string;
  trainerId: string;
  clientId: string;
  routineId: string;
  routineName: string;
  programName?: string;
  scheduleDays: DayOfWeek[];
  status: AssignmentStatus;
  source: AssignmentSource;
  note?: string;
  assignedAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Snapshot of the routine's exercises stored in the assignment row. */
  exercisesJson?: import('@/types/workout').WorkoutExercise[];
}

export interface ClientNotification {
  id: string;
  type: 'assignment' | 'message' | 'reminder';
  title: string;
  body: string;
  assignmentId?: string;
  read: boolean;
  createdAt: number;
}

export interface TrainerClient {
  clientId: string;
  clientName: string;
  clientInitials: string;
  goal: string;
  email: string;
  active: boolean;
  lastActive: string;
  workoutCount: number;
  assignmentCount: number;
  adherencePercent: number;
  memberSince: string;
}
