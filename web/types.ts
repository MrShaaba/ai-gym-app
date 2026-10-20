export type Role = 'member' | 'trainer';
export type Unit = 'kg' | 'lb';
export interface Person {
  id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  goal: string;
  experience: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  availability: number[];
  unit: Unit;
  isPublic: boolean;
  specialties: string[];
  createdAt: string;
  avatarColor?: string;
}
export interface ExerciseDefinition {
  id: string;
  name: string;
  muscles: string[];
  equipment: string;
  instructions: string;
}
export interface PrescribedSet {
  reps: number;
  weight: number;
  restSeconds: number;
  isWarmup?: boolean;
  durationSeconds?: number;
}
export interface RoutineExercise {
  exerciseId: string;
  name: string;
  group?: string;
  sets: PrescribedSet[];
}
export interface Routine {
  id: string;
  name: string;
  durationMinutes: number;
  exercises: RoutineExercise[];
}
export interface Program {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  source: 'trainer' | 'self' | 'ai';
  difficulty: Person['experience'];
  revision: number;
  archived: boolean;
  createdAt: string;
  routines: Routine[];
  visibility: 'private' | 'shared';
  endorsedBy?: string;
  endorsedRevision?: number;
}
export interface Relationship {
  id: string;
  trainerId: string;
  memberId: string;
  requestedBy: string;
  status: 'pending' | 'active' | 'declined' | 'revoked';
  createdAt: string;
  note: string;
  trainerNote?: string;
}
export interface DayMapping {
  day: number;
  routineId: string;
}
export interface Assignment {
  id: string;
  trainerId?: string;
  memberId: string;
  programId: string;
  programTitle: string;
  revision: number;
  startDate: string;
  weeks: number;
  mapping: DayMapping[];
  note: string;
  active: boolean;
}
export interface Occurrence {
  id: string;
  assignmentId: string;
  memberId: string;
  trainerId?: string;
  date: string;
  routine: Routine;
  programTitle: string;
  source: Program['source'];
  status: 'planned' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  note: string;
  revision: number;
}
export interface LoggedSet extends PrescribedSet {
  completed: boolean;
}
export interface LoggedExercise {
  exerciseId: string;
  name: string;
  group?: string;
  sets: LoggedSet[];
}
export interface Reflection {
  effort: number;
  notes: string;
}
export interface Workout {
  id: string;
  userId: string;
  occurrenceId?: string;
  routineId: string;
  routineName: string;
  programTitle: string;
  source: Program['source'];
  date: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  exercises: LoggedExercise[];
  reflection: Reflection;
  review?: { trainerId: string; text: string; createdAt: string };
}
export interface Notice {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  route: string;
}
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
}
export interface Review {
  id: string;
  trainerId: string;
  memberId: string;
  rating: number;
  body: string;
  createdAt: string;
}
export interface Capabilities {
  hostedAI: boolean;
  billing: boolean;
  email: boolean;
  push: boolean;
  mode: 'local';
}
export interface WebState {
  user: Person;
  users: Person[];
  relationships: Relationship[];
  programs: Program[];
  assignments: Assignment[];
  occurrences: Occurrence[];
  workouts: Workout[];
  notifications: Notice[];
  messages: Message[];
  reviews: Review[];
  exercises: ExerciseDefinition[];
  serverTime: string;
  capabilities: Capabilities;
}
export interface GenerationRequest {
  goal: string;
  days: number;
  minutes: number;
  equipment: string[];
  difficulty: Person['experience'];
}
export type Action =
  | {
      type: 'update_profile';
      updates: Partial<
        Pick<
          Person,
          | 'name'
          | 'bio'
          | 'goal'
          | 'experience'
          | 'equipment'
          | 'availability'
          | 'unit'
          | 'isPublic'
          | 'specialties'
        >
      >;
    }
  | { type: 'change_password'; currentPassword: string; password: string }
  | {
      type: 'request_link';
      trainerId?: string;
      memberEmail?: string;
      note?: string;
    }
  | { type: 'respond_link'; id: string; accept: boolean }
  | { type: 'revoke_link'; id: string }
  | { type: 'save_client_note'; id: string; text: string }
  | { type: 'save_program'; program: Program }
  | { type: 'archive_program'; id: string; archived: boolean }
  | { type: 'delete_program'; id: string }
  | {
      type: 'assign_program';
      programId: string;
      memberId: string;
      startDate: string;
      weeks: number;
      mapping: DayMapping[];
      note: string;
      operationId: string;
    }
  | {
      type: 'change_occurrence';
      id: string;
      date?: string;
      status?: Occurrence['status'];
    }
  | { type: 'cancel_assignment'; id: string }
  | { type: 'start_occurrence'; id: string }
  | { type: 'complete_workout'; workout: Workout }
  | {
      type: 'update_workout';
      id: string;
      exercises: LoggedExercise[];
      reflection: Reflection;
    }
  | { type: 'review_workout'; id: string; text: string }
  | { type: 'send_message'; recipientId: string; text: string }
  | { type: 'mark_notification'; id: string }
  | { type: 'submit_review'; trainerId: string; rating: number; body: string }
  | { type: 'endorse_program'; id: string }
  | { type: 'delete_account'; password: string };
export type Route =
  | 'today'
  | 'plans'
  | 'journal'
  | 'progress'
  | 'coach'
  | 'clients'
  | 'discover'
  | 'messages'
  | 'notifications'
  | 'settings'
  | 'studio';
export interface PageProps {
  state: WebState;
  run: (action: Action) => Promise<WebState>;
  navigate: (route: Route) => void;
  refresh: () => Promise<void>;
  toast: (message: string, kind?: 'success' | 'error') => void;
}
