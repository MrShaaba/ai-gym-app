import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LoggedExercise,
  Occurrence,
  PageProps,
  Unit,
  Workout,
} from './types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Empty,
  Field,
  Modal,
  PageHeader,
  Stat,
} from './ui';
import { addDays, dateKey, formatDate, formatWeight, volume } from './utils';
import {
  clockTime,
  completedSets,
  createDraft,
  draftKey,
  elapsed,
  exerciseInputs,
  finishDraft,
  inputKey,
  isOccurrenceStartable,
  memberStorageEvent,
  parseEntry,
  pauseDraft,
  queueWorkout,
  readDraft,
  readOutbox,
  outboxKey,
  removePendingWorkout,
  resumeDraft,
  totalSets,
  validateInputs,
  weightInKg,
  writeDraft,
  writeOutbox,
} from './member/session';
import type { PendingWorkout, WorkoutDraft } from './member/session';
import './Member.css';

const explain = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'The request failed. Please try again.';
const sourceLabel = (source: Workout['source']) =>
  source === 'trainer'
    ? 'Coach plan'
    : source === 'ai'
      ? 'Generated plan'
      : 'Your plan';
const weekStart = (date: string) =>
  addDays(date, -((new Date(`${date}T12:00:00`).getDay() + 6) % 7));
const allFields: Array<'reps' | 'weight' | 'durationSeconds'> = [
  'reps',
  'weight',
  'durationSeconds',
];
const syncEvent = 'aigym:retry-workouts';

function downloadBrowserBackup(ownerId: string) {
  const payload = {
    ownerId,
    exportedAt: new Date().toISOString(),
    draft: localStorage.getItem(draftKey(ownerId)),
    pendingWorkouts: localStorage.getItem(outboxKey(ownerId)),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-gym-unsynced-${dateKey()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function usePending(ownerId: string) {
  const [pending, setPending] = useState<PendingWorkout[]>([]);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    const read = () => {
      try {
        setPending(readOutbox(ownerId));
        setStorageError('');
      } catch (error) {
        setStorageError(explain(error));
      }
    };
    read();
    window.addEventListener(memberStorageEvent, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(memberStorageEvent, read);
      window.removeEventListener('storage', read);
    };
  }, [ownerId]);
  return { pending, storageError };
}

/** Mount once in the authenticated member shell, including when another page is open. */
export function MemberSync({ state, run, toast }: PageProps) {
  const ownerId = state.user.id;
  const { pending, storageError } = usePending(ownerId);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);
  const latest = useRef({ run, toast, ownerId });
  latest.current = { run, toast, ownerId };
  const sync = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    setSyncing(true);
    const originalOwner = latest.current.ownerId;
    try {
      const queue = readOutbox(originalOwner);
      for (const item of queue) {
        if (latest.current.ownerId !== originalOwner) break;
        try {
          await latest.current.run({
            type: 'complete_workout',
            workout: item.workout,
          });
          removePendingWorkout(originalOwner, item.workout.id);
          const draft = readDraft(originalOwner);
          if (draft?.id === item.workout.id) writeDraft(originalOwner, null);
          if (latest.current.ownerId === originalOwner)
            latest.current.toast('Workout saved to your journal.');
        } catch (error) {
          const remaining = readOutbox(originalOwner).map((entry) =>
            entry.workout.id === item.workout.id
              ? { ...entry, error: explain(error) }
              : entry,
          );
          writeOutbox(originalOwner, remaining);
          break;
        }
      }
    } catch (error) {
      if (latest.current.ownerId === originalOwner)
        latest.current.toast(explain(error), 'error');
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, []);
  useEffect(() => {
    void sync();
    const retry = () => {
      void sync();
    };
    window.addEventListener('online', retry);
    window.addEventListener(syncEvent, retry);
    const interval = window.setInterval(retry, 45000);
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener(syncEvent, retry);
      window.clearInterval(interval);
    };
  }, [ownerId, sync]);
  if (!pending.length && !storageError) return null;
  return (
    <div className="member-sync" role="status">
      <div>
        <strong>
          {storageError
            ? 'Browser storage needs attention'
            : `${pending.length} workout${pending.length === 1 ? '' : 's'} waiting to sync`}
        </strong>
        <p>
          {storageError ||
            pending.find((item) => item.error)?.error ||
            'Your workout is saved in this browser. We will retry when connected.'}
        </p>
      </div>
      <div className="actions">
        <Button variant="secondary" busy={syncing} onClick={() => void sync()}>
          Retry sync
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            try {
              downloadBrowserBackup(ownerId);
            } catch (error) {
              toast(explain(error), 'error');
            }
          }}
        >
          Download backup
        </Button>
      </div>
    </div>
  );
}

