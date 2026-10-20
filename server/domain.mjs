import { randomUUID } from 'node:crypto';
import { ApiError, found, permitted, requireThat } from './errors.mjs';
import * as v from './validation.mjs';
import { EXERCISES, prescribed } from './catalog.mjs';
import { addDays, dayOfWeek, today } from './dates.mjs';
import { checkPassword, hashPassword } from './auth.mjs';

const now = () => new Date().toISOString();
const clone = (value) => structuredClone(value);
const activeLink = (db, trainerId, memberId) =>
  db.relationships.find(
    (link) =>
      link.trainerId === trainerId &&
      link.memberId === memberId &&
      link.status === 'active',
  );
const isParticipant = (link, userId) =>
  link.memberId === userId || link.trainerId === userId;
const publicAssignment = ({ snapshotProgram, cancelledAt, ...assignment }) =>
  assignment;
const publicOccurrence = ({ cancelledAt, ...occurrence }) => occurrence;

export function person(user, access = 'full') {
  const { passwordHash, ...profile } = user;
  if (access === 'full') return clone(profile);
  // Public/pending projections deliberately exclude contact, goals and intake.
  return {
    id: profile.id,
    name: profile.name,
    email: '',
    role: profile.role,
    bio: access === 'public' ? profile.bio : '',
    goal: '',
    experience: access === 'public' ? profile.experience : 'beginner',
    equipment: [],
    availability: [],
    unit: 'kg',
    isPublic: profile.isPublic,
    specialties: access === 'public' ? profile.specialties : [],
    createdAt: profile.createdAt,
  };
}

export function stateFor(db, userId) {
  const user = found(
    db.users.find((item) => item.id === userId),
    'Account not found.',
  );
  const relationships = db.relationships.filter((link) =>
    isParticipant(link, userId),
  );
  const active = relationships.filter((link) => link.status === 'active');
  const privateMembers = new Set(
    user.role === 'trainer' ? active.map((link) => link.memberId) : [userId],
  );
  const activePeople = new Set(
    active.flatMap((link) => [link.memberId, link.trainerId]),
  );
  const namedPeople = new Set(
    relationships.flatMap((link) => [link.memberId, link.trainerId]),
  );
  db.messages
    .filter(
      (message) =>
        message.senderId === userId || message.recipientId === userId,
    )
    .forEach((message) => {
      namedPeople.add(message.senderId);
      namedPeople.add(message.recipientId);
    });
  const users = db.users
    .filter(
      (item) =>
        item.id === userId ||
        (item.role === 'trainer' && item.isPublic) ||
        namedPeople.has(item.id),
    )
    .map((item) =>
      person(
        item,
        item.id === userId || activePeople.has(item.id)
          ? 'full'
          : item.role === 'trainer' && item.isPublic
            ? 'public'
            : 'name',
      ),
    );
  // Coaches explicitly receive consenting clients' plans for review; members
  // receive only assignment snapshots, never the coach's private library.
  const programs = db.programs
    .filter(
      (program) =>
        program.ownerId === userId ||
        (user.role === 'trainer' &&
          privateMembers.has(program.ownerId) &&
          program.visibility === 'shared'),
    )
    .map(clone);
  if (user.role === 'member') {
    const present = new Set(programs.map((program) => program.id));
    for (const assignment of [...db.assignments].reverse()) {
      if (
        assignment.memberId !== userId ||
        !assignment.snapshotProgram ||
        present.has(assignment.programId)
      )
        continue;
      programs.push(clone(assignment.snapshotProgram));
      present.add(assignment.programId);
    }
    // Shared coach templates are intentional, and only active clients see them.
    for (const program of db.programs) {
      if (
        program.visibility !== 'shared' ||
        !activePeople.has(program.ownerId) ||
        present.has(program.id)
      )
        continue;
      programs.push(clone(program));
      present.add(program.id);
    }
  }
  return {
    user: person(user),
    users,
    relationships: relationships.map((link) => {
      const projected = clone(link);
      if (user.role !== 'trainer') delete projected.trainerNote;
      return projected;
    }),
    programs,
    assignments: db.assignments
      .filter((item) => privateMembers.has(item.memberId))
      .map((item) => clone(publicAssignment(item))),
    occurrences: db.occurrences
      .filter((item) => privateMembers.has(item.memberId))
      .map((item) => clone(publicOccurrence(item))),
    workouts: db.workouts
      .filter((item) => privateMembers.has(item.userId))
      .map(clone),
    notifications: db.notifications
      .filter((item) => item.userId === userId)
      .map(({ actorId, ...notice }) => clone(notice)),
    messages: db.messages
      .filter((item) => item.senderId === userId || item.recipientId === userId)
      .map(clone),
    reviews: db.reviews
      .filter(
        (item) =>
          db.users.some(
            (profile) => profile.id === item.trainerId && profile.isPublic,
          ) ||
          item.memberId === userId ||
          item.trainerId === userId,
      )
      .map(clone),
    exercises: clone(EXERCISES),
    serverTime: now(),
    capabilities: {
      hostedAI: false,
      billing: false,
      email: false,
      push: false,
      mode: 'local',
    },
  };
}

