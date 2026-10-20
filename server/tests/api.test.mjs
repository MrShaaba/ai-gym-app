import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { startServer } from '../index.mjs';
import { JsonStore } from '../store.mjs';
import { prescribed } from '../catalog.mjs';
import { today, addDays, dayOfWeek } from '../dates.mjs';

const PASSWORD = 'Testing Today!2026';
const quiet = { error() {} };

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'ai-gym-api-test-'));
  const staticDir = join(directory, 'web');
  await mkdir(staticDir);
  await writeFile(
    join(staticDir, 'index.html'),
    '<!doctype html><title>AI Gym test shell</title>',
  );
  await writeFile(join(staticDir, 'app.js'), '/* test asset */');
  const server = await startServer({
    port: 0,
    dataDir: join(directory, 'data'),
    seed: false,
    staticDir,
    logger: quiet,
    ...options,
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await server.shutdown();
    await rm(directory, { recursive: true, force: true });
  });
  const call = async (
    path,
    {
      token,
      body,
      method = body === undefined ? 'GET' : 'POST',
      headers = {},
    } = {},
    status = 200,
  ) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${path}: ${JSON.stringify(result)}`,
    );
    return result;
  };
  const register = (role = 'member', extra = {}) =>
    call(
      '/api/auth/register',
      {
        body: {
          name: `${role} ${randomUUID().slice(0, 8)}`,
          email: `${randomUUID()}@example.test`,
          password: PASSWORD,
          role,
          ...extra,
        },
      },
      201,
    );
  const action = (auth, body, status) =>
    call('/api/action', { token: auth.token, body }, status);
  const state = (auth) => call('/api/state', { token: auth.token });
  const connect = async (member, trainer, { initiatedBy = 'trainer' } = {}) => {
    let result;
    if (initiatedBy === 'trainer')
      result = await action(trainer, {
        type: 'request_link',
        memberEmail: member.state.user.email,
        note: 'Please review this request.',
      });
    else {
      await action(trainer, {
        type: 'update_profile',
        updates: { isPublic: true },
      });
      result = await action(member, {
        type: 'request_link',
        trainerId: trainer.state.user.id,
        note: 'Please coach me.',
      });
    }
    const link = result.relationships.find(
      (item) =>
        item.memberId === member.state.user.id &&
        item.trainerId === trainer.state.user.id,
    );
    await action(initiatedBy === 'trainer' ? member : trainer, {
      type: 'respond_link',
      id: link.id,
      accept: true,
    });
    return link.id;
  };
  return {
    server,
    directory,
    staticDir,
    base,
    call,
    register,
    action,
    state,
    connect,
  };
}

function programFor(
  auth,
  {
    title = 'Test plan',
    exercises = [prescribed('ex-34', { weight: 22.5, sets: 2, reps: 8 })],
    ...rest
  } = {},
) {
  return {
    id: randomUUID(),
    ownerId: auth.state.user.id,
    title,
    description: 'Integration test prescription',
    source: auth.state.user.role === 'trainer' ? 'trainer' : 'self',
    difficulty: 'beginner',
    revision: 1,
    archived: false,
    createdAt: new Date().toISOString(),
    visibility: 'private',
    routines: [
      { id: randomUUID(), name: 'Session A', durationMinutes: 30, exercises },
      {
        id: randomUUID(),
        name: 'Session B',
        durationMinutes: 30,
        exercises: [prescribed('ex-37', { sets: 2, reps: 10, weight: 10 })],
      },
    ],
    ...rest,
  };
}

async function saveAndAssign(
  f,
  owner,
  member = owner,
  { startDate = today(), weeks = 2, program, mapping } = {},
) {
  program ??= programFor(owner);
  await f.action(owner, { type: 'save_program', program });
  const payload = {
    type: 'assign_program',
    operationId: randomUUID(),
    programId: program.id,
    memberId: member.state.user.id,
    startDate,
    weeks,
    mapping: mapping ?? [
      { day: dayOfWeek(startDate), routineId: program.routines[0].id },
      {
        day: (dayOfWeek(startDate) + 2) % 7,
        routineId: program.routines[1].id,
      },
    ],
    note: 'Maintain controlled repetitions.',
  };
  const state = await f.action(owner, payload);
  const assignment = state.assignments.find(
    (item) => item.programId === program.id,
  );
  const occurrences = state.occurrences
    .filter((item) => item.assignmentId === assignment.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { program, payload, assignment, occurrences };
}

function workoutFor(auth, occurrence, overrides = {}) {
  const completedAt = new Date().toISOString();
  const startedAt = new Date(Date.now() - 30 * 60000).toISOString();
  return {
    id: randomUUID(),
    userId: auth.state.user.id,
    occurrenceId: occurrence.id,
    routineId: occurrence.routine.id,
    routineName: occurrence.routine.name,
    programTitle: occurrence.programTitle,
    source: occurrence.source,
    date: today(),
    startedAt,
    completedAt,
    durationSeconds: 1200,
    exercises: occurrence.routine.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, completed: true })),
    })),
    reflection: {
      effort: 7,
      notes: 'Controlled reps. Decimal load preserved.',
    },
    ...overrides,
  };
}

test('registration starts empty, derives roles, preserves password spaces and never exposes auth secrets', async (t) => {
  const f = await fixture(t);
  const rawPassword = '  meaningful password spaces  ';
  const member = await f.register('member', {
    email: ' SPACED@EXAMPLE.TEST ',
    password: rawPassword,
  });
  assert.equal(member.state.user.email, 'spaced@example.test');
  assert.equal(member.state.workouts.length, 0);
  assert.equal(member.state.programs.length, 0);
  assert.equal(member.state.occurrences.length, 0);
  assert.equal(member.state.capabilities.hostedAI, false);
  assert.equal(JSON.stringify(member.state).includes('passwordHash'), false);
  const persisted = await readFile(f.server.store.path, 'utf8');
  assert.ok(persisted.includes('scrypt$16384'));
  assert.equal(persisted.includes(rawPassword), false);
  assert.equal(persisted.includes(member.token), false);
  await f.call(
    '/api/auth/login',
    { body: { email: 'spaced@example.test', password: rawPassword.trim() } },
    401,
  );
  await f.call('/api/auth/login', {
    body: { email: 'spaced@example.test', password: rawPassword },
  });
  await f.call(
    '/api/auth/register',
    {
      body: {
        name: 'Admin',
        email: 'admin@example.test',
        password: PASSWORD,
        role: 'admin',
      },
    },
    400,
  );
  await f.call(
    '/api/auth/register',
    {
      body: {
        name: 'Whitespace',
        email: 'whitespace@example.test',
        password: '            ',
        role: 'member',
      },
    },
    400,
  );
  await f.action(
    member,
    { type: 'update_profile', updates: { role: 'trainer' } },
    400,
  );
  await f.action(
    member,
    { type: 'update_profile', updates: { isPublic: true } },
    400,
  );
  await f.call('/api/state', {}, 401);
  await f.action(
    member,
    {
      type: 'change_password',
      currentPassword: rawPassword,
      password: '            ',
    },
    400,
  );
  await f.action(member, {
    type: 'change_password',
    currentPassword: rawPassword,
    password: '  new intentional spaces  ',
  });
  await f.action(member, {
    type: 'delete_account',
    password: '  new intentional spaces  ',
  });
});

test('pending requests reveal no intake/history; only the recipient can consent; revocation is immediate', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const stranger = await f.register();
  const trainer = await f.register('trainer');
  const otherCoach = await f.register('trainer');
  await f.action(member, {
    type: 'update_profile',
    updates: {
      goal: 'PRIVATE GOAL',
      bio: 'PRIVATE BIO',
      equipment: ['barbell'],
    },
  });
  const plan = await saveAndAssign(f, member);
  await f.action(member, {
    type: 'complete_workout',
    workout: workoutFor(member, plan.occurrences[0]),
  });
  const pending = await f.action(trainer, {
    type: 'request_link',
    memberEmail: member.state.user.email,
    note: 'Coaching invitation',
  });
  const id = pending.relationships[0].id;
  assert.equal(pending.workouts.length, 0);
  assert.equal(pending.programs.length, 0);
  assert.equal(
    pending.users.find((item) => item.id === member.state.user.id).goal,
    '',
  );
  assert.equal(
    pending.users.find((item) => item.id === member.state.user.id).email,
    '',
  );
  await f.action(trainer, { type: 'respond_link', id, accept: true }, 403);
  await f.action(stranger, { type: 'respond_link', id, accept: true }, 404);
  await f.action(member, { type: 'respond_link', id, accept: true });
  const accepted = await f.state(trainer);
  assert.equal(accepted.workouts.length, 1);
  assert.equal(
    accepted.programs.length,
    0,
    'Private member programs stay private after consent',
  );
  assert.equal(
    accepted.users.find((item) => item.id === member.state.user.id).goal,
    'PRIVATE GOAL',
  );
  await f.action(trainer, {
    type: 'save_client_note',
    id,
    text: 'PRIVATE COACH NOTE',
  });
  assert.equal(
    JSON.stringify(await f.state(member)).includes('PRIVATE COACH NOTE'),
    false,
  );
  assert.equal((await f.state(otherCoach)).workouts.length, 0);
  await f.action(member, { type: 'revoke_link', id });
  const revoked = await f.state(trainer);
  assert.equal(revoked.workouts.length, 0);
  assert.equal(revoked.programs.length, 0);
  assert.equal(
    revoked.users.find((item) => item.id === member.state.user.id).goal,
    '',
  );
  await f.action(
    trainer,
    {
      type: 'review_workout',
      id: accepted.workouts[0].id,
      text: 'Forbidden after revocation.',
    },
    404,
  );
});

test('public discovery exposes only opted-in trainer metadata and no private email or intake', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  const privateTrainer = await f.register('trainer');
  await f.action(trainer, {
    type: 'update_profile',
    updates: {
      isPublic: true,
      bio: 'Public coaching bio',
      goal: 'PRIVATE',
      availability: [1],
      equipment: ['barbell'],
      specialties: ['Strength'],
    },
  });
  const state = await f.state(member);
  const profile = state.users.find((item) => item.id === trainer.state.user.id);
  assert.equal(profile.email, '');
  assert.equal(profile.goal, '');
  assert.deepEqual(profile.equipment, []);
  assert.deepEqual(profile.availability, []);
  assert.equal(profile.bio, 'Public coaching bio');
  assert.equal(
    state.users.some((item) => item.id === privateTrainer.state.user.id),
    false,
  );
  const request = await f.action(member, {
    type: 'request_link',
    trainerId: trainer.state.user.id,
    note: '',
  });
  await f.action(
    member,
    { type: 'respond_link', id: request.relationships[0].id, accept: true },
    403,
  );
  await f.action(trainer, {
    type: 'respond_link',
    id: request.relationships[0].id,
    accept: true,
  });
});

test('each recurring date is independent; assignment and completion retries are atomic and idempotent', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  await f.connect(member, trainer);
  const plan = await saveAndAssign(f, trainer, member, { weeks: 3 });
  assert.equal(plan.occurrences.length, 6);
  await Promise.all(
    Array.from({ length: 4 }, () => f.action(trainer, plan.payload)),
  );
  assert.equal((await f.state(member)).occurrences.length, 6);
  await f.action(
    trainer,
    { ...plan.payload, note: 'Different request content' },
    409,
  );
  const workout = workoutFor(member, plan.occurrences[0], {
    source: 'ai',
    routineName: 'Forged name',
    programTitle: 'Forged title',
  });
  await Promise.all(
    Array.from({ length: 6 }, () =>
      f.action(member, { type: 'complete_workout', workout }),
    ),
  );
  const after = await f.state(member);
  assert.equal(after.workouts.length, 1);
  assert.equal(after.workouts[0].source, 'trainer');
  assert.equal(after.workouts[0].routineName, plan.occurrences[0].routine.name);
  assert.equal(after.workouts[0].exercises[0].sets[0].weight, 22.5);
  assert.equal(
    after.occurrences.filter((item) => item.status === 'completed').length,
    1,
  );
  assert.equal(
    after.occurrences.filter((item) => item.status === 'planned').length,
    5,
  );
  await f.action(
    member,
    { type: 'complete_workout', workout: { ...workout, id: randomUUID() } },
    409,
  );
  const other = await f.register();
  await f.action(other, { type: 'complete_workout', workout }, 403);
});

test('injected disk failure preserves both workout and occurrence state; retry commits both', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const plan = await saveAndAssign(f, member);
  await f.action(member, {
    type: 'start_occurrence',
    id: plan.occurrences[0].id,
  });
  const workout = workoutFor(member, plan.occurrences[0]);
  const originalWrite = f.server.store.write.bind(f.server.store);
  let failed = false;
  f.server.store.write = async (data) => {
    if (!failed) {
      failed = true;
      throw new Error('Injected disk failure');
    }
    return originalWrite(data);
  };
  await f.action(member, { type: 'complete_workout', workout }, 500);
  const unchanged = await f.state(member);
  assert.equal(unchanged.workouts.length, 0);
  assert.equal(
    unchanged.occurrences.find((item) => item.id === plan.occurrences[0].id)
      .status,
    'in_progress',
  );
  await f.action(member, { type: 'complete_workout', workout });
  assert.equal((await f.state(member)).workouts.length, 1);
  assert.equal(
    JSON.parse(await readFile(f.server.store.path, 'utf8')).workouts.length,
    1,
  );
});

test('program revisions detect conflicting edits, identical retries do not increment, and snapshots survive deletion', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  await f.connect(member, trainer);
  const plan = await saveAndAssign(f, trainer, member);
  const revised = {
    ...plan.program,
    title: 'Revised plan',
    routines: plan.program.routines.map((routine) => ({
      ...routine,
      name: 'Revised session',
    })),
  };
  const result = await f.action(trainer, {
    type: 'save_program',
    program: revised,
  });
  assert.equal(
    result.programs.find((item) => item.id === plan.program.id).revision,
    2,
  );
  await f.action(trainer, { type: 'save_program', program: revised });
  assert.equal(
    (await f.state(trainer)).programs.find(
      (item) => item.id === plan.program.id,
    ).revision,
    2,
  );
  await f.action(
    trainer,
    {
      type: 'save_program',
      program: { ...plan.program, title: 'Stale conflicting title' },
    },
    409,
  );
  await f.action(
    member,
    {
      type: 'save_program',
      program: { ...revised, ownerId: member.state.user.id },
    },
    403,
  );
  await f.action(trainer, { type: 'delete_program', id: plan.program.id });
  const memberState = await f.state(member);
  assert.equal(
    memberState.programs.find((item) => item.id === plan.program.id).title,
    plan.program.title,
  );
  assert.equal(memberState.occurrences.length, 4);
  await f.action(member, {
    type: 'complete_workout',
    workout: workoutFor(member, plan.occurrences[0]),
  });
  assert.equal(
    (await f.state(member)).workouts[0].programTitle,
    plan.program.title,
  );
});

test('schedule transitions reject forged completion and preserve past misses when cancelling future sessions', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const plan = await saveAndAssign(f, member, member, {
    startDate: addDays(today(), -7),
    weeks: 3,
  });
  const [past, pastSecond, current, later] = plan.occurrences;
  await f.action(member, {
    type: 'change_occurrence',
    id: past.id,
    status: 'skipped',
  });
  await f.action(
    member,
    { type: 'change_occurrence', id: current.id, status: 'completed' },
    400,
  );
  await f.action(member, { type: 'start_occurrence', id: current.id });
  await f.action(member, { type: 'start_occurrence', id: later.id }, 409);
  await f.action(member, {
    type: 'change_occurrence',
    id: current.id,
    status: 'planned',
  });
  await f.action(member, { type: 'start_occurrence', id: current.id });
  await f.action(member, { type: 'cancel_assignment', id: plan.assignment.id });
  const state = await f.state(member);
  assert.equal(
    state.occurrences.find((item) => item.id === past.id).status,
    'skipped',
  );
  assert.equal(
    state.occurrences.find((item) => item.id === pastSecond.id).status,
    'planned',
  );
  assert.equal(
    state.occurrences.find((item) => item.id === current.id).status,
    'in_progress',
  );
  assert.equal(
    state.occurrences.find((item) => item.id === later.id).status,
    'cancelled',
  );
  await f.action(member, { type: 'start_occurrence', id: pastSecond.id }, 409);
  await f.action(member, {
    type: 'complete_workout',
    workout: workoutFor(member, current),
  });
  await f.action(
    member,
    { type: 'change_occurrence', id: current.id, date: addDays(today(), 1) },
    409,
  );
});

test('messages, review eligibility, notifications and trainer feedback enforce active ownership', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  const secondCoach = await f.register('trainer');
  const stranger = await f.register();
  await f.action(
    member,
    {
      type: 'send_message',
      recipientId: trainer.state.user.id,
      text: 'No consent yet',
    },
    403,
  );
  await f.connect(member, trainer);
  await f.connect(member, secondCoach);
  const plan = await saveAndAssign(f, trainer, member);
  const workout = workoutFor(member, plan.occurrences[0]);
  await f.action(member, { type: 'complete_workout', workout });
  await f.action(
    secondCoach,
    {
      type: 'review_workout',
      id: workout.id,
      text: 'Cannot replace assigning coach',
    },
    403,
  );
  await f.action(trainer, {
    type: 'review_workout',
    id: workout.id,
    text: 'Good controlled repetitions.',
  });
  await f.action(member, {
    type: 'send_message',
    recipientId: trainer.state.user.id,
    text: 'PRIVATE MESSAGE CONTENT',
  });
  assert.equal(
    (await f.state(trainer)).messages[0].text,
    'PRIVATE MESSAGE CONTENT',
  );
  assert.equal((await f.state(stranger)).messages.length, 0);
  const notices = (await f.state(member)).notifications;
  await f.action(
    stranger,
    { type: 'mark_notification', id: notices[0].id },
    404,
  );
  await f.action(member, { type: 'mark_notification', id: 'all' });
  assert.ok((await f.state(member)).notifications.every((item) => item.read));
  assert.ok((await f.state(trainer)).notifications.some((item) => !item.read));
  await f.action(
    stranger,
    {
      type: 'submit_review',
      trainerId: trainer.state.user.id,
      rating: 5,
      body: 'Unverified review',
    },
    403,
  );
  await f.action(
    member,
    {
      type: 'submit_review',
      trainerId: trainer.state.user.id,
      rating: 4.5,
      body: 'Invalid rating',
    },
    400,
  );
  await f.action(member, {
    type: 'submit_review',
    trainerId: trainer.state.user.id,
    rating: 5,
    body: 'Helpful feedback',
  });
  await f.action(member, {
    type: 'submit_review',
    trainerId: trainer.state.user.id,
    rating: 4,
    body: 'Updated review',
  });
  assert.equal((await f.state(member)).reviews.length, 1);
  const edited = await f.action(member, {
    type: 'update_workout',
    id: workout.id,
    exercises: workout.exercises,
    reflection: { effort: 6, notes: 'Corrected reflection' },
  });
  assert.equal(edited.workouts[0].review, undefined);
  await f.action(member, { type: 'complete_workout', workout });
  assert.equal(
    (await f.state(member)).workouts[0].reflection.notes,
    'Corrected reflection',
  );
});

test('direct assignment and program operations cannot bypass consent or ownership', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const stranger = await f.register();
  const trainer = await f.register('trainer');
  const otherTrainer = await f.register('trainer');
  const program = programFor(trainer);
  await f.action(trainer, { type: 'save_program', program });
  const assignment = {
    type: 'assign_program',
    operationId: randomUUID(),
    programId: program.id,
    memberId: member.state.user.id,
    startDate: today(),
    weeks: 1,
    mapping: [{ day: dayOfWeek(today()), routineId: program.routines[0].id }],
    note: '',
  };
  await f.action(trainer, assignment, 403);
  const pending = await f.action(trainer, {
    type: 'request_link',
    memberEmail: member.state.user.email,
    note: '',
  });
  await f.action(trainer, assignment, 403);
  await f.action(member, {
    type: 'respond_link',
    id: pending.relationships[0].id,
    accept: true,
  });
  await f.action(
    trainer,
    { ...assignment, mapping: [{ day: 7, routineId: program.routines[0].id }] },
    400,
  );
  await f.action(
    trainer,
    { ...assignment, mapping: [{ day: 1, routineId: 'unowned-routine' }] },
    400,
  );
  await f.action(trainer, { ...assignment, weeks: 53 }, 400);
  await f.action(
    trainer,
    {
      ...assignment,
      mapping: [
        { day: 1, routineId: program.routines[0].id },
        { day: 1, routineId: program.routines[1].id },
      ],
    },
    400,
  );
  const assigned = await f.action(trainer, assignment);
  const occurrence = assigned.occurrences[0];
  await f.action(
    otherTrainer,
    { type: 'change_occurrence', id: occurrence.id, status: 'skipped' },
    404,
  );
  await f.action(
    stranger,
    { type: 'cancel_assignment', id: assigned.assignments[0].id },
    404,
  );
  await f.action(
    trainer,
    { type: 'complete_workout', workout: workoutFor(member, occurrence) },
    403,
  );
  await f.action(otherTrainer, { type: 'delete_program', id: program.id }, 404);
  await f.action(
    member,
    { type: 'archive_program', id: program.id, archived: true },
    404,
  );
  assert.equal((await f.state(member)).occurrences[0].status, 'planned');
});

test('local generation is bounded, unsaved, equipment-aware and honestly attributed; endorsement tracks revision', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  await f.connect(member, trainer);
  const input = {
    goal: 'Build strength',
    days: 3,
    minutes: 40,
    equipment: ['bodyweight'],
    difficulty: 'beginner',
  };
  await f.call(
    '/api/generate',
    { token: member.token, body: { ...input, days: 1000 } },
    400,
  );
  await f.call(
    '/api/generate',
    {
      token: member.token,
      body: { ...input, equipment: ['unsupported machine'] },
    },
    400,
  );
  const generated = await f.call('/api/generate', {
    token: member.token,
    body: input,
  });
  assert.equal(generated.provider, 'local-template');
  assert.match(generated.program.description, /not a hosted AI model/);
  assert.equal(generated.program.routines.length, 3);
  assert.equal((await f.state(member)).programs.length, 0);
  const catalog = (await f.state(member)).exercises;
  for (const routine of generated.program.routines)
    for (const exercise of routine.exercises)
      assert.equal(
        catalog.find((item) => item.id === exercise.exerciseId).equipment,
        'bodyweight',
      );
  await f.action(member, { type: 'save_program', program: generated.program });
  await f.action(
    trainer,
    { type: 'endorse_program', id: generated.program.id },
    404,
  );
  await f.action(member, {
    type: 'save_program',
    program: { ...generated.program, visibility: 'shared' },
  });
  const endorsed = await f.action(trainer, {
    type: 'endorse_program',
    id: generated.program.id,
  });
  const approved = endorsed.programs.find(
    (item) => item.id === generated.program.id,
  );
  assert.equal(approved.source, 'ai');
  assert.equal(approved.endorsedRevision, 2);
  await f.action(member, { type: 'endorse_program', id: approved.id }, 403);
  const revised = await f.action(member, {
    type: 'save_program',
    program: { ...approved, description: 'Edited plan' },
  });
  assert.equal(revised.programs[0].endorsedBy, undefined);
  assert.equal(revised.programs[0].revision, 3);
  await f.action(member, {
    type: 'save_program',
    program: programFor(member, {
      source: 'trainer',
      endorsedBy: trainer.state.user.id,
      endorsedRevision: 1,
    }),
  });
  const fake = (await f.state(member)).programs.find(
    (item) => item.id !== approved.id,
  );
  assert.equal(fake.source, 'self');
  assert.equal(fake.endorsedBy, undefined);
});

test('password changes revoke other sessions and logout cannot be replayed', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const second = await f.call('/api/auth/login', {
    body: { email: member.state.user.email, password: PASSWORD },
  });
  await f.action(
    member,
    {
      type: 'change_password',
      currentPassword: 'wrong password',
      password: 'Replacement!2026',
    },
    403,
  );
  await f.action(member, {
    type: 'change_password',
    currentPassword: PASSWORD,
    password: 'Replacement!2026',
  });
  await f.call('/api/state', { token: second.token }, 401);
  await f.state(member);
  await f.call(
    '/api/auth/login',
    { body: { email: member.state.user.email, password: PASSWORD } },
    401,
  );
  await f.call('/api/auth/login', {
    body: { email: member.state.user.email, password: 'Replacement!2026' },
  });
  await f.call('/api/auth/logout', { token: member.token, method: 'POST' });
  await f.call('/api/state', { token: member.token }, 401);
});

test('account exports omit secrets and coach exports exclude client journals; deletion removes private records', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  await f.connect(member, trainer);
  const plan = await saveAndAssign(f, trainer, member);
  await f.action(member, {
    type: 'complete_workout',
    workout: workoutFor(member, plan.occurrences[0]),
  });
  await f.action(member, {
    type: 'send_message',
    recipientId: trainer.state.user.id,
    text: 'DELETE MY PRIVATE MESSAGE',
  });
  const exported = await f.call('/api/export', { token: member.token });
  assert.equal(exported.workouts.length, 1);
  assert.equal(JSON.stringify(exported).includes('passwordHash'), false);
  assert.equal(JSON.stringify(exported).includes(member.token), false);
  assert.equal(
    (await f.call('/api/export', { token: trainer.token })).workouts.length,
    0,
  );
  await f.action(
    member,
    { type: 'delete_account', password: 'wrong-password' },
    403,
  );
  const result = await f.action(member, {
    type: 'delete_account',
    password: PASSWORD,
  });
  assert.deepEqual(result, { deleted: true });
  await f.call('/api/state', { token: member.token }, 401);
  const coachState = await f.state(trainer);
  assert.equal(coachState.relationships.length, 0);
  assert.equal(coachState.messages.length, 0);
  assert.equal(coachState.workouts.length, 0);
  assert.equal(
    JSON.stringify(coachState).includes('DELETE MY PRIVATE MESSAGE'),
    false,
  );
  assert.equal(
    f.server.store.data.users.some((item) => item.id === member.state.user.id),
    false,
  );
});

test('deleting a trainer preserves member history and anonymized assigned snapshots', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const trainer = await f.register('trainer');
  await f.connect(member, trainer);
  const plan = await saveAndAssign(f, trainer, member);
  const workout = workoutFor(member, plan.occurrences[0]);
  await f.action(member, { type: 'complete_workout', workout });
  await f.action(trainer, {
    type: 'review_workout',
    id: workout.id,
    text: 'Private coach feedback',
  });
  await f.action(trainer, { type: 'delete_account', password: PASSWORD });
  const state = await f.state(member);
  assert.equal(state.workouts.length, 1);
  assert.equal(state.workouts[0].review, undefined);
  assert.equal(state.programs[0].ownerId, 'deleted-account');
  assert.equal(state.assignments[0].trainerId, undefined);
  assert.equal(
    state.occurrences.filter((item) => item.status === 'completed').length,
    1,
  );
  assert.ok(
    state.occurrences
      .filter((item) => item.status !== 'completed')
      .every((item) => item.status === 'cancelled'),
  );
});

test('runtime validation rejects malformed numerical logs, invalid calendar dates and cross-owner IDs', async (t) => {
  const f = await fixture(t);
  const member = await f.register();
  const stranger = await f.register();
  const plan = await saveAndAssign(f, member);
  await f.action(
    stranger,
    { type: 'start_occurrence', id: plan.occurrences[0].id },
    404,
  );
  await f.action(
    member,
    {
      type: 'change_occurrence',
      id: plan.occurrences[0].id,
      date: '2026-02-30',
    },
    400,
  );
  const valid = workoutFor(member, plan.occurrences[0]);
  for (const changes of [
    { weight: -1 },
    { weight: 1001 },
    { reps: 2.5 },
    { reps: 0 },
    { durationSeconds: 14401 },
    { restSeconds: -1 },
  ]) {
    const workout = structuredClone(valid);
    Object.assign(workout.exercises[0].sets[0], changes);
    await f.action(member, { type: 'complete_workout', workout }, 400);
  }
  await f.action(
    member,
    {
      type: 'complete_workout',
      workout: {
        ...valid,
        completedAt: new Date(Date.now() + 86400000).toISOString(),
      },
    },
    400,
  );
  await f.action(
    member,
    {
      type: 'complete_workout',
      workout: { ...valid, durationSeconds: 100000 },
    },
    400,
  );
  assert.equal((await f.state(member)).workouts.length, 0);
});

test('loopback host/origin checks, static traversal protection, SPA fallback, JSON limits and method errors', async (t) => {
  const f = await fixture(t);
  await f.call('/api/health');
  await f.call(
    '/api/health',
    { headers: { Origin: 'https://attacker.example' } },
    403,
  );
  const invalidHostStatus = await new Promise((resolveStatus, reject) => {
    const request = http.get(
      `${f.base}/api/health`,
      { headers: { Host: 'attacker.example' } },
      (response) => {
        response.resume();
        resolveStatus(response.statusCode);
      },
    );
    request.on('error', reject);
  });
  assert.equal(invalidHostStatus, 403);
  const allowed = await fetch(`${f.base}/api/health`, {
    headers: { Origin: 'http://localhost:8093' },
  });
  assert.equal(
    allowed.headers.get('access-control-allow-origin'),
    'http://localhost:8093',
  );
  const shell = await fetch(`${f.base}/plans/a-deep-route`);
  assert.equal(shell.status, 200);
  assert.match(await shell.text(), /AI Gym test shell/);
  assert.equal((await fetch(`${f.base}/missing.js`)).status, 404);
  assert.equal((await fetch(`${f.base}/.env`)).status, 404);
  await writeFile(join(f.directory, 'private.txt'), 'secret fixture');
  await symlink(
    join(f.directory, 'private.txt'),
    join(f.staticDir, 'outside.txt'),
  );
  assert.equal((await fetch(`${f.base}/outside.txt`)).status, 404);
  const badJson = await fetch(`${f.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid}',
  });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).code, 'invalid_json');
  const huge = await fetch(`${f.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: 'x'.repeat(1024 * 1024) }),
  });
  assert.equal(huge.status, 413);
  const wrongType = await fetch(`${f.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '{}',
  });
  assert.equal(wrongType.status, 415);
});