export function TodayPage(props: PageProps) {
  const { state, run, navigate, toast } = props;
  const ownerId = state.user.id;
  const today = dateKey();
  const [selected, setSelected] = useState(today);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [detail, setDetail] = useState<Occurrence | null>(null);
  const [rescheduling, setRescheduling] = useState<Occurrence | null>(null);
  const [newDate, setNewDate] = useState(today);
  const [skip, setSkip] = useState<Occurrence | null>(null);
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState('');
  const { pending } = usePending(ownerId);
  const queuedOccurrences = new Set(
    pending.map((item) => item.workout.occurrenceId),
  );
  const ownedOccurrences = state.occurrences.filter(
    (item) => item.memberId === ownerId,
  );
  const selectedOccurrences = ownedOccurrences.filter(
    (item) => item.date === selected && item.status !== 'cancelled',
  );
  const startOfWeek = weekStart(selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek, i));
  const thisWeek = ownedOccurrences.filter(
    (item) =>
      item.date >= weekStart(today) &&
      item.date <= addDays(weekStart(today), 6) &&
      item.status !== 'cancelled',
  );
  const completedThisWeek = thisWeek.filter(
    (item) => item.status === 'completed',
  ).length;
  const assignmentActive = (item: Occurrence) =>
    state.assignments.some(
      (assignment) => assignment.id === item.assignmentId && assignment.active,
    );
  const startable = (item: Occurrence) =>
    isOccurrenceStartable(item, state.assignments);
  const remainingThisWeek = thisWeek.filter(
    (item) =>
      startable(item) && (item.date >= today || item.status === 'in_progress'),
  ).length;
  const upcoming = ownedOccurrences
    .filter((item) => item.date > selected && startable(item))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const myWorkouts = state.workouts.filter((item) => item.userId === ownerId);
  const lastWorkout = [...myWorkouts].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )[0];
  const primary = selectedOccurrences.find(
    (item) => startable(item) && !queuedOccurrences.has(item.id),
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setSessionOpen(false);
    const read = () => {
      try {
        const saved = readDraft(ownerId);
        const queued = readOutbox(ownerId);
        setDraft(
          saved && !queued.some((item) => item.workout.id === saved.id)
            ? saved
            : null,
        );
        setStorageError('');
      } catch (error) {
        setStorageError(explain(error));
      }
    };
    read();
    window.addEventListener(memberStorageEvent, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(memberStorageEvent, read);
      window.removeEventListener('storage', read);
    };
  }, [ownerId]);
  useEffect(() => {
    if (!draft) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [draft?.id]);

  async function start(occurrence: Occurrence) {
    if (draft) {
      setSessionOpen(true);
      return;
    }
    if (!startable(occurrence)) {
      toast(
        'This session belongs to an ended plan. Its history is preserved; schedule a new session from your plans.',
        'error',
      );
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      // Persist first: if the network disappears after accepting a start, the draft still exists.
      const next = createDraft(ownerId, occurrence, state.user.unit);
      writeDraft(ownerId, next);
      setDraft(next);
      setDetail(null);
      setSessionOpen(true);
      try {
        await run({ type: 'start_occurrence', id: occurrence.id });
      } catch (error) {
        toast(
          `Workout draft saved here. Schedule sync failed: ${explain(error)}`,
          'error',
        );
      }
    } catch (error) {
      toast(`Could not save a safe workout draft: ${explain(error)}`, 'error');
    } finally {
      setBusy(false);
    }
  }
  async function changeOccurrence(
    occurrence: Occurrence,
    changes: { date?: string; status?: Occurrence['status'] },
  ) {
    setBusy(true);
    try {
      await run({ type: 'change_occurrence', id: occurrence.id, ...changes });
      setSkip(null);
      setRescheduling(null);
      setDetail(null);
      toast(changes.date ? 'Workout rescheduled.' : 'Schedule updated.');
    } catch (error) {
      toast(explain(error), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack member-page">
      <PageHeader
        eyebrow="YOUR TRAINING, IN FOCUS"
        title={`Let’s put in the work, ${state.user.name.split(' ')[0]}.`}
        description="A little stronger. One session at a time."
        actions={
          <Button variant="secondary" onClick={() => navigate('plans')}>
            Explore your plans <span aria-hidden="true">↗</span>
          </Button>
        }
      />
      {storageError && (
        <div className="member-sync" role="alert">
          <span>{storageError}</span>
          <Button
            variant="secondary"
            onClick={() => {
              try {
                downloadBrowserBackup(ownerId);
              } catch (error) {
                toast(explain(error), 'error');
              }
            }}
          >
            Download browser backup
          </Button>
        </div>
      )}
      {draft && (
        <div className="member-resume">
          <div>
            <Badge tone="green">
              {draft.resumedAt === null
                ? 'Paused workout'
                : 'Workout in progress'}
            </Badge>
            <h3>{draft.occurrence.routine.name}</h3>
            <p>
              {completedSets(draft.exercises)} sets logged ·{' '}
              {clockTime(elapsed(draft, now))} · Saved in this browser
            </p>
          </div>
          <Button onClick={() => setSessionOpen(true)}>
            Return to workout →
          </Button>
        </div>
      )}
      <div className="member-today-grid">
        <div className="page-stack">
          <Card className="card member-calendar">
            <div className="row-between">
              <div>
                <span className="eyebrow">YOUR SCHEDULE</span>
                <h2>
                  {new Date(`${selected}T12:00:00`).toLocaleDateString(
                    undefined,
                    { month: 'long', year: 'numeric' },
                  )}
                </h2>
              </div>
              <div className="actions">
                <Button
                  variant="ghost"
                  aria-label="Previous week"
                  onClick={() => setSelected(addDays(selected, -7))}
                >
                  ←
                </Button>
                <Button variant="ghost" onClick={() => setSelected(today)}>
                  Today
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Next week"
                  onClick={() => setSelected(addDays(selected, 7))}
                >
                  →
                </Button>
              </div>
            </div>
            <div className="member-week" aria-label="Workout week">
              {week.map((day) => {
                const scheduled = ownedOccurrences.filter(
                  (item) => item.date === day && item.status !== 'cancelled',
                );
                const done = scheduled.some(
                  (item) => item.status === 'completed',
                );
                return (
                  <button
                    key={day}
                    className={`member-day ${day === selected ? 'member-day-selected' : ''} ${day === today ? 'member-day-today' : ''}`}
                    aria-pressed={day === selected}
                    aria-label={`${formatDate(day)}, ${scheduled.length} scheduled workouts`}
                    onClick={() => setSelected(day)}
                  >
                    <span>
                      {new Date(`${day}T12:00:00`).toLocaleDateString(
                        undefined,
                        { weekday: 'short' },
                      )}
                    </span>
                    <strong>{Number(day.slice(8))}</strong>
                    <span
                      className={`member-day-dot ${done ? 'member-day-complete' : scheduled.length ? 'member-day-planned' : ''}`}
                      aria-hidden="true"
                    >
                      {done ? '✓' : '•'}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="member-date-picker small muted">
              Jump to date{' '}
              <input
                className="input"
                type="date"
                value={selected}
                onChange={(event) => {
                  if (event.target.value) setSelected(event.target.value);
                }}
                aria-label="Schedule date"
              />
            </label>
          </Card>
          {primary ? (
            <Card className="card member-workout-hero">
              <div className="row-between">
                <Badge tone={primary.source === 'trainer' ? 'blue' : 'green'}>
                  {sourceLabel(primary.source)}
                </Badge>
                <span className="small muted">
                  {selected === today
                    ? 'TODAY’S WORKOUT'
                    : formatDate(selected)}
                </span>
              </div>
              <div className="member-hero-art" aria-hidden="true">
                <span className="member-plate member-plate-one" />
                <span className="member-plate member-plate-two" />
                <span className="member-bar" />
              </div>
              <div className="member-hero-copy">
                <p className="eyebrow">{primary.programTitle}</p>
                <h2>{primary.routine.name}</h2>
                <p className="muted">
                  Show up for yourself. Your next session starts here.
                </p>
                <div className="member-workout-meta">
                  <span>◷ {primary.routine.durationMinutes} min</span>
                  <span>{primary.routine.exercises.length} exercises</span>
                  <span>
                    {primary.routine.exercises.reduce(
                      (sum, exercise) => sum + exercise.sets.length,
                      0,
                    )}{' '}
                    sets
                  </span>
                </div>
                {primary.note && (
                  <p className="member-coach-note">“{primary.note}”</p>
                )}
                <div className="actions">
                  <Button
                    busy={busy}
                    disabled={Boolean(storageError)}
                    onClick={() => void start(primary)}
                  >
                    {draft ? 'Return to workout' : 'Start workout'}{' '}
                    <span aria-hidden="true">→</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDetail(primary)}
                  >
                    View workout
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="card">
              <Empty
                title={
                  selectedOccurrences.some(
                    (item) =>
                      item.status === 'completed' ||
                      queuedOccurrences.has(item.id),
                  )
                    ? 'Work put in. Well done.'
                    : 'Room to recover.'
                }
                description={
                  selectedOccurrences.some(
                    (item) =>
                      item.status === 'completed' ||
                      queuedOccurrences.has(item.id),
                  )
                    ? 'Your next session will be here when you are ready.'
                    : selectedOccurrences.length
                      ? 'This day’s skipped or past scheduled sessions are preserved below. Add a new session from your plans when you are ready.'
                      : 'No workout scheduled for this day. Recovery is part of getting stronger.'
                }
                action={
                  <Button variant="secondary" onClick={() => navigate('plans')}>
                    Schedule a workout
                  </Button>
                }
              />
            </Card>
          )}
          {selectedOccurrences
            .filter((item) => item.id !== primary?.id)
            .map((item) => (
              <Card key={item.id} className="card list-row">
                <div>
                  <Badge tone={item.status === 'completed' ? 'green' : 'muted'}>
                    {queuedOccurrences.has(item.id)
                      ? 'Waiting to sync'
                      : !assignmentActive(item) && item.status === 'planned'
                        ? 'Missed · plan ended'
                        : !assignmentActive(item) && item.status === 'skipped'
                          ? 'Skipped · plan ended'
                          : item.status.replace('_', ' ')}
                  </Badge>
                  <h3>{item.routine.name}</h3>
                  <p className="muted small">{item.programTitle}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    item.status === 'completed' ||
                    queuedOccurrences.has(item.id)
                      ? navigate('journal')
                      : setDetail(item)
                  }
                >
                  {item.status === 'completed' || queuedOccurrences.has(item.id)
                    ? 'View journal'
                    : 'View workout'}
                </Button>
              </Card>
            ))}
        </div>
        <aside className="page-stack">
          <Card className="card">
            <div className="panel-header">
              <h2>This week</h2>
              <Badge tone="green">KEEP GOING</Badge>
            </div>
            <div className="member-week-score">
              <strong>{completedThisWeek}</strong>
              <span>
                / {thisWeek.length}
                <br />
                scheduled sessions
              </span>
            </div>
            <progress
              className="member-progress"
              value={completedThisWeek}
              max={Math.max(1, thisWeek.length)}
              aria-label="Completed sessions this week"
            />
            <p className="muted small">
              {thisWeek.length
                ? `${remainingThisWeek} upcoming or active sessions on your calendar. Past missed days remain part of your training history.`
                : 'Schedule your first session to start building a rhythm.'}
            </p>
          </Card>
          <Card className="card">
            <div className="panel-header">
              <h2>Coming up</h2>
              <span className="muted small">ON YOUR CALENDAR</span>
            </div>
            {upcoming.length ? (
              <div className="stack">
                {upcoming.map((item) => (
                  <button
                    className="member-upcoming"
                    key={item.id}
                    onClick={() => {
                      setSelected(item.date);
                      setDetail(item);
                    }}
                  >
                    <span className="member-date-tile">
                      <small>
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                          undefined,
                          { month: 'short' },
                        )}
                      </small>
                      <strong>{item.date.slice(8)}</strong>
                    </span>
                    <span>
                      <strong>{item.routine.name}</strong>
                      <small>
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString(
                          undefined,
                          { weekday: 'long' },
                        )}{' '}
                        · {item.routine.durationMinutes} min
                      </small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                Nothing scheduled after this date. Add days from your plans.
              </p>
            )}
          </Card>
          <Card className="card member-journal-teaser">
            <span className="eyebrow">YOUR STORY, ONE SESSION AT A TIME</span>
            <h2>
              {lastWorkout ? lastWorkout.routineName : 'Make your first mark.'}
            </h2>
            <p className="muted">
              {lastWorkout
                ? `${formatDate(lastWorkout.date)} · ${completedSets(lastWorkout.exercises)} sets logged`
                : 'Every rep, every reflection. Your training journal grows with you.'}
            </p>
            <Button variant="ghost" onClick={() => navigate('journal')}>
              Open your journal →
            </Button>
          </Card>
        </aside>
      </div>
      {detail && (
        <Modal title={detail.routine.name} onClose={() => setDetail(null)} wide>
          <div className="stack">
            <p className="muted">
              {detail.programTitle} · {formatDate(detail.date)} ·{' '}
              {detail.routine.durationMinutes} minutes
            </p>
            {!assignmentActive(detail) && detail.status !== 'in_progress' && (
              <p className="member-coach-note">
                This plan has ended. This scheduled day is kept as part of your
                training history. Create a new assignment to train this routine
                again.
              </p>
            )}
            {detail.note && <p className="member-coach-note">{detail.note}</p>}
            {detail.routine.exercises.map((exercise, index) => (
              <div
                className="member-prescription"
                key={`${exercise.exerciseId}-${index}`}
              >
                <div className="row-between">
                  <h3>{exercise.name}</h3>
                  {exercise.group && (
                    <Badge tone="blue">{exercise.group}</Badge>
                  )}
                </div>
                <p className="muted small">
                  {exercise.sets.map(
                    (set, i) =>
                      `${set.isWarmup ? 'Warm-up: ' : ''}${set.durationSeconds ? `${set.durationSeconds}s` : `${set.reps} reps`} × ${formatWeight(set.weight, state.user.unit)}${i < exercise.sets.length - 1 ? ' · ' : ''}`,
                  )}
                </p>
                <p className="small muted">
                  {
                    state.exercises.find(
                      (item) => item.id === exercise.exerciseId,
                    )?.instructions
                  }
                </p>
              </div>
            ))}
            <div className="actions">
              {startable(detail) && (
                <>
                  <Button busy={busy} onClick={() => void start(detail)}>
                    Start workout
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={
                      !assignmentActive(detail) ||
                      detail.status === 'in_progress' ||
                      draft?.occurrence.id === detail.id ||
                      busy
                    }
                    onClick={() => {
                      setRescheduling(detail);
                      setNewDate(detail.date);
                      setDetail(null);
                    }}
                  >
                    Reschedule
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={
                      !assignmentActive(detail) ||
                      detail.status === 'in_progress' ||
                      draft?.occurrence.id === detail.id ||
                      busy
                    }
                    onClick={() => {
                      setSkip(detail);
                      setDetail(null);
                    }}
                  >
                    Skip this session
                  </Button>
                </>
              )}
              {detail.status === 'skipped' && assignmentActive(detail) && (
                <Button
                  busy={busy}
                  onClick={() =>
                    void changeOccurrence(detail, { status: 'planned' })
                  }
                >
                  Restore to schedule
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {rescheduling && (
        <Modal
          title="Move this session"
          onClose={() => !busy && setRescheduling(null)}
        >
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (newDate)
                void changeOccurrence(rescheduling, { date: newDate });
            }}
          >
            <p className="muted">
              Only this occurrence of {rescheduling.routine.name} will move.
              Future scheduled days stay in place.
            </p>
            <Field label="New workout date">
              <input
                className="input"
                type="date"
                value={newDate}
                required
                onChange={(event) => setNewDate(event.target.value)}
              />
            </Field>
            <Button type="submit" busy={busy}>
              Save date
            </Button>
          </form>
        </Modal>
      )}
      {skip && (
        <ConfirmDialog
          title="Skip this session?"
          description="This records a skipped day. Your future sessions and completed history stay intact."
          onClose={() => setSkip(null)}
          busy={busy}
          onConfirm={() => void changeOccurrence(skip, { status: 'skipped' })}
        />
      )}
      {sessionOpen && draft && (
        <WorkoutSession
          key={draft.id}
          {...props}
          initial={draft}
          onClose={() => setSessionOpen(false)}
          onFinished={() => {
            setSessionOpen(false);
            setDraft(null);
          }}
        />
      )}
    </div>
  );
}

interface SetsEditorProps {
  exercises: LoggedExercise[];
  inputs: Record<string, string>;
  unit: Unit;
  disabled?: boolean;
  onChange: (
    exercises: LoggedExercise[],
    inputs: Record<string, string>,
  ) => void;
  onRest?: (seconds: number) => void;
  showInstructions?: (id: string) => string | undefined;
}

function SetsEditor({
  exercises,
  inputs,
  unit,
  disabled = false,
  onChange,
  onRest,
  showInstructions,
}: SetsEditorProps) {
  function update(
    ei: number,
    si: number,
    field: 'reps' | 'weight' | 'durationSeconds',
    value: string,
  ) {
    const nextInputs = { ...inputs, [inputKey(ei, si, field)]: value };
    const parsed = parseEntry(value, field, unit);
    const nextExercises = exercises.map((exercise, index) =>
      index !== ei
        ? exercise
        : {
            ...exercise,
            sets: exercise.sets.map((set, setIndex) =>
              setIndex !== si || parsed === null
                ? set
                : {
                    ...set,
                    [field]:
                      field === 'weight' ? weightInKg(parsed, unit) : parsed,
                  },
            ),
          },
    );
    onChange(nextExercises, nextInputs);
  }
  return (
    <div className="stack">
      {exercises.map((exercise, ei) => (
        <section
          className="member-exercise"
          key={`${exercise.exerciseId}-${ei}`}
        >
          <div className="row-between">
            <div>
              <span className="eyebrow">EXERCISE {ei + 1}</span>
              <h3>{exercise.name}</h3>
            </div>
            {exercise.group && <Badge tone="blue">{exercise.group}</Badge>}
          </div>
          {showInstructions?.(exercise.exerciseId) && (
            <details className="member-instructions">
              <summary>Exercise instructions</summary>
              <p>{showInstructions(exercise.exerciseId)}</p>
            </details>
          )}
          <div className="member-set-header" aria-hidden="true">
            <span>SET</span>
            <span>{unit.toUpperCase()}</span>
            <span>REPS / SEC</span>
            <span>REST</span>
            <span>DONE</span>
          </div>
          {exercise.sets.map((set, si) => {
            const timed = set.durationSeconds !== undefined;
            const quantityField = timed ? 'durationSeconds' : 'reps';
            const setValid = allFields
              .filter((field) => field === 'weight' || field === quantityField)
              .every(
                (field) =>
                  parseEntry(
                    inputs[inputKey(ei, si, field)] ?? '',
                    field,
                    unit,
                  ) !== null,
              );
            return (
              <div
                className={`member-set-row ${set.completed ? 'member-set-done' : ''}`}
                key={si}
              >
                <span className="member-set-label">
                  {set.isWarmup ? 'W' : si + 1}
                  <small>{set.isWarmup ? 'warm-up' : 'working'}</small>
                </span>
                <input
                  className="input"
                  inputMode="decimal"
                  type="text"
                  value={inputs[inputKey(ei, si, 'weight')] ?? ''}
                  aria-label={`${exercise.name} set ${si + 1} weight (${unit})`}
                  aria-invalid={
                    parseEntry(
                      inputs[inputKey(ei, si, 'weight')] ?? '',
                      'weight',
                      unit,
                    ) === null
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    update(ei, si, 'weight', event.target.value)
                  }
                />
                <input
                  className="input"
                  inputMode="numeric"
                  type="text"
                  value={inputs[inputKey(ei, si, quantityField)] ?? ''}
                  aria-label={`${exercise.name} set ${si + 1} ${timed ? 'seconds' : 'reps'}`}
                  aria-invalid={
                    parseEntry(
                      inputs[inputKey(ei, si, quantityField)] ?? '',
                      quantityField,
                    ) === null
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    update(ei, si, quantityField, event.target.value)
                  }
                />
                <span className="member-set-rest">{set.restSeconds}s</span>
                <button
                  type="button"
                  className="member-set-check"
                  aria-label={`${set.completed ? 'Unmark' : 'Complete'} ${exercise.name} set ${si + 1}`}
                  aria-pressed={set.completed}
                  disabled={disabled || !setValid}
                  onClick={() => {
                    onChange(
                      exercises.map((item, index) =>
                        index !== ei
                          ? item
                          : {
                              ...item,
                              sets: item.sets.map((entry, index2) =>
                                index2 !== si
                                  ? entry
                                  : { ...entry, completed: !entry.completed },
                              ),
                            },
                      ),
                      inputs,
                    );
                    if (!set.completed) onRest?.(set.restSeconds);
                  }}
                >
                  <span aria-hidden="true">{set.completed ? '✓' : '+'}</span>
                </button>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function WorkoutSession({
  state,
  run,
  toast,
  initial,
  onClose,
  onFinished,
}: PageProps & {
  initial: WorkoutDraft;
  onClose: () => void;
  onFinished: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const draftRef = useRef(initial);
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState<
    'cancel' | 'restart' | 'finish' | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [durationInput, setDurationInput] = useState(
    String(Math.round(elapsed(initial) / 60)),
  );
  const ownerId = initial.ownerId;
  const paused = draft.resumedAt === null;
  const done = completedSets(draft.exercises);
  const total = totalSets(draft.exercises);
  const rest = draft.restUntil
    ? Math.max(0, Math.ceil((draft.restUntil - now) / 1000))
    : draft.restRemaining;
  const valid = validateInputs(draft.exercises, draft.inputs, draft.unit);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  function update(next: WorkoutDraft) {
    draftRef.current = next;
    setDraft(next);
    try {
      writeDraft(ownerId, next);
      setError('');
    } catch (cause) {
      setError(
        `Your latest change could not be saved in this browser: ${explain(cause)}. Keep this window open.`,
      );
    }
  }
  async function cancel() {
    setBusy(true);
    setError('');
    try {
      const next = await run({
        type: 'change_occurrence',
        id: draft.occurrence.id,
        status: 'planned',
      });
      const restored =
        next.occurrences.find((item) => item.id === draft.occurrence.id)
          ?.status === 'planned';
      writeDraft(ownerId, null);
      toast(
        restored
          ? 'Workout cancelled. The session is back on your schedule.'
          : 'Workout cancelled. The ended plan and your completed history are preserved.',
      );
      onFinished();
    } catch (cause) {
      setError(
        `Cancellation did not complete. Your draft is preserved. ${explain(cause)}`,
      );
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }
  function finish() {
    if (busy) return;
    setBusy(true);
    try {
      const workout = finishDraft(draftRef.current);
      // Outbox must durably commit before deleting a draft or reporting completion.
      queueWorkout(ownerId, workout);
      writeDraft(ownerId, null);
      window.dispatchEvent(new CustomEvent(syncEvent));
      toast('Workout recorded. Syncing to your journal…');
      onFinished();
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={draft.occurrence.routine.name} onClose={onClose} wide>
      <div className="page-stack member-session">
        <div className="member-session-head">
          <div>
            <Badge tone={paused ? 'amber' : 'green'}>
              {paused ? 'PAUSED' : 'IN SESSION'}
            </Badge>
            <p className="muted small">
              {draft.occurrence.programTitle} ·{' '}
              {formatDate(draft.occurrence.date)}
            </p>
          </div>
          <div
            className="member-clock"
            role="timer"
            aria-label="Workout duration"
          >
            {clockTime(elapsed(draft, now))}
          </div>
        </div>
        <div className="row-between">
          <span className="muted small">
            {done} of {total} sets completed · {draft.unit.toUpperCase()}
          </span>
          <div className="actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                update(
                  paused
                    ? resumeDraft(draftRef.current)
                    : pauseDraft(draftRef.current),
                )
              }
            >
              {paused ? 'Resume workout' : 'Pause workout'}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Keep draft & close
            </Button>
          </div>
        </div>
        <progress
          className="member-progress"
          max={Math.max(1, total)}
          value={done}
          aria-label="Completed workout sets"
        />
        {error && (
          <div className="error-text" role="alert">
            {error}
          </div>
        )}
        {rest > 0 && (
          <div className="member-rest" role="status">
            <div>
              <span className="eyebrow">
                {paused ? 'REST PAUSED' : 'TAKE A BREATH'}
              </span>
              <strong>{clockTime(rest)}</strong>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                update({
                  ...draftRef.current,
                  restUntil: paused ? null : Date.now() + (rest + 30) * 1000,
                  restRemaining: paused ? rest + 30 : 0,
                })
              }
            >
              +30 sec
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                update({
                  ...draftRef.current,
                  restUntil: null,
                  restRemaining: 0,
                })
              }
            >
              Skip rest
            </Button>
          </div>
        )}
        {paused && (
          <p className="member-coach-note">
            Timer paused. Resume when you are ready to log your next set.
          </p>
        )}
        <SetsEditor
          exercises={draft.exercises}
          inputs={draft.inputs}
          unit={draft.unit}
          disabled={paused || busy}
          onChange={(exercises, inputs) =>
            update({ ...draftRef.current, exercises, inputs })
          }
          onRest={(seconds) =>
            update({
              ...draftRef.current,
              restUntil: seconds > 0 ? Date.now() + seconds * 1000 : null,
              restRemaining: 0,
            })
          }
          showInstructions={(id) =>
            state.exercises.find((exercise) => exercise.id === id)?.instructions
          }
        />
        {!valid && (
          <p className="error-text" role="alert">
            Enter a valid non-negative weight and positive whole reps or seconds
            for each set. Decimals such as 22.5 are supported for weight.
          </p>
        )}
        <section className="member-reflection">
          <h3>How did it feel?</h3>
          <p className="muted small">
            Leave a little context for your next session and your coach.
          </p>
          <Field label={`Effort: ${draft.effort} / 10`}>
            <input
              type="range"
              min="1"
              max="10"
              value={draft.effort}
              onChange={(event) =>
                update({
                  ...draftRef.current,
                  effort: Number(event.target.value),
                })
              }
              aria-label="Workout effort"
            />
          </Field>
          <Field label="Session notes">
            <textarea
              className="textarea"
              maxLength={3000}
              rows={3}
              value={draft.notes}
              placeholder="Energy, technique, small wins…"
              onChange={(event) =>
                update({ ...draftRef.current, notes: event.target.value })
              }
            />
          </Field>
          <details className="member-instructions">
            <summary>Forgot to pause? Correct active time</summary>
            <div className="stack">
              <p>
                Enter the minutes you actually trained. Applying a correction
                pauses the timer.
              </p>
              <Field label="Actual active minutes">
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="2880"
                  step="1"
                  value={durationInput}
                  onChange={(event) => setDurationInput(event.target.value)}
                />
              </Field>
              <Button
                variant="secondary"
                onClick={() => {
                  const minutes = Number(durationInput);
                  const wallSeconds = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - Date.parse(draft.startedAt)) / 1000,
                    ),
                  );
                  if (
                    !durationInput.trim() ||
                    !Number.isInteger(minutes) ||
                    minutes < 0 ||
                    minutes > 2880 ||
                    minutes * 60 > wallSeconds + 10
                  ) {
                    setError(
                      'Enter whole minutes between 0 and the time since this workout started, up to 48 hours.',
                    );
                    return;
                  }
                  update({
                    ...pauseDraft(draftRef.current),
                    elapsedSeconds: minutes * 60,
                  });
                }}
              >
                Apply time correction
              </Button>
            </div>
          </details>
        </section>
        <p className="muted small">
          Your draft is saved to this browser after each change. Unchecked sets
          are not included in your volume. Finish with at least one completed
          set.
        </p>
        <div className="member-session-footer">
          <div className="actions">
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => setConfirm('cancel')}
            >
              Cancel workout
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirm('restart')}
            >
              Restart
            </Button>
          </div>
          <Button
            disabled={!done || !valid || busy}
            onClick={() => setConfirm('finish')}
          >
            Finish workout →
          </Button>
        </div>
      </div>
      {confirm === 'cancel' && (
        <ConfirmDialog
          title="Cancel this workout?"
          description="The draft and logged sets will be discarded after your scheduled session is restored. Completed workout history is never removed."
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={() => void cancel()}
        />
      )}
      {confirm === 'restart' && (
        <ConfirmDialog
          title="Restart this workout?"
          description="This resets your timer, set entries and reflection for this session. Your previously completed workouts are unchanged."
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            const next = createDraft(ownerId, draft.occurrence, draft.unit);
            update({ ...next, id: draft.id });
            setConfirm(null);
          }}
        />
      )}
      {confirm === 'finish' && (
        <ConfirmDialog
          title={
            done < total
              ? 'Save a partial workout?'
              : 'Finish and save your workout?'
          }
          description={`${done} of ${total} sets will be recorded. ${done < total ? 'Unchecked sets stay visible as unfinished and do not count toward training volume. ' : ''}Your reflection will be included in your journal.`}
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={finish}
        />
      )}
    </Modal>
  );
}

export function JournalPage(props: PageProps) {
  const { state, navigate } = props;
  const { pending, storageError } = usePending(state.user.id);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const mine = state.workouts.filter(
    (workout) => workout.userId === state.user.id,
  );
  const pendingOnly = pending.filter(
    (item) => !mine.some((workout) => workout.id === item.workout.id),
  );
  const pendingIds = new Set(pendingOnly.map((item) => item.workout.id));
  const all = [...mine, ...pendingOnly.map((item) => item.workout)].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.completedAt.localeCompare(a.completedAt),
  );
  const filtered = all.filter(
    (workout) =>
      (!from || workout.date >= from) &&
      (!to || workout.date <= to) &&
      `${workout.routineName} ${workout.programTitle} ${workout.reflection.notes}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const current = all.find((workout) => workout.id === selected);
  useEffect(() => {
    setLimit(20);
  }, [query, from, to]);
  return (
    <div className="page-stack member-page">
      <PageHeader
        eyebrow="THE WORK YOU’VE PUT IN"
        title="Your training journal."
        description="Every session tells part of the story. Keep the details that matter."
        actions={
          <Button variant="secondary" onClick={() => navigate('today')}>
            Back to training →
          </Button>
        }
      />
      <div className="grid-3">
        <Stat
          label="Saved workouts"
          value={mine.length}
          detail="Your complete saved history"
        />
        <Stat
          label="Time invested"
          value={`${Math.round(mine.reduce((sum, workout) => sum + workout.durationSeconds, 0) / 60)} min`}
          detail="Active session time, excluding pauses"
        />
        <Stat
          label="Working sets"
          value={mine.reduce(
            (sum, workout) =>
              sum +
              workout.exercises.reduce(
                (count, exercise) =>
                  count +
                  exercise.sets.filter((set) => set.completed && !set.isWarmup)
                    .length,
                0,
              ),
            0,
          )}
          detail="Completed sets, excluding warm-ups"
        />
      </div>
      {storageError && (
        <p className="error-text" role="alert">
          {storageError}
        </p>
      )}
      <Card className="card">
        <div className="member-journal-filters">
          <Field label="Search your journal">
            <input
              className="input"
              type="search"
              placeholder="Workout, plan or reflection…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <Field label="From">
            <input
              className="input"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To">
            <input
              className="input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('');
              setFrom('');
              setTo('');
            }}
          >
            Clear filters
          </Button>
        </div>
        <div className="divider" />
        {filtered.length ? (
          <div className="stack">
            {filtered.slice(0, limit).map((workout) => (
              <button
                className="member-journal-row"
                key={workout.id}
                onClick={() => setSelected(workout.id)}
              >
                <span className="member-date-tile">
                  <small>
                    {new Date(`${workout.date}T12:00:00`).toLocaleDateString(
                      undefined,
                      { month: 'short' },
                    )}
                  </small>
                  <strong>{workout.date.slice(8)}</strong>
                </span>
                <span className="member-journal-title">
                  <strong>{workout.routineName}</strong>
                  <small>
                    {workout.programTitle} · {formatDate(workout.date)}
                  </small>
                  <span className="actions">
                    {pendingIds.has(workout.id) && (
                      <Badge tone="amber">Waiting to sync</Badge>
                    )}
                    {workout.review && (
                      <Badge tone="blue">Coach feedback</Badge>
                    )}
                    {completedSets(workout.exercises) <
                      totalSets(workout.exercises) && (
                      <Badge tone="muted">Partial session</Badge>
                    )}
                  </span>
                </span>
                <span className="member-journal-numbers">
                  <strong>
                    {Math.round(workout.durationSeconds / 60)} min
                  </strong>
                  <small>
                    {completedSets(workout.exercises)} sets ·{' '}
                    {formatWeight(volume(workout), state.user.unit)}
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title={
              all.length
                ? 'No sessions match these filters.'
                : 'Your first entry is waiting.'
            }
            description={
              all.length
                ? 'Try a wider date range or another search.'
                : 'Complete a workout and your sets, reflection and coach feedback will live here.'
            }
            action={
              !all.length ? (
                <Button onClick={() => navigate('today')}>
                  Start training
                </Button>
              ) : undefined
            }
          />
        )}
        {filtered.length > limit && (
          <Button
            variant="secondary"
            onClick={() => setLimit((value) => value + 20)}
          >
            Show more ({filtered.length - limit} remaining)
          </Button>
        )}
      </Card>
      {current && (
        <WorkoutDetail
          {...props}
          workout={current}
          pending={pendingIds.has(current.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function WorkoutDetail({
  state,
  run,
  toast,
  workout,
  pending,
  onClose,
}: PageProps & { workout: Workout; pending: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [exercises, setExercises] = useState(workout.exercises);
  const [inputs, setInputs] = useState(() =>
    exerciseInputs(workout.exercises, state.user.unit),
  );
  const [notes, setNotes] = useState(workout.reflection.notes);
  const [effort, setEffort] = useState(workout.reflection.effort);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      await run({
        type: 'update_workout',
        id: workout.id,
        exercises,
        reflection: { effort, notes: notes.trim() },
      });
      setEditing(false);
      toast('Journal entry updated.');
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={workout.routineName} onClose={onClose} wide>
      <div className="page-stack">
        <div className="row-between">
          <p className="muted">
            {formatDate(workout.date)} · {workout.programTitle}
          </p>
          <Badge tone={pending ? 'amber' : 'green'}>
            {pending ? 'Waiting to sync' : 'Saved workout'}
          </Badge>
        </div>
        <div className="grid-3">
          <Stat
            label="Active time"
            value={clockTime(workout.durationSeconds)}
          />
          <Stat
            label="Completed sets"
            value={`${completedSets(workout.exercises)} / ${totalSets(workout.exercises)}`}
          />
          <Stat
            label="Volume"
            value={formatWeight(volume(workout), state.user.unit)}
          />
        </div>
        {workout.review && (
          <div className="member-feedback">
            <Badge tone="blue">COACH FEEDBACK</Badge>
            <p>{workout.review.text}</p>
            <small className="muted">
              {state.users.find(
                (person) => person.id === workout.review?.trainerId,
              )?.name || 'Your coach'}{' '}
              · {new Date(workout.review.createdAt).toLocaleDateString()}
            </small>
          </div>
        )}
        {editing ? (
          <>
            <SetsEditor
              exercises={exercises}
              inputs={inputs}
              unit={state.user.unit}
              disabled={busy}
              onChange={(next, values) => {
                setExercises(next);
                setInputs(values);
              }}
            />
            <Field label={`Effort: ${effort} / 10`}>
              <input
                type="range"
                min="1"
                max="10"
                value={effort}
                aria-label="Workout effort"
                onChange={(event) => setEffort(Number(event.target.value))}
              />
            </Field>
            <Field label="Session notes">
              <textarea
                className="textarea"
                value={notes}
                maxLength={3000}
                rows={4}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <Button
                busy={busy}
                disabled={
                  !completedSets(exercises) ||
                  !validateInputs(exercises, inputs, state.user.unit)
                }
                onClick={() => void save()}
              >
                Save journal changes
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setExercises(workout.exercises);
                  setInputs(exerciseInputs(workout.exercises, state.user.unit));
                  setNotes(workout.reflection.notes);
                  setEffort(workout.reflection.effort);
                }}
              >
                Discard edits
              </Button>
            </div>
          </>
        ) : (
          <>
            {workout.exercises.map((exercise, index) => (
              <div
                className="member-prescription"
                key={`${exercise.exerciseId}-${index}`}
              >
                <div className="row-between">
                  <h3>{exercise.name}</h3>
                  {exercise.group && (
                    <Badge tone="blue">{exercise.group}</Badge>
                  )}
                </div>
                <div className="member-history-sets">
                  {exercise.sets.map((set, si) => (
                    <span
                      className={`member-history-set ${set.completed ? '' : 'member-history-unfinished'}`}
                      key={si}
                    >
                      {set.completed ? '✓' : '—'} {set.isWarmup ? 'W ' : ''}
                      {set.durationSeconds
                        ? `${set.durationSeconds}s`
                        : `${set.reps} reps`}{' '}
                      × {formatWeight(set.weight, state.user.unit)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <div className="member-reflection">
              <span className="eyebrow">YOUR REFLECTION</span>
              <h3>Effort {workout.reflection.effort} / 10</h3>
              <p>{workout.reflection.notes || 'No notes for this session.'}</p>
            </div>
            <p className="muted small">
              Volume includes completed working sets; warm-ups are excluded.
              Unfinished sets are excluded.
            </p>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              {pending ? 'Editing available after sync' : 'Edit journal entry'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

export function ProgressPage({ state, navigate }: PageProps) {
  const workouts = state.workouts.filter(
    (workout) => workout.userId === state.user.id,
  );
  const today = dateKey();
  const [selectedExercise, setSelectedExercise] = useState('');
  const completedWorkingSets = workouts.reduce(
    (sum, workout) =>
      sum +
      workout.exercises.reduce(
        (value, exercise) =>
          value +
          exercise.sets.filter((set) => set.completed && !set.isWarmup).length,
        0,
      ),
    0,
  );
  const totalVolume = workouts.reduce(
    (sum, workout) => sum + volume(workout),
    0,
  );
  const thisWeek = weekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) =>
    addDays(thisWeek, (i - 7) * 7),
  );
  const weekly = weeks.map((start) => ({
    start,
    workouts: workouts.filter(
      (workout) => workout.date >= start && workout.date <= addDays(start, 6),
    ),
  }));
  const maxWeekly = Math.max(1, ...weekly.map((week) => week.workouts.length));
  const recentVolume = workouts
    .filter(
      (workout) => workout.date >= addDays(today, -27) && workout.date <= today,
    )
    .reduce((sum, workout) => sum + volume(workout), 0);
  const previousVolume = workouts
    .filter(
      (workout) =>
        workout.date >= addDays(today, -55) &&
        workout.date < addDays(today, -27),
    )
    .reduce((sum, workout) => sum + volume(workout), 0);
  const change =
    previousVolume > 0
      ? Math.round(((recentVolume - previousVolume) / previousVolume) * 100)
      : null;
  const due = state.occurrences.filter(
    (item) =>
      item.memberId === state.user.id &&
      item.date >= addDays(today, -27) &&
      item.date <= today &&
      item.status !== 'cancelled',
  );
  const adherence = due.length
    ? Math.round(
        (due.filter((item) => item.status === 'completed').length /
          due.length) *
          100,
      )
    : null;
  const records = useMemo(() => {
    const result = new Map<
      string,
      {
        id: string;
        name: string;
        weight: number;
        reps: number;
        date: string;
        points: Array<{ date: string; weight: number }>;
      }
    >();
    for (const workout of [...workouts].sort((a, b) =>
      a.date.localeCompare(b.date),
    )) {
      for (const exercise of workout.exercises) {
        const sets = exercise.sets.filter(
          (set) =>
            set.completed && !set.isWarmup && set.weight > 0 && set.reps > 0,
        );
        if (!sets.length) continue;
        const best = [...sets].sort(
          (a, b) => b.weight - a.weight || b.reps - a.reps,
        )[0];
        const current = result.get(exercise.exerciseId);
        const points = [
          ...(current?.points || []),
          { date: workout.date, weight: best.weight },
        ];
        if (
          !current ||
          best.weight > current.weight ||
          (best.weight === current.weight && best.reps > current.reps)
        )
          result.set(exercise.exerciseId, {
            id: exercise.exerciseId,
            name: exercise.name,
            weight: best.weight,
            reps: best.reps,
            date: workout.date,
            points,
          });
        else result.set(exercise.exerciseId, { ...current, points });
      }
    }
    return [...result.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [workouts]);
  const chosen =
    records.find((record) => record.id === selectedExercise) || records[0];
  const points = chosen?.points || [];
  const maxWeight = Math.max(1, ...points.map((point) => point.weight));
  const line = points
    .map(
      (point, index) =>
        `${40 + (points.length === 1 ? 210 : (index / (points.length - 1)) * 440)},${170 - (point.weight / maxWeight) * 130}`,
    )
    .join(' ');
  return (
    <div className="page-stack member-page">
      <PageHeader
        eyebrow="SMALL STEPS. REAL PROGRESS."
        title="Stronger over time."
        description="An honest look at your consistency, volume and personal bests."
        actions={
          <Button variant="secondary" onClick={() => navigate('journal')}>
            View full history ↗
          </Button>
        }
      />
      <div className="grid-4">
        <Stat
          label="Lifetime sessions"
          value={workouts.length}
          detail="All saved workouts"
        />
        <Stat
          label="Training volume"
          value={formatWeight(totalVolume, state.user.unit)}
          detail="Completed reps × weight"
        />
        <Stat
          label="Working sets"
          value={completedWorkingSets}
          detail="Warm-ups excluded"
        />
        <Stat
          label="28-day adherence"
          value={adherence === null ? '—' : `${adherence}%`}
          detail={
            due.length
              ? `${due.filter((item) => item.status === 'completed').length} of ${due.length} scheduled sessions due`
              : 'No scheduled sessions due'
          }
        />
      </div>
      {!workouts.length ? (
        <Card className="card">
          <Empty
            title="Progress starts with one session."
            description="As you log workouts, your training consistency, volume and personal records will appear here."
            action={
              <Button onClick={() => navigate('today')}>
                Go to your workout
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid-2">
            <Card className="card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">BUILD YOUR RHYTHM</span>
                  <h2>Training consistency</h2>
                </div>
                <Badge tone="green">8 WEEKS</Badge>
              </div>
              <svg
                className="member-chart"
                viewBox="0 0 520 225"
                role="img"
                aria-label={`Weekly workouts: ${weekly.map((week) => `${formatDate(week.start)}: ${week.workouts.length}`).join('; ')}`}
              >
                <line
                  x1="30"
                  y1="185"
                  x2="505"
                  y2="185"
                  className="member-chart-grid"
                />
                {weekly.map((week, i) => (
                  <g key={week.start}>
                    <rect
                      x={43 + i * 59}
                      y={185 - (week.workouts.length / maxWeekly) * 138}
                      width="27"
                      height={Math.max(
                        2,
                        (week.workouts.length / maxWeekly) * 138,
                      )}
                      rx="6"
                      className={
                        i === 7
                          ? 'member-chart-bar-current'
                          : 'member-chart-bar'
                      }
                    />
                    <text
                      x={56 + i * 59}
                      y={175 - (week.workouts.length / maxWeekly) * 138}
                      textAnchor="middle"
                      className="member-chart-value"
                    >
                      {week.workouts.length}
                    </text>
                    <text
                      x={56 + i * 59}
                      y="211"
                      textAnchor="middle"
                      className="member-chart-label"
                    >
                      {new Date(`${week.start}T12:00:00`).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric' },
                      )}
                    </text>
                  </g>
                ))}
              </svg>
              <p className="muted small">
                Weeks begin Monday. This week is still in progress.
              </p>
            </Card>
            <Card className="card member-volume-card">
              <span className="eyebrow">YOUR LAST 28 DAYS</span>
              <h2>Every rep adds up.</h2>
              <strong className="member-volume-number">
                {formatWeight(recentVolume, state.user.unit)}
              </strong>
              <Badge tone={change !== null && change > 0 ? 'green' : 'muted'}>
                {change === null
                  ? 'Building your baseline'
                  : `${change > 0 ? '+' : ''}${change}% vs. previous 28 days`}
              </Badge>
              <p className="muted">
                Volume is the sum of completed working reps × weight, excluding
                warm-ups. Bodyweight and timed exercises can contribute effort
                without adding external-weight volume.
              </p>
            </Card>
          </div>
          <div className="grid-2">
            <Card className="card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">LIFT BY LIFT</span>
                  <h2>Strength trend</h2>
                </div>
              </div>
              {chosen ? (
                <>
                  <Field label="Exercise">
                    <select
                      className="select"
                      value={chosen.id}
                      onChange={(event) =>
                        setSelectedExercise(event.target.value)
                      }
                    >
                      {records.map((record) => (
                        <option key={record.id} value={record.id}>
                          {record.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <svg
                    className="member-chart"
                    viewBox="0 0 520 225"
                    role="img"
                    aria-label={`${chosen.name}, heaviest completed working set per session: ${points.map((point) => `${formatDate(point.date)} ${formatWeight(point.weight, state.user.unit)}`).join('; ')}`}
                  >
                    <line
                      x1="30"
                      y1="185"
                      x2="495"
                      y2="185"
                      className="member-chart-grid"
                    />
                    <polyline
                      points={line}
                      fill="none"
                      className="member-chart-line"
                    />
                    {points.map((point, i) => (
                      <circle
                        key={`${point.date}-${i}`}
                        cx={
                          40 +
                          (points.length === 1
                            ? 210
                            : (i / (points.length - 1)) * 440)
                        }
                        cy={170 - (point.weight / maxWeight) * 130}
                        r="5"
                        className="member-chart-point"
                      >
                        <title>
                          {formatDate(point.date)}:{' '}
                          {formatWeight(point.weight, state.user.unit)}
                        </title>
                      </circle>
                    ))}
                    <text x="40" y="215" className="member-chart-label">
                      {formatDate(points[0].date)}
                    </text>
                    <text
                      x="480"
                      y="215"
                      textAnchor="end"
                      className="member-chart-label"
                    >
                      {points.length > 1
                        ? formatDate(points[points.length - 1].date)
                        : 'First recorded session'}
                    </text>
                  </svg>
                  <p className="muted small">
                    Heaviest completed working set in each recorded session.
                    This is recorded weight, not an estimated one-rep max.
                  </p>
                </>
              ) : (
                <Empty
                  title="No weighted working sets yet."
                  description="Log a weighted working set to start your strength trend."
                />
              )}
            </Card>
            <Card className="card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">EARNED, REP BY REP</span>
                  <h2>Personal records</h2>
                </div>
                <Badge tone="amber">YOUR BEST</Badge>
              </div>
              {records.length ? (
                <div className="member-records">
                  {records.map((record) => (
                    <div className="row-between member-record" key={record.id}>
                      <div>
                        <strong>{record.name}</strong>
                        <p className="muted small">{formatDate(record.date)}</p>
                      </div>
                      <div>
                        <strong>
                          {formatWeight(record.weight, state.user.unit)}
                        </strong>
                        <p className="muted small">× {record.reps} reps</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  Your weighted working-set records will appear here.
                </p>
              )}
            </Card>
          </div>
        </>
      )}
      <p className="muted small">
        Statistics use your complete saved history. Workouts waiting to sync are
        visible in your journal and join these totals after saving.
      </p>
    </div>
  );
}