function notify(db, userId, title, body, route, actorId) {
  if (!db.users.some((user) => user.id === userId)) return;
  db.notifications.push({
    id: randomUUID(),
    userId,
    title,
    body,
    route,
    createdAt: now(),
    read: false,
    ...(actorId ? { actorId } : {}),
  });
}

function requireRole(user, role) {
  permitted(
    user.role === role,
    `This action is available to ${role === 'trainer' ? 'trainers' : 'members'} only.`,
  );
}

function ownProgram(db, user, id) {
  return found(
    db.programs.find(
      (program) => program.id === id && program.ownerId === user.id,
    ),
  );
}

function authorizedOccurrence(db, user, id) {
  return found(
    db.occurrences.find(
      (item) =>
        item.id === id &&
        (item.memberId === user.id ||
          (user.role === 'trainer' &&
            item.trainerId === user.id &&
            activeLink(db, user.id, item.memberId))),
    ),
  );
}

function authorizedAssignment(db, user, id) {
  return found(
    db.assignments.find(
      (item) =>
        item.id === id &&
        (item.memberId === user.id ||
          (user.role === 'trainer' &&
            item.trainerId === user.id &&
            activeLink(db, user.id, item.memberId))),
    ),
  );
}

function cancelPlanned(db, assignment) {
  assignment.active = false;
  assignment.cancelledAt = now();
  for (const occurrence of db.occurrences) {
    if (
      occurrence.assignmentId !== assignment.id ||
      !['planned', 'skipped'].includes(occurrence.status)
    )
      continue;
    if (occurrence.date < today()) continue;
    occurrence.status = 'cancelled';
    occurrence.cancelledAt = assignment.cancelledAt;
    occurrence.revision += 1;
  }
}

function validateProgram(input) {
  v.object(input, 'Program', [
    'id',
    'ownerId',
    'title',
    'description',
    'source',
    'difficulty',
    'revision',
    'archived',
    'createdAt',
    'routines',
    'visibility',
    'endorsedBy',
    'endorsedRevision',
  ]);
  const routines = v
    .list(input.routines, 'Routines', 14, 1)
    .map((routine) => v.routine(routine, EXERCISES));
  v.uniqueIds(routines, 'Routines');
  return {
    id: v.id(input.id, 'Program ID'),
    ownerId: v.id(input.ownerId, 'Owner ID'),
    title: v.text(input.title, 'Program title', 120, 1),
    description: v.text(input.description, 'Description', 4000),
    difficulty: v.choice(input.difficulty, 'Difficulty', v.DIFFICULTIES),
    revision: v.number(
      input.revision,
      'Revision',
      1,
      Number.MAX_SAFE_INTEGER,
      true,
    ),
    archived: v.boolean(input.archived, 'Archived'),
    visibility: v.choice(input.visibility, 'Visibility', ['private', 'shared']),
    routines,
  };
}

function getRoutineForWorkout(db, user, input) {
  if (input.occurrenceId) {
    const occurrence = found(
      db.occurrences.find(
        (item) => item.id === input.occurrenceId && item.memberId === user.id,
      ),
    );
    return {
      routine: occurrence.routine,
      programTitle: occurrence.programTitle,
      source: occurrence.source,
      occurrence,
    };
  }
  for (const program of stateFor(db, user.id).programs) {
    const routine = program.routines.find(
      (item) => item.id === input.routineId,
    );
    if (routine)
      return { routine, programTitle: program.title, source: program.source };
  }
  // A deleted template must not make an already-started draft unsaveable.
  const historic = db.occurrences.find(
    (item) => item.memberId === user.id && item.routine.id === input.routineId,
  );
  if (historic)
    return {
      routine: historic.routine,
      programTitle: historic.programTitle,
      source: historic.source,
    };
  // Unscheduled drafts contain their own bounded exercise snapshot and are
  // safely attributable to the member even after deleting their source plan.
  return {
    routine: {
      id: v.id(input.routineId, 'Routine ID'),
      name: v.text(input.routineName, 'Routine name', 120, 1),
    },
    programTitle: v.text(input.programTitle, 'Program title', 120),
    source: 'self',
  };
}

function validateWorkout(input, db, user) {
  v.object(input, 'Workout', [
    'id',
    'userId',
    'occurrenceId',
    'routineId',
    'routineName',
    'programTitle',
    'source',
    'date',
    'startedAt',
    'completedAt',
    'durationSeconds',
    'exercises',
    'reflection',
    'review',
  ]);
  permitted(
    input.userId === user.id,
    'A workout can only be saved to your own journal.',
  );
  const meta = getRoutineForWorkout(db, user, input);
  const exercises = v.exercises(input.exercises, EXERCISES, true);
  requireThat(
    exercises.some((exercise) => exercise.sets.some((set) => set.completed)),
    'Complete at least one set before saving your workout.',
  );
  const startedAt = v.instant(input.startedAt, 'Started time');
  const completedAt = v.instant(input.completedAt, 'Completed time');
  requireThat(
    Date.parse(completedAt) >= Date.parse(startedAt),
    'Completion time cannot precede the start time.',
  );
  requireThat(
    Date.parse(completedAt) <= Date.now() + 10 * 60000,
    'Completion time is in the future. Check your device clock.',
  );
  const durationSeconds = v.number(
    input.durationSeconds,
    'Workout duration',
    0,
    172800,
    true,
  );
  requireThat(
    durationSeconds <=
      Math.ceil((Date.parse(completedAt) - Date.parse(startedAt)) / 1000) + 10,
    'Active duration cannot exceed the elapsed workout time.',
  );
  const workout = {
    id: v.id(input.id, 'Workout ID'),
    userId: user.id,
    ...(meta.occurrence ? { occurrenceId: meta.occurrence.id } : {}),
    routineId: meta.routine.id,
    routineName: meta.routine.name,
    programTitle: meta.programTitle,
    source: meta.source,
    date: v.date(input.date),
    startedAt,
    completedAt,
    durationSeconds,
    exercises,
    reflection: v.reflection(input.reflection),
  };
  return { workout, occurrence: meta.occurrence };
}

