import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Assignment, ClientNotification, DayOfWeek } from '@/types/assignment';
import { ROUTINES } from '@/data/routines';

// Seed some initial assignments so the MVP demo feels alive
const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asgn-01',
    trainerId: 'trainer-marko',
    clientId: 'cl-05', // Alex Johnson (the logged-in client)
    routineId: 'rt-01',
    routineName: 'Push — Chest Focused',
    programName: "Marko's Strength Foundation",
    scheduleDays: ['Mon', 'Thu'],
    status: 'assigned',
    note: 'Focus on controlled negatives this week.',
    assignedAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'asgn-02',
    trainerId: 'trainer-marko',
    clientId: 'cl-05',
    routineId: 'rt-02',
    routineName: 'Pull Day Chapter 3',
    programName: "Marko's Strength Foundation",
    scheduleDays: ['Tue', 'Fri'],
    status: 'in_progress',
    note: 'Add extra back-off set on deadlifts.',
    assignedAt: Date.now() - 5 * 86400000,
    startedAt: Date.now() - 3 * 86400000,
  },
  {
    id: 'asgn-03',
    trainerId: 'trainer-marko',
    clientId: 'cl-05',
    routineId: 'rt-03',
    routineName: 'Lower Body',
    scheduleDays: ['Wed', 'Sat'],
    status: 'completed',
    assignedAt: Date.now() - 10 * 86400000,
    startedAt: Date.now() - 9 * 86400000,
    completedAt: Date.now() - 1 * 86400000,
  },
  {
    id: 'asgn-04',
    trainerId: 'trainer-marko',
    clientId: 'cl-01', // Sarah Mitchell
    routineId: 'rt-04',
    routineName: 'Push — Shoulders',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    status: 'assigned',
    assignedAt: Date.now() - 1 * 86400000,
  },
  {
    id: 'asgn-05',
    trainerId: 'trainer-marko',
    clientId: 'cl-02', // James Kim
    routineId: 'rt-05',
    routineName: 'Upper Body Special',
    scheduleDays: ['Tue', 'Thu'],
    status: 'in_progress',
    assignedAt: Date.now() - 7 * 86400000,
    startedAt: Date.now() - 6 * 86400000,
  },
];

const SEED_NOTIFICATIONS: ClientNotification[] = [
  {
    id: 'notif-01',
    type: 'assignment',
    title: 'New Workout Assigned',
    body: 'Marko assigned you "Push — Chest Focused" for Mon & Thu.',
    assignmentId: 'asgn-01',
    read: false,
    createdAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'notif-02',
    type: 'reminder',
    title: 'Workout Today',
    body: 'You have "Pull Day Chapter 3" scheduled for today.',
    assignmentId: 'asgn-02',
    read: false,
    createdAt: Date.now() - 1 * 3600000,
  },
  {
    id: 'notif-03',
    type: 'assignment',
    title: 'Program Completed!',
    body: 'Great work finishing "Lower Body" — Marko has been notified.',
    assignmentId: 'asgn-03',
    read: true,
    createdAt: Date.now() - 1 * 86400000,
  },
];

interface AssignmentState {
  assignments: Assignment[];
  notifications: ClientNotification[];

  // Trainer actions
  createAssignment: (params: {
    clientId: string;
    routineId: string;
    scheduleDays: DayOfWeek[];
    note?: string;
    programName?: string;
  }) => Assignment;
  updateAssignmentStatus: (id: string, status: Assignment['status']) => void;

  // Client actions
  getClientAssignments: (clientId: string) => Assignment[];
  getUnreadCount: () => number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

export const useAssignmentStore = create<AssignmentState>()(
  persist(
    (set, get) => ({
      assignments: SEED_ASSIGNMENTS,
      notifications: SEED_NOTIFICATIONS,

      createAssignment: (params) => {
        const routine = ROUTINES.find((r) => r.id === params.routineId);
        const newAssignment: Assignment = {
          id: `asgn-${Date.now()}`,
          trainerId: 'trainer-marko',
          clientId: params.clientId,
          routineId: params.routineId,
          routineName: routine?.name ?? 'Unknown Routine',
          programName: params.programName,
          scheduleDays: params.scheduleDays,
          status: 'assigned',
          note: params.note,
          assignedAt: Date.now(),
        };

        const notification: ClientNotification = {
          id: `notif-${Date.now()}`,
          type: 'assignment',
          title: 'New Workout Assigned',
          body: `Marko assigned you "${newAssignment.routineName}" for ${params.scheduleDays.join(' & ')}.`,
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

      updateAssignmentStatus: (id, status) =>
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
        })),

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
    }),
    {
      name: 'assignment-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        assignments: state.assignments,
        notifications: state.notifications,
      }),
    },
  ),
);
