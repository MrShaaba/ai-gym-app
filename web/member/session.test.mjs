import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Keep this suite runnable on the project's Node 20 baseline without native TS stripping.
const source = await readFile(new URL('./session.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  createDraft,
  elapsed,
  finishDraft,
  pauseDraft,
  resumeDraft,
  parseEntry,
  queueWorkout,
  readDraft,
  readOutbox,
  removePendingWorkout,
  writeDraft,
  writeOutbox,
  weightInKg,
  exerciseInputs,
  inputKey,
  validateInputs,
  draftKey,
  isOccurrenceStartable,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key),
};
globalThis.window = new EventTarget();
const occurrence = {
  id: 'occurrence-a',
  assignmentId: 'assignment-a',
  memberId: 'owner-a',
  date: '2026-10-20',
  routine: {
    id: 'routine-a',
    name: 'Session',
    durationMinutes: 40,
    exercises: [
      {
        exerciseId: 'squat',
        name: 'Squat',
        sets: [
          { reps: 8, weight: 22.5, restSeconds: 60 },
          { reps: 8, weight: 22.5, restSeconds: 60 },
        ],
      },
    ],
  },
  programTitle: 'Program',
  source: 'self',
  status: 'planned',
  note: '',
  revision: 1,
};
const start = new Date('2026-10-13T10:00:00').getTime();
beforeEach(() => memory.clear());
function partialDraft(owner = 'owner-a') {
  const draft = createDraft(owner, occurrence, 'kg', start);
  draft.exercises[0].sets[0].completed = true;
  return draft;
}

test('decimal string buffers accept kg/lb and reject malformed or server-invalid entries', () => {
  assert.equal(parseEntry('22.5', 'weight'), 22.5);
  assert.equal(parseEntry('22,5', 'weight'), 22.5);
  assert.equal(parseEntry('22.', 'weight'), 22);
  assert.equal(parseEntry('2.2.5', 'weight'), null);
  assert.equal(parseEntry('', 'weight'), null);
  assert.equal(parseEntry('0', 'weight'), 0);
  assert.equal(parseEntry('0', 'reps'), null);
  assert.equal(parseEntry('8.5', 'reps'), null);
  assert.equal(parseEntry('1001', 'weight'), null);
  assert.equal(parseEntry('2000', 'weight', 'lb'), 2000);
  assert.equal(parseEntry('2205', 'weight', 'lb'), null);
  assert.equal(parseEntry('14401', 'durationSeconds'), null);
  assert.ok(Math.abs(weightInKg(49.6040089905, 'lb') - 22.5) < 0.000001);
});

test('pause and resume excludes paused time and preserves a rest countdown across reopening', () => {
  const draft = { ...partialDraft(), restUntil: start + 120000 };
  const paused = pauseDraft(draft, start + 30000);
  writeDraft('owner-a', paused);
  const reopened = readDraft('owner-a');
  assert.equal(elapsed(reopened, start + 300000), 30);
  assert.equal(reopened.restRemaining, 90);
  const resumed = resumeDraft(reopened, start + 300000);
  assert.equal(elapsed(resumed, start + 310000), 40);
  assert.equal(resumed.restUntil, start + 390000);
});

test('empty sessions cannot finish; partial completion preserves unchecked sets and reflection', () => {
  assert.throws(
    () =>
      finishDraft(
        createDraft('owner-a', occurrence, 'kg', start),
        start + 60000,
      ),
    /at least one/,
  );
  const draft = partialDraft();
  draft.notes = '  Solid session.  ';
  const workout = finishDraft(draft, start + 60000);
  assert.equal(workout.id, draft.id);
  assert.equal(workout.exercises[0].sets[0].weight, 22.5);
  assert.equal(workout.exercises[0].sets[1].completed, false);
  assert.equal(workout.reflection.notes, 'Solid session.');
  assert.equal(workout.date, '2026-10-13');
  assert.equal(workout.occurrenceId, occurrence.id);
  assert.equal(workout.durationSeconds, 60);
});