const ACTION_KEYS = {
  update_profile: ['updates'],
  change_password: ['currentPassword', 'password'],
  request_link: ['trainerId', 'memberEmail', 'note'],
  respond_link: ['id', 'accept'],
  revoke_link: ['id'],
  save_client_note: ['id', 'text'],
  save_program: ['program'],
  archive_program: ['id', 'archived'],
  delete_program: ['id'],
  assign_program: [
    'programId',
    'memberId',
    'startDate',
    'weeks',
    'mapping',
    'note',
    'operationId',
  ],
  change_occurrence: ['id', 'date', 'status'],
  cancel_assignment: ['id'],
  start_occurrence: ['id'],
  complete_workout: ['workout'],
  update_workout: ['id', 'exercises', 'reflection'],
  review_workout: ['id', 'text'],
  send_message: ['recipientId', 'text'],
  mark_notification: ['id'],
  submit_review: ['trainerId', 'rating', 'body'],
  endorse_program: ['id'],
  delete_account: ['password'],
};

export async function performAction(db, userId, action, { sessionHash } = {}) {
  const user = found(db.users.find((item) => item.id === userId));
  const notice = (...args) => notify(db, ...args, user.id);
  v.object(action, 'Action');
  requireThat(
    typeof action.type === 'string' && Object.hasOwn(ACTION_KEYS, action.type),
    'Unknown action.',
  );
  v.object(action, 'Action', ['type', ...ACTION_KEYS[action.type]]);

  switch (action.type) {
    case 'update_profile': {
      v.object(action.updates, 'Profile updates', [
        'name',
        'bio',
        'goal',
        'experience',
        'equipment',
        'availability',
        'unit',
        'isPublic',
        'specialties',
      ]);
      const updates = action.updates;
      if (updates.name !== undefined)
        user.name = v.text(updates.name, 'Name', 80, 1);
      if (updates.bio !== undefined)
        user.bio = v.text(updates.bio, 'Bio', 2000);
      if (updates.goal !== undefined)
        user.goal = v.text(updates.goal, 'Goal', 1000);
      if (updates.experience !== undefined)
        user.experience = v.choice(
          updates.experience,
          'Experience',
          v.DIFFICULTIES,
        );
      if (updates.equipment !== undefined)
        user.equipment = v.strings(updates.equipment, 'Equipment', 20);
      if (updates.availability !== undefined)
        user.availability = [
          ...new Set(
            v
              .list(updates.availability, 'Availability', 7)
              .map((day) => v.number(day, 'Weekday', 0, 6, true)),
          ),
        ];
      if (updates.unit !== undefined)
        user.unit = v.choice(updates.unit, 'Weight unit', ['kg', 'lb']);
      if (updates.isPublic !== undefined) {
        v.boolean(updates.isPublic, 'Public profile');
        requireThat(
          user.role === 'trainer' || updates.isPublic === false,
          'Only trainers can have public profiles.',
        );
        user.isPublic = updates.isPublic;
      }
      if (updates.specialties !== undefined)
        user.specialties = v.strings(updates.specialties, 'Specialties', 12);
      break;
    }
    case 'change_password': {
      v.password(action.password);
      requireThat(
        typeof action.currentPassword === 'string' &&
          action.currentPassword.length >= 1 &&
          action.currentPassword.length <= 128,
        'Enter your current password (maximum 128 characters).',
      );
      requireThat(
        await checkPassword(action.currentPassword, user.passwordHash),
        'Current password is incorrect.',
        403,
        'incorrect_password',
      );
      user.passwordHash = await hashPassword(action.password);
      db.sessions = db.sessions.filter(
        (session) => session.userId !== user.id || session.hash === sessionHash,
      );
      notice(
        user.id,
        'Password updated',
        'Your password changed and your other signed-in sessions were signed out.',
        'settings',
      );
      break;
    }
    case 'request_link': {
      const note = v.text(action.note ?? '', 'Request note', 1000);
      let trainer;
      let member;
      if (user.role === 'member') {
        requireThat(
          action.memberEmail === undefined,
          'Members request a trainer by profile.',
        );
        trainer = found(
          db.users.find(
            (item) =>
              item.id === action.trainerId &&
              item.role === 'trainer' &&
              item.isPublic,
          ),
          'This trainer is not available for requests.',
        );
        member = user;
      } else {
        requireThat(
          action.trainerId === undefined,
          'Trainers invite a member by email.',
        );
        const memberEmail = v.email(action.memberEmail);
        member = found(
          db.users.find(
            (item) => item.email === memberEmail && item.role === 'member',
          ),
          'No local member account has that email. The member needs to register in this preview first.',
        );
        trainer = user;
      }
      const existing = db.relationships.find(
        (link) => link.trainerId === trainer.id && link.memberId === member.id,
      );
      requireThat(
        existing?.status !== 'active',
        'You are already connected.',
        409,
        'already_connected',
      );
      if (existing?.status === 'pending') {
        if (existing.requestedBy === user.id) break;
        throw new ApiError(
          409,
          'There is already an incoming request. Accept or decline it in your requests.',
          'pending_request',
        );
      }
      const link = {
        id: existing?.id ?? randomUUID(),
        trainerId: trainer.id,
        memberId: member.id,
        requestedBy: user.id,
        status: 'pending',
        createdAt: now(),
        note,
      };
      if (existing) db.relationships[db.relationships.indexOf(existing)] = link;
      else db.relationships.push(link);
      const recipientId = user.id === trainer.id ? member.id : trainer.id;
      notice(
        recipientId,
        'New coaching request',
        `${user.name} sent you a connection request. Private training data is shared only after you accept.`,
        user.role === 'trainer' ? 'discover' : 'clients',
      );
      break;
    }
    case 'respond_link': {
      const link = found(
        db.relationships.find(
          (item) => item.id === action.id && isParticipant(item, user.id),
        ),
      );
      const accept = v.boolean(action.accept, 'Accept request');
      permitted(
        link.requestedBy !== user.id,
        'Only the person receiving a request can accept or decline it.',
      );
      if (link.status === (accept ? 'active' : 'declined')) break;
      requireThat(
        link.status === 'pending',
        'This request is no longer pending.',
        409,
        'stale_request',
      );
      link.status = accept ? 'active' : 'declined';
      notice(
        link.requestedBy,
        accept ? 'Coaching request accepted' : 'Coaching request declined',
        `${user.name} ${accept ? 'accepted' : 'declined'} your request.`,
        user.role === 'member' ? 'clients' : 'discover',
      );
      break;
    }
    case 'revoke_link': {
      const link = found(
        db.relationships.find(
          (item) => item.id === action.id && isParticipant(item, user.id),
        ),
      );
      if (link.status === 'revoked') break;
      link.status = 'revoked';
      for (const assignment of db.assignments.filter(
        (item) =>
          item.trainerId === link.trainerId &&
          item.memberId === link.memberId &&
          item.active,
      ))
        cancelPlanned(db, assignment);
      const recipientId =
        link.trainerId === user.id ? link.memberId : link.trainerId;
      notice(
        recipientId,
        'Coaching connection ended',
        `${user.name} ended the connection. Trainer access and future planned coaching sessions have been revoked. Saved workout history is retained.`,
        user.role === 'member' ? 'clients' : 'discover',
      );
      break;
    }
    case 'save_client_note': {
      requireRole(user, 'trainer');
      const link = found(
        db.relationships.find(
          (item) =>
            item.id === action.id &&
            item.trainerId === user.id &&
            item.status === 'active',
        ),
      );
      link.trainerNote = v.text(action.text, 'Private coaching note', 8000);
      break;
    }
    case 'save_program': {
      const draft = validateProgram(action.program);
      permitted(
        draft.ownerId === user.id,
        'You can only save programs in your own library.',
      );
      const existing = db.programs.find((item) => item.id === draft.id);
      permitted(
        !existing || existing.ownerId === user.id,
        'You cannot overwrite another account’s program.',
      );
      // A lost response can be retried without advancing the revision again.
      // Compare editable content before the optimistic-concurrency check.
      if (
        existing &&
        [
          'ownerId',
          'title',
          'description',
          'difficulty',
          'archived',
          'visibility',
          'routines',
        ].every(
          (key) => JSON.stringify(existing[key]) === JSON.stringify(draft[key]),
        )
      )
        break;
      if (existing)
        requireThat(
          draft.revision === existing.revision,
          'This program changed in another tab. Refresh and reopen it before saving.',
          409,
          'revision_conflict',
        );
      const generated = db.generatedDrafts.find(
        (item) => item.id === draft.id && item.userId === user.id,
      );
      const saved = {
        ...draft,
        source:
          existing?.source ??
          (generated ? 'ai' : user.role === 'trainer' ? 'trainer' : 'self'),
        revision: existing ? existing.revision + 1 : 1,
        createdAt: existing?.createdAt ?? now(),
      };
      // Approval is revision-bound: any edit clears the prior endorsement.
      if (existing) db.programs[db.programs.indexOf(existing)] = saved;
      else db.programs.push(saved);
      db.generatedDrafts = db.generatedDrafts.filter(
        (item) => item.id !== saved.id,
      );
      break;
    }
    case 'archive_program': {
      ownProgram(db, user, action.id).archived = v.boolean(
        action.archived,
        'Archived',
      );
      break;
    }
    case 'delete_program': {
      const program = ownProgram(db, user, action.id);
      db.programs = db.programs.filter((item) => item !== program);
      // Assignments and completed logs retain their independent snapshots.
      break;
    }
    case 'assign_program': {
      const operationId = v.id(action.operationId, 'Operation ID');
      const original = db.operations.find(
        (item) => item.userId === user.id && item.id === operationId,
      );
      if (original) {
        requireThat(
          original.type === action.type &&
            original.payload === JSON.stringify(action),
          'This operation ID has already been used for a different assignment.',
          409,
          'idempotency_conflict',
        );
        break;
      }
      const program = ownProgram(db, user, action.programId);
      requireThat(
        !program.archived,
        'Restore this program before assigning it.',
      );
      const member = found(
        db.users.find(
          (item) => item.id === action.memberId && item.role === 'member',
        ),
      );
      permitted(
        user.role === 'member'
          ? member.id === user.id
          : Boolean(activeLink(db, user.id, member.id)),
        'A trainer needs an accepted coaching connection before assigning a program.',
      );
      const startDate = v.date(action.startDate, 'Start date');
      const weeks = v.number(action.weeks, 'Weeks', 1, 52, true);
      const mapping = v
        .list(action.mapping, 'Day mapping', 7, 1)
        .map((slot) => {
          v.object(slot, 'Day mapping', ['day', 'routineId']);
          const day = v.number(slot.day, 'Weekday', 0, 6, true);
          requireThat(
            program.routines.some((routine) => routine.id === slot.routineId),
            'Every scheduled routine must belong to this program.',
          );
          return { day, routineId: slot.routineId };
        });
      requireThat(
        new Set(mapping.map((slot) => slot.day)).size === mapping.length,
        'Choose one routine per weekday for this assignment.',
      );
      const note = v.text(action.note, 'Assignment note', 2000);
      const assignment = {
        id: randomUUID(),
        ...(user.role === 'trainer' ? { trainerId: user.id } : {}),
        memberId: member.id,
        programId: program.id,
        programTitle: program.title,
        revision: program.revision,
        startDate,
        weeks,
        mapping,
        note,
        active: true,
        snapshotProgram: clone(program),
      };
      const occurrences = [];
      for (let offset = 0; offset < weeks * 7; offset += 1) {
        const date = addDays(startDate, offset);
        const slot = mapping.find((item) => item.day === dayOfWeek(date));
        if (!slot) continue;
        // Multiple intentional sessions on a date are allowed. Only an exact
        // repeated program/routine/date is a duplicate scheduling conflict.
        requireThat(
          !db.occurrences.some(
            (item) =>
              item.memberId === member.id &&
              item.date === date &&
              item.routine.id === slot.routineId &&
              ['planned', 'in_progress'].includes(item.status),
          ),
          `This routine is already scheduled on ${date}. Adjust the dates or cancel its existing assignment.`,
          409,
          'schedule_conflict',
        );
        occurrences.push({
          id: randomUUID(),
          assignmentId: assignment.id,
          memberId: member.id,
          ...(assignment.trainerId ? { trainerId: assignment.trainerId } : {}),
          date,
          routine: clone(
            program.routines.find((routine) => routine.id === slot.routineId),
          ),
          programTitle: program.title,
          source: program.source,
          status: 'planned',
          note,
          revision: 1,
        });
      }
      db.assignments.push(assignment);
      db.occurrences.push(...occurrences);
      db.operations.push({
        id: operationId,
        userId: user.id,
        type: action.type,
        payload: JSON.stringify(action),
        createdAt: now(),
      });
      notice(
        member.id,
        'Training plan scheduled',
        `${program.title}: ${occurrences.length} individual sessions are ready.${note ? ` ${note}` : ''}`,
        'today',
      );
      break;
    }
    case 'change_occurrence': {
      const occurrence = authorizedOccurrence(db, user, action.id);
      requireThat(
        action.date !== undefined || action.status !== undefined,
        'Choose a new date or session status.',
      );
      requireThat(
        occurrence.status !== 'completed',
        'Completed sessions stay in your journal and cannot be rescheduled.',
        409,
        'completed_session',
      );
      const assignment = found(
        db.assignments.find((item) => item.id === occurrence.assignmentId),
      );
      if (action.date !== undefined) {
        requireThat(
          occurrence.status !== 'in_progress',
          'Finish or cancel the active session before rescheduling.',
          409,
          'active_session',
        );
        requireThat(
          assignment.active,
          'This assignment has ended.',
          409,
          'inactive_assignment',
        );
        const date = v.date(action.date);
        requireThat(
          !db.occurrences.some(
            (item) =>
              item.id !== occurrence.id &&
              item.memberId === occurrence.memberId &&
              item.date === date &&
              item.routine.id === occurrence.routine.id &&
              ['planned', 'in_progress'].includes(item.status),
          ),
          'This routine is already scheduled on that date.',
          409,
          'schedule_conflict',
        );
        occurrence.date = date;
      }
      if (action.status !== undefined) {
        v.choice(action.status, 'Session status', [
          'planned',
          'skipped',
          'cancelled',
        ]);
        requireThat(
          action.status !== 'planned' ||
            assignment.active ||
            occurrence.status === 'in_progress',
          'This assignment has ended and cannot be reopened.',
          409,
          'inactive_assignment',
        );
        permitted(
          user.id === occurrence.memberId ||
            occurrence.status !== 'in_progress',
          'Only the member can cancel an active session.',
        );
        occurrence.status =
          action.status === 'planned' && !assignment.active
            ? 'cancelled'
            : action.status;
        if (occurrence.status === 'cancelled') occurrence.cancelledAt = now();
        else delete occurrence.cancelledAt;
      }
      occurrence.revision += 1;
      const recipientId =
        user.id === occurrence.memberId
          ? occurrence.trainerId
          : occurrence.memberId;
      if (
        recipientId &&
        (user.role === 'trainer' || activeLink(db, recipientId, user.id))
      )
        notice(
          recipientId,
          'Scheduled session updated',
          `${occurrence.routine.name} is ${occurrence.status} on ${occurrence.date}.`,
          user.role === 'trainer' ? 'today' : 'clients',
        );
      break;
    }
    case 'cancel_assignment': {
      const assignment = authorizedAssignment(db, user, action.id);
      if (!assignment.active) break;
      cancelPlanned(db, assignment);
      const recipientId =
        user.id === assignment.memberId
          ? assignment.trainerId
          : assignment.memberId;
      if (recipientId)
        notice(
          recipientId,
          'Training assignment ended',
          `${assignment.programTitle}: remaining planned sessions were cancelled. Active sessions and workout history are retained.`,
          user.role === 'trainer' ? 'today' : 'clients',
        );
      break;
    }
    case 'start_occurrence': {
      requireRole(user, 'member');
      const occurrence = authorizedOccurrence(db, user, action.id);
      if (occurrence.status === 'in_progress') break;
      requireThat(
        occurrence.status === 'planned',
        'This session is no longer planned. Refresh your schedule.',
        409,
        'session_not_planned',
      );
      requireThat(
        db.assignments.some(
          (item) => item.id === occurrence.assignmentId && item.active,
        ),
        'This assignment has ended.',
        409,
        'inactive_assignment',
      );
      requireThat(
        !db.occurrences.some(
          (item) =>
            item.memberId === user.id &&
            item.id !== occurrence.id &&
            item.status === 'in_progress',
        ),
        'Another scheduled workout is already active. Resume or cancel it first.',
        409,
        'active_session',
      );
      occurrence.status = 'in_progress';
      occurrence.revision += 1;
      break;
    }
    case 'complete_workout': {
      requireRole(user, 'member');
      v.object(action.workout, 'Workout');
      permitted(
        action.workout.userId === user.id,
        'A workout can only be saved to your own journal.',
      );
      const id = v.id(action.workout.id, 'Workout ID');
      const existing = db.workouts.find((item) => item.id === id);
      if (existing) {
        permitted(existing.userId === user.id);
        // Completion retries never overwrite history or a later journal edit.
        requireThat(
          existing.occurrenceId === action.workout.occurrenceId &&
            existing.routineId === action.workout.routineId,
          'This workout ID was already used for a different session.',
          409,
          'idempotency_conflict',
        );
        break;
      }
      const { workout, occurrence } = validateWorkout(action.workout, db, user);
      if (occurrence) {
        requireThat(
          !db.workouts.some((item) => item.occurrenceId === occurrence.id),
          'This scheduled session already has a completed workout.',
          409,
          'already_completed',
        );
        if (occurrence.status === 'cancelled') {
          // Accept a real offline completion begun before a later cancellation.
          requireThat(
            occurrence.cancelledAt &&
              Date.parse(workout.startedAt) <=
                Date.parse(occurrence.cancelledAt),
            'This session was cancelled before the workout began. Save it as an unscheduled workout instead.',
            409,
            'cancelled_session',
          );
        }
        occurrence.status = 'completed';
        occurrence.revision += 1;
        delete occurrence.cancelledAt;
      }
      db.workouts.push(workout);
      const trainers = db.relationships
        .filter((link) => link.memberId === user.id && link.status === 'active')
        .map((link) => link.trainerId);
      for (const trainerId of trainers)
        notice(
          trainerId,
          'Workout ready to review',
          `${user.name} completed ${workout.routineName} and logged an effort of ${workout.reflection.effort}/10.`,
          'clients',
        );
      break;
    }
    case 'update_workout': {
      requireRole(user, 'member');
      const workout = found(
        db.workouts.find(
          (item) => item.id === action.id && item.userId === user.id,
        ),
      );
      const exercises = v.exercises(action.exercises, EXERCISES, true);
      requireThat(
        exercises.some((exercise) =>
          exercise.sets.some((set) => set.completed),
        ),
        'Keep at least one completed set in your workout.',
      );
      workout.exercises = exercises;
      workout.reflection = v.reflection(action.reflection);
      // A review describes the former log and must be explicitly renewed.
      if (workout.review) {
        const reviewerId = workout.review.trainerId;
        delete workout.review;
        if (activeLink(db, reviewerId, user.id))
          notice(
            reviewerId,
            'Reviewed workout updated',
            `${user.name} edited ${workout.routineName}. Please review the updated log.`,
            'clients',
          );
      }
      break;
    }
    case 'review_workout': {
      requireRole(user, 'trainer');
      const workout = found(
        db.workouts.find(
          (item) =>
            item.id === action.id && activeLink(db, user.id, item.userId),
        ),
      );
      const occurrence = db.occurrences.find(
        (item) => item.id === workout.occurrenceId,
      );
      permitted(
        !occurrence?.trainerId || occurrence.trainerId === user.id,
        'Only the coach who assigned this session can review it.',
      );
      permitted(
        !workout.review || workout.review.trainerId === user.id,
        'Another coach already reviewed this workout. Their feedback cannot be overwritten.',
      );
      workout.review = {
        trainerId: user.id,
        text: v.text(action.text, 'Workout feedback', 4000, 1),
        createdAt: now(),
      };
      notice(
        workout.userId,
        'Your coach left workout feedback',
        `${user.name} reviewed ${workout.routineName}.`,
        'journal',
      );
      break;
    }
    case 'send_message': {
      const recipient = found(
        db.users.find(
          (item) => item.id === action.recipientId && item.id !== user.id,
        ),
      );
      const link =
        user.role === 'trainer'
          ? activeLink(db, user.id, recipient.id)
          : activeLink(db, recipient.id, user.id);
      permitted(link, 'Messaging requires an active coaching connection.');
      const text = v.text(action.text, 'Message', 4000, 1);
      db.messages.push({
        id: randomUUID(),
        senderId: user.id,
        recipientId: recipient.id,
        text,
        createdAt: now(),
      });
      notice(
        recipient.id,
        `Message from ${user.name}`,
        text.length > 160 ? `${text.slice(0, 157)}…` : text,
        'messages',
      );
      break;
    }
    case 'mark_notification': {
      v.id(action.id, 'Notification ID');
      if (action.id === 'all')
        db.notifications
          .filter((item) => item.userId === user.id)
          .forEach((item) => {
            item.read = true;
          });
      else
        found(
          db.notifications.find(
            (item) => item.id === action.id && item.userId === user.id,
          ),
        ).read = true;
      break;
    }
    case 'submit_review': {
      requireRole(user, 'member');
      const trainer = found(
        db.users.find(
          (item) => item.id === action.trainerId && item.role === 'trainer',
        ),
      );
      permitted(
        activeLink(db, trainer.id, user.id),
        'Only actively connected members can review a trainer.',
      );
      const rating = v.number(action.rating, 'Rating', 1, 5, true);
      const body = v.text(action.body, 'Review', 2000, 1);
      const existing = db.reviews.find(
        (item) => item.trainerId === trainer.id && item.memberId === user.id,
      );
      const review = {
        id: existing?.id ?? randomUUID(),
        trainerId: trainer.id,
        memberId: user.id,
        rating,
        body,
        createdAt: now(),
      };
      if (existing) db.reviews[db.reviews.indexOf(existing)] = review;
      else db.reviews.push(review);
      notice(
        trainer.id,
        'A member left a review',
        `${user.name} submitted a ${rating}-star review.`,
        'settings',
      );
      break;
    }
    case 'endorse_program': {
      requireRole(user, 'trainer');
      const program = found(
        db.programs.find(
          (item) =>
            item.id === action.id &&
            item.source === 'ai' &&
            item.visibility === 'shared' &&
            activeLink(db, user.id, item.ownerId),
        ),
      );
      program.endorsedBy = user.id;
      program.endorsedRevision = program.revision;
      notice(
        program.ownerId,
        'Your coach reviewed your generated program',
        `${user.name} endorsed revision ${program.revision} of ${program.title}. Editing the plan clears this endorsement.`,
        'plans',
      );
      break;
    }
    case 'delete_account': {
      requireThat(
        typeof action.password === 'string' &&
          action.password.length >= 1 &&
          action.password.length <= 128,
        'Enter your password (maximum 128 characters).',
      );
      requireThat(
        await checkPassword(action.password, user.passwordHash),
        'Password is incorrect.',
        403,
        'incorrect_password',
      );
      deleteAccount(db, user);
      return { deleted: true };
    }
  }
  return stateFor(db, user.id);
}

