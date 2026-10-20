import { randomUUID } from 'node:crypto';
import { hashPassword } from './auth.mjs';
import { prescribed } from './catalog.mjs';
import { today, addDays, dayOfWeek } from './dates.mjs';

export const SCHEMA_VERSION = 1;
export const DEMO_PASSWORD = 'TrainToday!2026';

export function emptyDatabase() {
  return {
    schemaVersion: SCHEMA_VERSION,
    users: [],
    sessions: [],
    relationships: [],
    programs: [],
    assignments: [],
    occurrences: [],
    workouts: [],
    notifications: [],
    messages: [],
    reviews: [],
    operations: [],
    generatedDrafts: [],
  };
}

export function newPerson({
  id = randomUUID(),
  name,
  email,
  role,
  createdAt = new Date().toISOString(),
}) {
  return {
    id,
    name,
    email,
    role,
    bio: '',
    goal: '',
    experience: 'beginner',
    equipment: ['bodyweight'],
    availability: [],
    unit: 'kg',
    isPublic: false,
    specialties: [],
    createdAt,
  };
}

export async function seedDatabase() {
  const db = emptyDatabase();
  const current = today();
  const createdAt = `${addDays(current, -35)}T14:00:00.000Z`;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const member = {
    ...newPerson({
      id: 'demo-member',
      name: 'Alex Morgan',
      email: 'member@aigym.local',
      role: 'member',
      createdAt,
    }),
    bio: 'Demo account — building a consistent training routine.',
    goal: 'Build strength and train consistently three days each week.',
    experience: 'intermediate',
    equipment: ['bodyweight', 'dumbbell', 'barbell', 'cable'],
    availability: [1, 3, 5],
  };
  const trainer = {
    ...newPerson({
      id: 'demo-trainer',
      name: 'Jordan Lee',
      email: 'trainer@aigym.local',
      role: 'trainer',
      createdAt,
    }),
    bio: 'Demo coach profile. Practical strength training, sustainable habits, and clear feedback.',
    experience: 'advanced',
    isPublic: true,
    specialties: ['Strength', 'Beginner foundations', 'Consistency'],
  };
  const member2 = {
    ...newPerson({
      id: 'fixture-member',
      name: 'Casey Chen',
      email: 'member2@aigym.local',
      role: 'member',
      createdAt,
    }),
    goal: 'Independent demo account for privacy and consent testing.',
  };
  const trainer2 = {
    ...newPerson({
      id: 'fixture-trainer',
      name: 'Taylor Rivera',
      email: 'trainer2@aigym.local',
      role: 'trainer',
      createdAt,
    }),
    bio: 'Independent demo coach for relationship and account-isolation checks.',
    isPublic: true,
    specialties: ['Mobility', 'Home workouts'],
  };
  db.users = [member, trainer, member2, trainer2].map((profile) => ({
    ...profile,
    passwordHash,
  }));
  db.relationships.push({
    id: 'demo-relationship',
    trainerId: trainer.id,
    memberId: member.id,
    requestedBy: member.id,
    status: 'active',
    createdAt,
    note: 'Demo connection with explicit member consent.',
    trainerNote:
      'Demo note: focus on consistency, controlled reps, and realistic progression.',
  });
  const coachProgram = {
    id: 'demo-foundation',
    ownerId: trainer.id,
    title: 'Strength foundations',
    description:
      'A balanced three-day demonstration program. Adjust starting loads to your own ability; demo weights are examples.',
    source: 'trainer',
    difficulty: 'intermediate',
    revision: 1,
    archived: false,
    createdAt,
    visibility: 'private',
    routines: [
      {
        id: 'demo-routine-a',
        name: 'Full body · A',
        durationMinutes: 45,
        exercises: [
          prescribed('ex-17', { reps: 8, weight: 40, restSeconds: 120 }),
          prescribed('ex-01', { reps: 8, weight: 30, restSeconds: 120 }),
          prescribed('ex-36', { reps: 10, weight: 12.5 }),
          prescribed('ex-31', {
            reps: 0,
            durationSeconds: 30,
            restSeconds: 60,
          }),
        ],
      },
      {
        id: 'demo-routine-b',
        name: 'Full body · B',
        durationMinutes: 45,
        exercises: [
          prescribed('ex-18', { reps: 10, weight: 35, restSeconds: 120 }),
          prescribed('ex-27', { reps: 10, weight: 10 }),
          prescribed('ex-08', { reps: 12, weight: 25 }),
          prescribed('ex-32', { reps: 10, restSeconds: 60 }),
        ],
      },
      {
        id: 'demo-routine-c',
        name: 'Full body · C',
        durationMinutes: 40,
        exercises: [
          prescribed('ex-34', { reps: 12, weight: 16 }),
          prescribed('ex-04', { reps: 10 }),
          prescribed('ex-07', { reps: 12, weight: 25 }),
          prescribed('ex-30', { reps: 10, restSeconds: 60 }),
        ],
      },
    ],
  };
  const personalProgram = {
    id: 'demo-home-reset',
    ownerId: member.id,
    title: 'The home reset',
    description:
      'A short equipment-free session for busy days. This is seeded demonstration content.',
    source: 'self',
    difficulty: 'beginner',
    revision: 1,
    archived: false,
    createdAt,
    visibility: 'private',
    routines: [
      {
        id: 'demo-home-routine',
        name: 'Twenty-minute reset',
        durationMinutes: 20,
        exercises: [
          prescribed('ex-28', { sets: 2, reps: 12, restSeconds: 45 }),
          prescribed('ex-04', { sets: 2, reps: 8, restSeconds: 60 }),
          prescribed('ex-29', { sets: 2, reps: 12, restSeconds: 45 }),
          prescribed('ex-33', { sets: 2, reps: 8, restSeconds: 45 }),
        ],
      },
    ],
  };
  db.programs.push(coachProgram, personalProgram);
  const weekday = dayOfWeek(current);
  const mapping = [0, 2, 4].map((offset, index) => ({
    day: (weekday + offset) % 7,
    routineId: coachProgram.routines[index].id,
  }));
  const assignment = {
    id: 'demo-assignment',
    trainerId: trainer.id,
    memberId: member.id,
    programId: coachProgram.id,
    programTitle: coachProgram.title,
    revision: 1,
    startDate: addDays(current, -14),
    weeks: 6,
    mapping,
    note: 'Demo schedule. Choose controlled reps and a load that leaves a little in reserve.',
    active: true,
    snapshotProgram: structuredClone(coachProgram),
  };
  db.assignments.push(assignment);
  for (let offset = 0; offset < assignment.weeks * 7; offset += 1) {
    const date = addDays(assignment.startDate, offset);
    const slot = mapping.find((item) => item.day === dayOfWeek(date));
    if (!slot) continue;
    const routine = structuredClone(
      coachProgram.routines.find((item) => item.id === slot.routineId),
    );
    const occurrence = {
      id: `demo-occurrence-${offset}`,
      assignmentId: assignment.id,
      memberId: member.id,
      trainerId: trainer.id,
      date,
      routine,
      programTitle: coachProgram.title,
      source: 'trainer',
      status: date < current ? 'completed' : 'planned',
      note: assignment.note,
      revision: 1,
    };
    db.occurrences.push(occurrence);
    if (date >= current) continue;
    const index = db.workouts.length;
    const workout = {
      id: `demo-workout-${offset}`,
      userId: member.id,
      occurrenceId: occurrence.id,
      routineId: routine.id,
      routineName: routine.name,
      programTitle: coachProgram.title,
      source: 'trainer',
      date,
      startedAt: `${date}T14:00:00.000Z`,
      completedAt: `${date}T14:42:00.000Z`,
      durationSeconds: 2520,
      exercises: routine.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weight: Math.max(
            0,
            set.weight - (index < 3 && set.weight > 0 ? 2.5 : 0),
          ),
          completed: true,
        })),
      })),
      reflection: {
        effort: index % 2 === 0 ? 7 : 6,
        notes:
          index % 2 === 0
            ? 'Demo journal: good energy today. Last set felt challenging but controlled.'
            : 'Demo journal: kept the session steady and finished feeling good.',
      },
    };
    if (index < 4)
      workout.review = {
        trainerId: trainer.id,
        text: 'Demo feedback: great consistency. Keep the same load until each repetition feels controlled.',
        createdAt: `${date}T18:00:00.000Z`,
      };
    db.workouts.push(workout);
  }
  db.messages.push(
    {
      id: 'demo-message-1',
      senderId: trainer.id,
      recipientId: member.id,
      text: 'Welcome to your demo training journal. Your next block is ready—open Today to see the session and leave a reflection when you finish.',
      createdAt: `${addDays(current, -2)}T16:00:00.000Z`,
    },
    {
      id: 'demo-message-2',
      senderId: member.id,
      recipientId: trainer.id,
      text: 'Thanks! The shorter sessions are helping me stay consistent. I will keep the weights steady this week.',
      createdAt: `${addDays(current, -1)}T16:00:00.000Z`,
    },
  );
  db.reviews.push({
    id: 'demo-review',
    trainerId: trainer.id,
    memberId: member.id,
    rating: 5,
    body: 'Demo review: clear instructions and encouraging feedback make training easier to stick with.',
    createdAt: `${addDays(current, -3)}T17:00:00.000Z`,
  });
  db.notifications.push(
    {
      id: 'demo-notice-member',
      userId: member.id,
      title: 'Your training block is ready',
      body: 'Jordan assigned Strength foundations. This is demonstration data for the local web preview.',
      createdAt: `${addDays(current, -1)}T15:00:00.000Z`,
      read: false,
      route: 'today',
    },
    {
      id: 'demo-notice-trainer',
      userId: trainer.id,
      title: 'Workout reflections to review',
      body: 'Alex has completed sessions awaiting your feedback. All seeded activity is demonstration data.',
      createdAt: `${addDays(current, -1)}T15:00:00.000Z`,
      read: false,
      route: 'clients',
    },
  );
  return db;
}
