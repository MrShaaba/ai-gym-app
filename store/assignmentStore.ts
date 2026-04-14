import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Assignment,
  AssignmentSource,
  ClientNotification,
  DayOfWeek,
  ResolvedDayRoutine,
} from '@/types/assignment';
import { resolveDayRoutine as resolveDayRoutineForDay } from '@/services/schedule';
import type { WorkoutRoutine } from '@/types/workout';
import {
  fetchAssignments,
  insertAssignment,
  insertSelfAssignment,
  updateAssignmentStatusDB,
} from '@/services/assignments';

interface AssignmentState {
  assignments: Assignment[];
  notifications: ClientNotification[];
  daySelections: Partial<Record<DayOfWeek, WorkoutRoutine>>;
  /** True while the initial DB fetch is running. */
  hydrating: boolean;

  /** Clear all local state (call on logout). */
  reset: () => void;

  /** Pull all assignments from Supabase for the given role + user. */
  hydrate: (role: 'trainer' | 'client', userId: string) => Promise<void>;

  // Trainer actions
  createAssignment: (params: {
    trainerId: string;
    clientId: string;
    routineId: string;
    routineName: string;
    scheduleDays: DayOfWeek[];
    note?: string;
    programName?: string;
    exercisesJson?: unknown;
  }) => Promise<Assignment>;
  updateAssignmentStatus: (id: string, status: Assignment['status']) => Promise<void>;

  // Client actions
  getClientAssignments: (clientId: string) => Assignment[];
  getUnreadCount: () => number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setDayOverride: (day: DayOfWeek, routine: WorkoutRoutine) => void;
  clearDayOverride: (day: DayOfWeek) => void;
  resolveDayRoutine: (clientId: string | undefined, day: DayOfWeek) => ResolvedDayRoutine;
  removeRoutineReferences: (clientId: string, routineId: string) => void;
  syncRoutineOverrideSnapshot: (routine: WorkoutRoutine) => void;
  setDayRoutineSelection: (day: DayOfWeek, routine: WorkoutRoutine | null) => void;

  /** Self-assign a routine to the client's schedule. */
  selfAssign: (params: {
    clientId: string;
    routineId: string;
    routineName: string;
    programName?: string;
    scheduleDays: DayOfWeek[];
    exercisesJson?: unknown;
    source: AssignmentSource;
  }) => Promise<Assignment>;
}

export const useAssignmentStore = create<AssignmentState>()(
  persist(
    (set, get) => ({
      assignments: [],
      notifications: [],
      daySelections: {},
      hydrating: false,

      reset: () => set({ assignments: [], notifications: [], daySelections: {}, hydrating: false }),

      hydrate: async (role, userId) => {
        set({ hydrating: true });
        try {
          const assignments = await fetchAssignments(role, userId);
          set({ assignments });
        } catch (e) {
          console.warn('[assignmentStore] hydrate failed', e);
        } finally {
          set({ hydrating: false });
        }
      },

      createAssignment: async (params) => {
        // Write to Supabase first
        const newAssignment = await insertAssignment({
          trainerId: params.trainerId,
          clientId: params.clientId,
          routineId: params.routineId,
          routineName: params.routineName,
          programName: params.programName,
          scheduleDays: params.scheduleDays,
          note: params.note,
          exercisesJson: params.exercisesJson,
        });

        // Optimistic local update
        const notification: ClientNotification = {
          id: `notif-${Date.now()}`,
          type: 'assignment',
          title: 'New Workout Assigned',
          body: `"${newAssignment.routineName}" for ${params.scheduleDays.join(' & ')}.`,
          assignmentId: newAssignment.id,
          read: false,
          createdAt: Date.now(),
        };

        set((s) => ({
          assignments: [newAssignment, ...s.assignments],
          notifications: [notification, ...s.notifications],
        }));

        return newAssignment;
      },

      updateAssignmentStatus: async (id, status) => {
        // Write to Supabase
        await updateAssignmentStatusDB(id, status);

        // Optimistic local update
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  startedAt: status === 'in_progress' ? Date.now() : a.startedAt,
                  completedAt: status === 'completed' ? Date.now() : a.completedAt,
                }
              : a,
          ),
        }));
      },

      getClientAssignments: (clientId) =>
        get().assignments.filter((a) => a.clientId === clientId),

      getUnreadCount: () =>
        get().notifications.filter((n) => !n.read).length,

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      setDayOverride: (day, routine) =>
        set((s) => ({
          daySelections: {
            ...s.daySelections,
            [day]: routine,
          },
        })),

      clearDayOverride: (day) =>
        set((s) => {
          const nextSelections = { ...s.daySelections };
          delete nextSelections[day];
          return { daySelections: nextSelections };
        }),

      resolveDayRoutine: (clientId, day) =>
        resolveDayRoutineForDay({
          clientId,
          day,
          assignments: get().assignments,
          dayOverrides: get().daySelections,
        }),

      removeRoutineReferences: (clientId, routineId) =>
        set((s) => ({
          assignments: s.assignments.filter(
            (assignment) => !(assignment.clientId === clientId && assignment.trainerId === clientId && assignment.routineId === routineId),
          ),
          daySelections: Object.fromEntries(
            Object.entries(s.daySelections).filter(([, routine]) => routine?.id !== routineId),
          ) as Partial<Record<DayOfWeek, WorkoutRoutine>>,
        })),

      syncRoutineOverrideSnapshot: (routine) =>
        set((s) => ({
          daySelections: Object.fromEntries(
            Object.entries(s.daySelections).map(([day, currentRoutine]) => [
              day,
              currentRoutine?.id === routine.id ? routine : currentRoutine,
            ]),
          ) as Partial<Record<DayOfWeek, WorkoutRoutine>>,
        })),

      setDayRoutineSelection: (day, routine) =>
        routine
          ? get().setDayOverride(day, routine)
          : get().clearDayOverride(day),

      selfAssign: async (params) => {
        const newAssignment = await insertSelfAssignment({
          clientId: params.clientId,
          routineId: params.routineId,
          routineName: params.routineName,
          programName: params.programName,
          scheduleDays: params.scheduleDays,
          exercisesJson: params.exercisesJson,
          source: params.source,
        });

        set((s) => ({
          assignments: [newAssignment, ...s.assignments],
        }));

        return newAssignment;
      },
    }),
    {
      name: 'assignment-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        assignments: state.assignments,
        notifications: state.notifications,
        daySelections: state.daySelections,
      }),
    },
  ),
);