function deleteAccount(db, user) {
  const ownedProgramIds = new Set(
    db.programs
      .filter((item) => item.ownerId === user.id)
      .map((item) => item.id),
  );
  for (const assignment of db.assignments.filter(
    (item) => item.trainerId === user.id && item.memberId !== user.id,
  )) {
    cancelPlanned(db, assignment);
    delete assignment.trainerId;
    if (assignment.snapshotProgram) {
      assignment.snapshotProgram.ownerId = 'deleted-account';
      delete assignment.snapshotProgram.endorsedBy;
      delete assignment.snapshotProgram.endorsedRevision;
    }
  }
  for (const occurrence of db.occurrences.filter(
    (item) => item.trainerId === user.id && item.memberId !== user.id,
  ))
    delete occurrence.trainerId;
  for (const workout of db.workouts.filter(
    (item) => item.review?.trainerId === user.id,
  ))
    delete workout.review;
  for (const program of db.programs.filter(
    (item) => item.endorsedBy === user.id,
  )) {
    delete program.endorsedBy;
    delete program.endorsedRevision;
  }
  db.users = db.users.filter((item) => item.id !== user.id);
  db.sessions = db.sessions.filter((item) => item.userId !== user.id);
  db.relationships = db.relationships.filter(
    (item) => !isParticipant(item, user.id),
  );
  db.programs = db.programs.filter((item) => !ownedProgramIds.has(item.id));
  db.assignments = db.assignments.filter((item) => item.memberId !== user.id);
  db.occurrences = db.occurrences.filter((item) => item.memberId !== user.id);
  db.workouts = db.workouts.filter((item) => item.userId !== user.id);
  db.messages = db.messages.filter(
    (item) => item.senderId !== user.id && item.recipientId !== user.id,
  );
  db.reviews = db.reviews.filter(
    (item) => item.memberId !== user.id && item.trainerId !== user.id,
  );
  db.notifications = db.notifications.filter(
    (item) => item.userId !== user.id && item.actorId !== user.id,
  );
  db.operations = db.operations.filter(
    (item) =>
      item.userId !== user.id &&
      !item.payload.includes(`"memberId":"${user.id}"`),
  );
  db.generatedDrafts = db.generatedDrafts.filter(
    (item) => item.userId !== user.id,
  );
}