test('outbox queues before draft removal and stable IDs prevent duplicate saves', () => {
  const draft = partialDraft();
  writeDraft('owner-a', draft);
  const workout = finishDraft(draft, start + 60000);
  queueWorkout('owner-a', workout);
  assert.equal(readDraft('owner-a').id, workout.id);
  writeDraft('owner-a', null);
  queueWorkout('owner-a', workout);
  assert.equal(readOutbox('owner-a').length, 1);
  assert.equal(readOutbox('owner-a')[0].workout.id, workout.id);
});

test('account switching cannot expose, queue, or remove another owner’s workout', () => {
  const a = finishDraft(partialDraft(), start + 60000);
  const b = finishDraft(partialDraft('owner-b'), start + 60000);
  queueWorkout('owner-a', a);
  queueWorkout('owner-b', b);
  assert.throws(() => queueWorkout('owner-b', a), /another account/);
  assert.throws(() => writeDraft('owner-b', partialDraft()), /another account/);
  removePendingWorkout('owner-a', a.id);
  assert.equal(readOutbox('owner-a').length, 0);
  assert.equal(readOutbox('owner-b')[0].workout.id, b.id);
});

test('failed queue storage leaves the original draft intact', () => {
  const draft = partialDraft();
  writeDraft('owner-a', draft);
  const original = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error('Quota exceeded');
  };
  try {
    assert.throws(
      () => queueWorkout('owner-a', finishDraft(draft, start + 60000)),
      /Quota/,
    );
  } finally {
    localStorage.setItem = original;
  }
  assert.equal(readDraft('owner-a').id, draft.id);
  assert.equal(readOutbox('owner-a').length, 0);
});

test('corrupt stored data reports an error without deleting it', () => {
  localStorage.setItem(draftKey('owner-a'), 'corrupted');
  assert.throws(() => readDraft('owner-a'));
  assert.equal(localStorage.getItem(draftKey('owner-a')), 'corrupted');
});

test('timed bodyweight sets validate without reps and unfinished decimal entry blocks completion', () => {
  const draft = partialDraft();
  draft.exercises[0].sets[0] = {
    reps: 0,
    weight: 0,
    restSeconds: 30,
    durationSeconds: 60,
    completed: true,
  };
  draft.inputs = exerciseInputs(draft.exercises, draft.unit);
  assert.equal(validateInputs(draft.exercises, draft.inputs), true);
  draft.inputs[inputKey(0, 0, 'durationSeconds')] = '';
  assert.throws(
    () => finishDraft(draft, start + 60000),
    /Check your set entries/,
  );
});

test('outbox sync failure retains all payload fields for a later replay', () => {
  const workout = finishDraft(partialDraft(), start + 60000);
  queueWorkout('owner-a', workout);
  writeOutbox(
    'owner-a',
    readOutbox('owner-a').map((item) => ({
      ...item,
      error: 'Network disconnected',
    })),
  );
  assert.deepEqual(readOutbox('owner-a')[0].workout, workout);
  assert.equal(readOutbox('owner-a')[0].error, 'Network disconnected');
});

test('ended assignments retain historical misses without offering starts, but active sessions remain resumable', () => {
  const ended = [{ id: occurrence.assignmentId, active: false }];
  const active = [{ id: occurrence.assignmentId, active: true }];
  assert.equal(isOccurrenceStartable(occurrence, ended), false);
  assert.equal(isOccurrenceStartable(occurrence, active), true);
  assert.equal(
    isOccurrenceStartable({ ...occurrence, status: 'in_progress' }, ended),
    true,
  );
  assert.equal(
    isOccurrenceStartable({ ...occurrence, status: 'skipped' }, active),
    false,
  );
  assert.equal(
    isOccurrenceStartable({ ...occurrence, status: 'completed' }, active),
    false,
  );
  assert.equal(isOccurrenceStartable(occurrence, []), false);
});