test('store reloads committed data, rejects concurrent writers and refuses corrupt or unsupported schemas', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ai-gym-store-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await JsonStore.open(directory, { seed: false });
  await store.transact((db) => {
    db.operations.push({ id: 'persisted', userId: 'test', type: 'test' });
  });
  await assert.rejects(JsonStore.open(directory), /Another local API/);
  await store.close();
  const reopened = await JsonStore.open(directory, { seed: false });
  assert.equal(reopened.data.operations[0].id, 'persisted');
  await reopened.close();
  await writeFile(join(directory, 'data.json'), '{corrupt');
  await assert.rejects(JsonStore.open(directory), /invalid JSON/);
  assert.equal(
    await readFile(join(directory, 'data.json'), 'utf8'),
    '{corrupt',
  );
  await writeFile(
    join(directory, 'data.json'),
    JSON.stringify({ schemaVersion: 999 }),
  );
  await assert.rejects(JsonStore.open(directory), /Unsupported or incomplete/);
});

test('demo seed gives independent accounts without leaking their journals', async (t) => {
  const f = await fixture(t, { seed: true });
  const auth = await f.call('/api/auth/login', {
    body: { email: 'member@aigym.local', password: 'TrainToday!2026' },
  });
  assert.equal(auth.state.user.name, 'Alex Morgan');
  assert.ok(auth.state.workouts.length >= 4);
  assert.ok(
    auth.state.occurrences.some(
      (item) => item.date === today() && item.status === 'planned',
    ),
  );
  const isolated = await f.call('/api/auth/login', {
    body: { email: 'trainer2@aigym.local', password: 'TrainToday!2026' },
  });
  assert.equal(isolated.state.workouts.length, 0);
  assert.equal(isolated.state.relationships.length, 0);
  assert.equal(isolated.state.programs.length, 0);
});