export function accountExport(db, userId) {
  const state = stateFor(db, userId);
  // Export owned data and conversations only, not a coach's entire client roster.
  return {
    format: 'ai-gym-account-export',
    schemaVersion: db.schemaVersion,
    exportedAt: now(),
    profile: state.user,
    relationships: state.relationships,
    programs: state.programs.filter((item) => item.ownerId === userId),
    assignments: state.assignments.filter(
      (item) => item.memberId === userId || item.trainerId === userId,
    ),
    occurrences: state.occurrences.filter(
      (item) => item.memberId === userId || item.trainerId === userId,
    ),
    workouts: state.workouts.filter((item) => item.userId === userId),
    messages: state.messages,
    notifications: state.notifications,
    reviews: state.reviews.filter(
      (item) => item.memberId === userId || item.trainerId === userId,
    ),
    localPreview: true,
  };
}

export function generateProgram(db, userId, input) {
  const user = found(db.users.find((item) => item.id === userId));
  v.object(input, 'Plan request', [
    'goal',
    'days',
    'minutes',
    'equipment',
    'difficulty',
  ]);
  const goal = v.text(input.goal, 'Goal', 500, 1);
  const days = v.number(input.days, 'Training days', 1, 6, true);
  const minutes = v.number(input.minutes, 'Session minutes', 15, 120, true);
  const equipment = v.strings(input.equipment, 'Equipment', 12);
  equipment.forEach((item) => v.choice(item, 'Equipment', v.EQUIPMENT));
  const difficulty = v.choice(input.difficulty, 'Difficulty', v.DIFFICULTIES);
  const available = new Set(['bodyweight', ...equipment]);
  const sets =
    difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 4;
  const reps = /strength|strong/i.test(goal) ? 8 : 12;
  const restSeconds = /strength|strong/i.test(goal) ? 120 : 75;
  const choose = (ids) =>
    ids.find((exerciseId) =>
      available.has(EXERCISES.find((item) => item.id === exerciseId).equipment),
    );
  const patterns = [
    ['ex-34', 'ex-41', 'ex-17', 'ex-28'],
    ['ex-37', 'ex-01', 'ex-04'],
    ['ex-36', 'ex-38', 'ex-07', 'ex-05', 'ex-33'],
    ['ex-35', 'ex-40', 'ex-18', 'ex-29'],
    ['ex-27', 'ex-10', 'ex-04'],
    ['ex-32', 'ex-31'],
  ];
  const count = Math.min(6, Math.max(3, Math.floor(minutes / (sets * 2.5))));
  const routines = Array.from({ length: days }, (_, index) => {
    const selected = Array.from({ length: count }, (__, position) =>
      choose(patterns[(position + index * 2) % patterns.length]),
    );
    const unique = [...new Set(selected)];
    // Bodyweight pulling is represented honestly by trunk/back control work,
    // rather than claiming equipment-free pull-ups or prescribing unavailable kit.
    return {
      id: randomUUID(),
      name: `Session ${index + 1} · ${index % 2 === 0 ? 'Strength & control' : 'Balance & movement'}`,
      durationMinutes: minutes,
      exercises: unique.map((exerciseId) =>
        prescribed(exerciseId, {
          sets,
          reps: exerciseId === 'ex-31' ? 0 : reps,
          weight: 0,
          restSeconds,
          ...(exerciseId === 'ex-31' ? { durationSeconds: 30 } : {}),
        }),
      ),
    };
  });
  const program = {
    id: randomUUID(),
    ownerId: user.id,
    title: `${days}-day ${difficulty} training plan`,
    description: `Local template plan for: ${goal}. This plan was assembled from a local exercise library, not a hosted AI model. Review every movement and choose appropriate starting loads before training. Each load starts at 0 kg for you to set; bodyweight movements remain 0 kg.`,
    source: 'ai',
    difficulty,
    revision: 1,
    archived: false,
    createdAt: now(),
    routines,
    visibility: 'private',
  };
  validateProgram(program);
  const cutoff = Date.now() - 7 * 86400000;
  db.generatedDrafts = db.generatedDrafts.filter(
    (item) => Date.parse(item.createdAt) >= cutoff,
  );
  db.generatedDrafts.push({
    id: program.id,
    userId: user.id,
    createdAt: now(),
  });
  return { program, provider: 'local-template' };
}
