import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generatePlan } from './api';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Empty,
  Field,
  Modal,
  PageHeader,
} from './ui';
import type {
  DayMapping,
  ExerciseDefinition,
  GenerationRequest,
  PageProps,
  Program,
  Routine,
  RoutineExercise,
} from './types';
import {
  copyProgram,
  DISPLAY_DAYS,
  displayDate,
  displayLoad,
  draftKey,
  EQUIPMENT,
  localDate,
  moveItem,
  newProgram,
  newRoutine,
  normalizeProfileEquipment,
  readDraft,
  schedulePreview,
  storageLoad,
  validateProgram,
  WEEKDAYS,
} from './Programs.helpers';
import './Programs.css';

const sourceName = (program: Program) =>
  program.source === 'ai'
    ? 'Local plan'
    : program.source === 'trainer'
      ? 'Trainer plan'
      : 'Personal plan';
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
type ProgramFilter = 'active' | 'mine' | 'shared' | 'archived';

export function PlansPage(props: PageProps) {
  const { state, run, navigate, toast } = props;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProgramFilter>('active');
  const [editor, setEditor] = useState<Program | null>(null);
  const [detail, setDetail] = useState<Program | null>(null);
  const [assignment, setAssignment] = useState<Program | null>(null);
  const [draft, setDraft] = useState<Program | null>(() =>
    readDraft(state.user.id),
  );
  const [discardDraft, setDiscardDraft] = useState(false);
  const [pendingEditor, setPendingEditor] = useState<Program | null>(null);
  const [remove, setRemove] = useState<Program | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState('');
  const activeCount = state.programs.filter(
    (program) => !program.archived,
  ).length;
  const mineCount = state.programs.filter(
    (program) => program.ownerId === state.user.id && !program.archived,
  ).length;

  useEffect(() => {
    setEditor(null);
    setDetail(null);
    setAssignment(null);
    setPendingEditor(null);
    setRemove(null);
    setDiscardDraft(false);
    setDraft(readDraft(state.user.id));
  }, [state.user.id]);

  const programs = useMemo(
    () =>
      state.programs.filter((program) => {
        if (filter === 'archived' ? !program.archived : program.archived)
          return false;
        if (filter === 'mine' && program.ownerId !== state.user.id)
          return false;
        if (filter === 'shared' && program.ownerId === state.user.id)
          return false;
        return `${program.title} ${program.description} ${program.routines.map((routine) => routine.name).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [state.programs, state.user.id, filter, search],
  );

  function openEditor(program: Program) {
    const saved = readDraft(state.user.id);
    if (saved && saved.id !== program.id) {
      setPendingEditor(program);
      return;
    }
    setEditor(saved?.id === program.id ? saved : structuredClone(program));
  }

  async function archive(program: Program) {
    if (busyId) return;
    setBusyId(program.id);
    setMutationError('');
    try {
      await run({
        type: 'archive_program',
        id: program.id,
        archived: !program.archived,
      });
      toast(
        program.archived
          ? 'Program restored.'
          : 'Program archived. Existing schedules and history are preserved.',
      );
    } catch (error) {
      setMutationError(errorText(error));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProgram() {
    if (!remove || busyId) return;
    setBusyId(remove.id);
    setMutationError('');
    try {
      await run({ type: 'delete_program', id: remove.id });
      if (readDraft(state.user.id)?.id === remove.id)
        localStorage.removeItem(draftKey(state.user.id));
      setDraft(readDraft(state.user.id));
      setRemove(null);
      toast(
        'Program deleted. Completed workouts and scheduled snapshots are preserved.',
      );
    } catch (error) {
      setMutationError(errorText(error));
      toast(errorText(error), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Build your next chapter"
        title="Programs"
        description="Thoughtful training, built around you. Create a plan, make it your own, then put it on the calendar."
        actions={
          <div className="actions">
            <Button variant="secondary" onClick={() => navigate('studio')}>
              Plan studio
            </Button>
            <Button onClick={() => openEditor(newProgram(state.user))}>
              Create program
            </Button>
          </div>
        }
      />
      <div className="program-summary">
        <span>
          <strong>{activeCount}</strong> active programs
        </span>
        <span>
          <strong>{mineCount}</strong> created by you
        </span>
        <span>Every completed workout stays in your journal.</span>
      </div>
      {draft && !editor && (
        <Card className="program-draft-banner">
          <div>
            <Badge tone="amber">Unsaved draft</Badge>
            <h3>{draft.title.trim() || 'Your next program'}</h3>
            <p className="muted small">
              Your edits are saved in this browser for your account.
            </p>
          </div>
          <div className="actions">
            <Button variant="secondary" onClick={() => setDiscardDraft(true)}>
              Discard draft
            </Button>
            <Button onClick={() => setEditor(draft)}>Resume draft</Button>
          </div>
        </Card>
      )}
      <div className="program-toolbar">
        <div className="program-tabs" role="group" aria-label="Filter programs">
          {(
            [
              ['active', 'All active'],
              ['mine', 'My programs'],
              ['shared', 'Available to me'],
              ['archived', 'Archived'],
            ] as [ProgramFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${filter === value ? 'chip-active' : ''}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="program-search">
          <span className="sr-only">Search programs</span>
          <input
            className="input"
            type="search"
            placeholder="Search programs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {mutationError && (
        <p className="error-text" role="alert">
          {mutationError}
        </p>
      )}
      {!programs.length ? (
        <Empty
          title={
            search
              ? 'No matching programs'
              : filter === 'archived'
                ? 'No archived programs'
                : 'A fresh page for your training'
          }
          description={
            search
              ? 'Try another title or routine name.'
              : 'Build a program from the exercise library or start with a local template in Plan studio.'
          }
          action={
            filter !== 'archived' ? (
              <Button onClick={() => openEditor(newProgram(state.user))}>
                Create program
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="program-grid">
          {programs.map((program, index) => {
            const owned = program.ownerId === state.user.id;
            const owner = state.users.find(
              (person) => person.id === program.ownerId,
            );
            const exerciseCount = program.routines.reduce(
              (total, routine) => total + routine.exercises.length,
              0,
            );
            const canSchedule = !program.archived && owned;
            return (
              <Card key={program.id} className="program-card">
                <div
                  className={`program-art program-art-${index % 3}`}
                  aria-hidden="true"
                >
                  <span className="program-art-number">
                    {String(program.routines.length).padStart(2, '0')}
                  </span>
                  <span className="program-art-caption">
                    ROUTINES / YOUR PACE
                  </span>
                  <div className="program-art-lines" />
                </div>
                <div className="program-card-body">
                  <div className="row-between">
                    <Badge
                      tone={
                        program.source === 'ai'
                          ? 'blue'
                          : program.source === 'trainer'
                            ? 'green'
                            : 'muted'
                      }
                    >
                      {sourceName(program)}
                    </Badge>
                    <span className="small muted program-capitalize">
                      {program.difficulty}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="program-title-link"
                    onClick={() => setDetail(program)}
                  >
                    <h2>{program.title}</h2>
                  </button>
                  <p className="muted program-description">
                    {program.description ||
                      'A training plan ready for your next session.'}
                  </p>
                  <div className="program-meta">
                    <span>
                      {program.routines.length}{' '}
                      {program.routines.length === 1 ? 'routine' : 'routines'}
                    </span>
                    <span>{exerciseCount} exercises</span>
                    <span>v{program.revision}</span>
                  </div>
                  <div className="row-between small muted">
                    <span>
                      {owned
                        ? 'Created by you'
                        : owner?.name || 'Shared program'}
                    </span>
                    <span>
                      {program.visibility === 'shared'
                        ? 'Shared with coach / clients'
                        : 'Private'}
                    </span>
                  </div>
                  {program.endorsedBy &&
                    program.endorsedRevision === program.revision && (
                      <Badge tone="green">Reviewed by trainer</Badge>
                    )}
                  <div className="program-card-actions">
                    <Button
                      variant="secondary"
                      onClick={() => setDetail(program)}
                    >
                      View plan
                    </Button>
                    {canSchedule && (
                      <Button onClick={() => setAssignment(program)}>
                        {state.user.role === 'trainer'
                          ? 'Assign to client'
                          : 'Schedule'}
                      </Button>
                    )}
                  </div>
                  <div className="program-more-actions">
                    {owned && (
                      <Button
                        variant="ghost"
                        onClick={() => openEditor(program)}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() =>
                        openEditor(copyProgram(program, state.user))
                      }
                    >
                      Make a copy
                    </Button>
                    {owned && (
                      <>
                        <Button
                          variant="ghost"
                          disabled={!!busyId}
                          onClick={() => void archive(program)}
                        >
                          {program.archived ? 'Restore' : 'Archive'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setMutationError('');
                            setRemove(program);
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editor && (
        <ProgramEditor
          key={`${state.user.id}:${editor.id}`}
          {...props}
          initial={editor}
          onClose={() => {
            setEditor(null);
            setDraft(readDraft(state.user.id));
          }}
          onSaved={() => {
            setEditor(null);
            setDraft(null);
            setFilter('mine');
          }}
        />
      )}
      {detail && (
        <ProgramDetail
          {...props}
          program={
            state.programs.find((program) => program.id === detail.id) || detail
          }
          onClose={() => setDetail(null)}
          onEdit={
            detail.ownerId === state.user.id
              ? () => {
                  setDetail(null);
                  openEditor(detail);
                }
              : undefined
          }
          onSchedule={
            !detail.archived && detail.ownerId === state.user.id
              ? () => {
                  setDetail(null);
                  setAssignment(detail);
                }
              : undefined
          }
        />
      )}
      {assignment && (
        <AssignmentModal
          {...props}
          program={assignment}
          onClose={() => setAssignment(null)}
        />
      )}
      {discardDraft && (
        <ConfirmDialog
          title="Discard your unfinished program?"
          description="This removes the unsaved draft from this browser. Your saved programs, schedules, and completed workouts will be kept."
          onClose={() => setDiscardDraft(false)}
          onConfirm={() => {
            try {
              localStorage.removeItem(draftKey(state.user.id));
              setDraft(null);
              setDiscardDraft(false);
            } catch {
              toast(
                'The browser could not remove this draft. Please try again.',
                'error',
              );
            }
          }}
        />
      )}
      {pendingEditor && (
        <ConfirmDialog
          title="Replace your saved draft?"
          description="There is another unfinished program in this browser. Opening this program will replace that draft. Saved programs and workout history are unaffected."
          onClose={() => setPendingEditor(null)}
          onConfirm={() => {
            localStorage.removeItem(draftKey(state.user.id));
            setDraft(null);
            setEditor(pendingEditor);
            setPendingEditor(null);
          }}
        />
      )}
      {remove && (
        <ConfirmDialog
          title={`Delete “${remove.title}”?`}
          description="This removes the program from your library. Existing scheduled workout snapshots and completed workout history are kept. Archive it instead if you may want to use it again."
          busy={busyId === remove.id}
          onClose={() => {
            if (!busyId) setRemove(null);
          }}
          onConfirm={() => void deleteProgram()}
        />
      )}
    </div>
  );
}

interface EditorProps extends PageProps {
  initial: Program;
  onClose: () => void;
  onSaved: (program: Program) => void;
}

function ProgramEditor({
  initial,
  state,
  run,
  toast,
  onClose,
  onSaved,
}: EditorProps) {
  const [program, setProgram] = useState<Program>(() =>
    structuredClone(initial),
  );
  const [activeId, setActiveId] = useState(initial.routines[0]?.id || '');
  const [showLibrary, setShowLibrary] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [draftWarning, setDraftWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [removal, setRemoval] = useState<{
    routineId: string;
    exerciseIndex?: number;
  } | null>(null);
  const saving = useRef(false);
  const routine =
    program.routines.find((entry) => entry.id === activeId) ||
    program.routines[0];
  const original = state.programs.find((entry) => entry.id === program.id);

  useEffect(() => {
    if (program.ownerId !== state.user.id) return;
    try {
      localStorage.setItem(draftKey(state.user.id), JSON.stringify(program));
      setDraftWarning('');
    } catch {
      setDraftWarning(
        'This browser could not save your draft. Keep this window open until you save the program.',
      );
    }
  }, [program, state.user.id]);

  function updateRoutine(id: string, update: Partial<Routine>) {
    setProgram((previous) => ({
      ...previous,
      routines: previous.routines.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    }));
  }
  function updateExercise(index: number, update: Partial<RoutineExercise>) {
    if (!routine) return;
    updateRoutine(routine.id, {
      exercises: routine.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, ...update } : exercise,
      ),
    });
  }
  function addRoutine() {
    if (program.routines.length >= 14) {
      setError('A program can contain up to 14 routines.');
      return;
    }
    const next = newRoutine(program.routines.length);
    setProgram((previous) => ({
      ...previous,
      routines: [...previous.routines, next],
    }));
    setActiveId(next.id);
    setShowLibrary(false);
  }
  function duplicateRoutine(entry: Routine) {
    if (program.routines.length >= 14) {
      setError('A program can contain up to 14 routines.');
      return;
    }
    const next: Routine = {
      ...structuredClone(entry),
      id: crypto.randomUUID(),
      name: `${entry.name} (copy)`,
    };
    setProgram((previous) => ({
      ...previous,
      routines: [...previous.routines, next],
    }));
    setActiveId(next.id);
    setShowLibrary(false);
  }
  function addExercise(exercise: ExerciseDefinition) {
    if (!routine) return;
    if (routine.exercises.length >= 30) {
      setError('A routine can contain up to 30 exercises.');
      return;
    }
    updateRoutine(routine.id, {
      exercises: [
        ...routine.exercises,
        {
          exerciseId: exercise.id,
          name: exercise.name,
          sets: Array.from({ length: 3 }, () => ({
            reps: 10,
            weight: 0,
            restSeconds: 60,
          })),
        },
      ],
    });
    toast(`${exercise.name} added.`);
  }
  function removeItem() {
    if (!removal) return;
    if (removal.exerciseIndex !== undefined) {
      const target = program.routines.find(
        (entry) => entry.id === removal.routineId,
      );
      if (target)
        updateRoutine(target.id, {
          exercises: target.exercises.filter(
            (_, index) => index !== removal.exerciseIndex,
          ),
        });
    } else {
      const next = program.routines.filter(
        (entry) => entry.id !== removal.routineId,
      );
      setProgram((previous) => ({ ...previous, routines: next }));
      if (activeId === removal.routineId) setActiveId(next[0]?.id || '');
    }
    setRemoval(null);
  }
  async function save() {
    if (saving.current) return;
    const validation = validateProgram(program);
    if (validation) {
      setError(validation);
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const fresh = await run({
        type: 'save_program',
        program: {
          ...program,
          title: program.title.trim(),
          description: program.description.trim(),
          routines: program.routines.map((entry) => ({
            ...entry,
            name: entry.name.trim(),
          })),
        },
      });
      try {
        localStorage.removeItem(draftKey(state.user.id));
      } catch {
        /* Server save succeeded; browser storage may be disabled. */
      }
      toast(
        original
          ? 'Program updated. Existing scheduled workouts keep their original version.'
          : 'Program saved. Ready to schedule.',
      );
      onSaved(
        fresh.programs.find((entry) => entry.id === program.id) || program,
      );
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      title={original ? 'Edit program' : 'Build a program'}
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="program-editor">
        <fieldset className="program-editor-fields" disabled={busy}>
          <div className="row-between">
            <div className="row">
              <Badge tone="green">{sourceName(program)}</Badge>
              <span className="muted small">
                {draftWarning
                  ? 'Draft not saved'
                  : 'Draft saved in this browser'}
              </span>
            </div>
            <Button variant="secondary" onClick={() => setPreview(!preview)}>
              {preview ? 'Back to editor' : 'Preview plan'}
            </Button>
          </div>
          {draftWarning && (
            <p className="error-text" role="alert">
              {draftWarning}
            </p>
          )}
          {preview ? (
            <ProgramContents program={program} state={state} />
          ) : (
            <>
              <div className="form-grid">
                <Field label="Program title">
                  <input
                    className="input"
                    maxLength={120}
                    placeholder="e.g. Strong foundations"
                    value={program.title}
                    onChange={(event) =>
                      setProgram({ ...program, title: event.target.value })
                    }
                  />
                </Field>
                <Field label="Difficulty">
                  <select
                    className="select"
                    value={program.difficulty}
                    onChange={(event) =>
                      setProgram({
                        ...program,
                        difficulty: event.target.value as Program['difficulty'],
                      })
                    }
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  className="textarea"
                  maxLength={2000}
                  rows={2}
                  placeholder="What is this program designed to help you achieve?"
                  value={program.description}
                  onChange={(event) =>
                    setProgram({ ...program, description: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Visibility"
                hint={
                  state.user.role === 'trainer'
                    ? 'Shared programs can be viewed by your active clients. Assignments include a workout snapshot even when the source program is private.'
                    : 'Shared programs can be reviewed by your connected trainer. Private programs stay in your own library.'
                }
              >
                <select
                  className="select"
                  value={program.visibility}
                  onChange={(event) =>
                    setProgram({
                      ...program,
                      visibility: event.target.value as Program['visibility'],
                    })
                  }
                >
                  <option value="private">Private — only me</option>
                  <option value="shared">
                    Shared — active coaching relationships
                  </option>
                </select>
              </Field>
              <div className="divider" />
              <div className="program-builder-layout">
                <aside
                  className="program-routine-sidebar"
                  aria-label="Program routines"
                >
                  <div className="row-between">
                    <h3>Routines</h3>
                    <Badge>{program.routines.length}</Badge>
                  </div>
                  <p className="small muted">
                    Build each training day separately.
                  </p>
                  {program.routines.map((entry, index) => (
                    <div
                      className={`program-routine-tab ${routine?.id === entry.id ? 'is-active' : ''}`}
                      key={entry.id}
                    >
                      <button
                        type="button"
                        className="program-routine-select"
                        aria-pressed={routine?.id === entry.id}
                        onClick={() => {
                          setActiveId(entry.id);
                          setShowLibrary(false);
                        }}
                      >
                        <span className="program-routine-index">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <strong>{entry.name || 'Untitled routine'}</strong>
                          <small>
                            {entry.exercises.length} exercises ·{' '}
                            {entry.durationMinutes} min
                          </small>
                        </span>
                      </button>
                      <div className="program-routine-tools">
                        <button
                          type="button"
                          aria-label={`Move ${entry.name} earlier`}
                          disabled={index === 0}
                          onClick={() =>
                            setProgram({
                              ...program,
                              routines: moveItem(program.routines, index, -1),
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${entry.name} later`}
                          disabled={index === program.routines.length - 1}
                          onClick={() =>
                            setProgram({
                              ...program,
                              routines: moveItem(program.routines, index, 1),
                            })
                          }
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          aria-label={`Duplicate ${entry.name}`}
                          onClick={() => duplicateRoutine(entry)}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${entry.name}`}
                          onClick={() => setRemoval({ routineId: entry.id })}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={addRoutine}>
                    Add routine
                  </Button>
                </aside>
                <section
                  className="program-routine-workspace"
                  aria-label="Routine editor"
                >
                  {!routine ? (
                    <Empty
                      title="Add your first routine"
                      description="A routine is one training session. Add exercises and set targets, then choose its schedule later."
                      action={<Button onClick={addRoutine}>Add routine</Button>}
                    />
                  ) : (
                    <>
                      <div className="program-routine-fields">
                        <Field label="Routine name">
                          <input
                            className="input"
                            maxLength={120}
                            value={routine.name}
                            onChange={(event) =>
                              updateRoutine(routine.id, {
                                name: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Duration (minutes)">
                          <input
                            className="input"
                            type="number"
                            min={5}
                            max={240}
                            step={5}
                            value={routine.durationMinutes}
                            onChange={(event) =>
                              updateRoutine(routine.id, {
                                durationMinutes: Number(event.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="row-between">
                        <h3>{routine.exercises.length} exercises</h3>
                        <Button
                          variant="secondary"
                          onClick={() => setShowLibrary(!showLibrary)}
                        >
                          {showLibrary
                            ? 'Close exercise library'
                            : 'Add exercise'}
                        </Button>
                      </div>
                      {showLibrary && (
                        <ExerciseLibrary
                          exercises={state.exercises}
                          onAdd={addExercise}
                        />
                      )}
                      {!routine.exercises.length && !showLibrary && (
                        <Empty
                          title="Choose your movements"
                          description="Use the exercise library to add movements and prescribe each set."
                          action={
                            <Button
                              variant="secondary"
                              onClick={() => setShowLibrary(true)}
                            >
                              Browse exercises
                            </Button>
                          }
                        />
                      )}
                      <div className="stack">
                        {routine.exercises.map((exercise, exerciseIndex) => (
                          <section
                            className="program-exercise-editor"
                            key={`${routine.id}:${exerciseIndex}:${exercise.exerciseId}`}
                            aria-label={`${exercise.name} prescription`}
                          >
                            <div className="row-between">
                              <div className="row">
                                <span className="program-exercise-number">
                                  {String(exerciseIndex + 1).padStart(2, '0')}
                                </span>
                                <h4>{exercise.name}</h4>
                              </div>
                              <div className="program-routine-tools">
                                <button
                                  type="button"
                                  aria-label={`Move ${exercise.name} up`}
                                  disabled={exerciseIndex === 0}
                                  onClick={() =>
                                    updateRoutine(routine.id, {
                                      exercises: moveItem(
                                        routine.exercises,
                                        exerciseIndex,
                                        -1,
                                      ),
                                    })
                                  }
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move ${exercise.name} down`}
                                  disabled={
                                    exerciseIndex ===
                                    routine.exercises.length - 1
                                  }
                                  onClick={() =>
                                    updateRoutine(routine.id, {
                                      exercises: moveItem(
                                        routine.exercises,
                                        exerciseIndex,
                                        1,
                                      ),
                                    })
                                  }
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Remove ${exercise.name}`}
                                  onClick={() =>
                                    setRemoval({
                                      routineId: routine.id,
                                      exerciseIndex,
                                    })
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <Field
                              label={`${exercise.name} group (optional)`}
                              hint="Use the same group for paired exercises, such as Superset A."
                            >
                              <input
                                className="input"
                                maxLength={60}
                                placeholder="e.g. Superset A"
                                value={exercise.group || ''}
                                onChange={(event) =>
                                  updateExercise(exerciseIndex, {
                                    group: event.target.value,
                                  })
                                }
                              />
                            </Field>
                            <div className="table-wrap">
                              <table className="program-set-table">
                                <thead>
                                  <tr>
                                    <th scope="col">Set</th>
                                    <th scope="col">Reps</th>
                                    <th scope="col">
                                      Load ({state.user.unit})
                                    </th>
                                    <th scope="col">Rest (sec)</th>
                                    <th scope="col">Timed (sec)</th>
                                    <th scope="col">Warm-up</th>
                                    <th scope="col">
                                      <span className="sr-only">
                                        Remove set
                                      </span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {exercise.sets.map((set, setIndex) => (
                                    <tr key={setIndex}>
                                      <th scope="row">{setIndex + 1}</th>
                                      <td>
                                        <input
                                          className="input"
                                          aria-label={`${exercise.name} set ${setIndex + 1} reps`}
                                          type="number"
                                          min={0}
                                          max={1000}
                                          step={1}
                                          value={set.reps}
                                          onChange={(event) =>
                                            updateExercise(exerciseIndex, {
                                              sets: exercise.sets.map(
                                                (item, index) =>
                                                  index === setIndex
                                                    ? {
                                                        ...item,
                                                        reps: Number(
                                                          event.target.value,
                                                        ),
                                                      }
                                                    : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <input
                                          className="input"
                                          aria-label={`${exercise.name} set ${setIndex + 1} load in ${state.user.unit}`}
                                          type="number"
                                          min={0}
                                          max={
                                            state.user.unit === 'lb'
                                              ? 2204
                                              : 1000
                                          }
                                          step="any"
                                          value={displayLoad(
                                            set.weight,
                                            state.user.unit,
                                          )}
                                          onChange={(event) =>
                                            updateExercise(exerciseIndex, {
                                              sets: exercise.sets.map(
                                                (item, index) =>
                                                  index === setIndex
                                                    ? {
                                                        ...item,
                                                        weight: storageLoad(
                                                          Number(
                                                            event.target.value,
                                                          ),
                                                          state.user.unit,
                                                        ),
                                                      }
                                                    : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <input
                                          className="input"
                                          aria-label={`${exercise.name} set ${setIndex + 1} rest seconds`}
                                          type="number"
                                          min={0}
                                          max={3600}
                                          step={5}
                                          value={set.restSeconds}
                                          onChange={(event) =>
                                            updateExercise(exerciseIndex, {
                                              sets: exercise.sets.map(
                                                (item, index) =>
                                                  index === setIndex
                                                    ? {
                                                        ...item,
                                                        restSeconds: Number(
                                                          event.target.value,
                                                        ),
                                                      }
                                                    : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <input
                                          className="input"
                                          aria-label={`${exercise.name} set ${setIndex + 1} duration seconds`}
                                          type="number"
                                          min={0}
                                          max={14400}
                                          step={1}
                                          placeholder="—"
                                          value={set.durationSeconds || ''}
                                          onChange={(event) =>
                                            updateExercise(exerciseIndex, {
                                              sets: exercise.sets.map(
                                                (item, index) =>
                                                  index === setIndex
                                                    ? {
                                                        ...item,
                                                        durationSeconds: event
                                                          .target.value
                                                          ? Number(
                                                              event.target
                                                                .value,
                                                            )
                                                          : undefined,
                                                      }
                                                    : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <input
                                          aria-label={`${exercise.name} set ${setIndex + 1} warm-up`}
                                          type="checkbox"
                                          checked={!!set.isWarmup}
                                          onChange={(event) =>
                                            updateExercise(exerciseIndex, {
                                              sets: exercise.sets.map(
                                                (item, index) =>
                                                  index === setIndex
                                                    ? {
                                                        ...item,
                                                        isWarmup:
                                                          event.target.checked,
                                                      }
                                                    : item,
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className="program-remove-set"
                                          aria-label={`Remove ${exercise.name} set ${setIndex + 1}`}
                                          disabled={exercise.sets.length === 1}
                                          onClick={() =>
                                            updateExercise(exerciseIndex, {
                                              sets: exercise.sets.filter(
                                                (_, index) =>
                                                  index !== setIndex,
                                              ),
                                            })
                                          }
                                        >
                                          ×
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <Button
                              variant="ghost"
                              disabled={exercise.sets.length >= 20}
                              onClick={() =>
                                updateExercise(exerciseIndex, {
                                  sets: [
                                    ...exercise.sets,
                                    {
                                      ...(exercise.sets[
                                        exercise.sets.length - 1
                                      ] || {
                                        reps: 10,
                                        weight: 0,
                                        restSeconds: 60,
                                      }),
                                      isWarmup: false,
                                    },
                                  ],
                                })
                              }
                            >
                              Add set
                            </Button>
                          </section>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="program-editor-footer">
            <p className="small muted">
              {original
                ? 'Changes apply to future assignments. Existing sessions and workout history are preserved.'
                : 'Save your program, then map each routine to its own training days.'}
            </p>
            <div className="actions">
              <Button variant="secondary" disabled={busy} onClick={onClose}>
                Close & keep draft
              </Button>
              <Button busy={busy} onClick={() => void save()}>
                Save program
              </Button>
            </div>
          </div>
        </fieldset>
        {removal && (
          <ConfirmDialog
            title={
              removal.exerciseIndex === undefined
                ? 'Remove this routine?'
                : 'Remove this exercise?'
            }
            description="This removes it from your current draft. Changes take effect after saving. Existing scheduled snapshots and completed workout history are kept."
            onClose={() => setRemoval(null)}
            onConfirm={removeItem}
          />
        )}
      </div>
    </Modal>
  );
}

function ExerciseLibrary({
  exercises,
  onAdd,
}: {
  exercises: ExerciseDefinition[];
  onAdd: (exercise: ExerciseDefinition) => void;
}) {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState('all');
  const [muscle, setMuscle] = useState('all');
  const equipmentOptions = [
    ...new Set(exercises.map((exercise) => exercise.equipment)),
  ].sort();
  const muscleOptions = [
    ...new Set(exercises.flatMap((exercise) => exercise.muscles)),
  ].sort();
  const filtered = exercises.filter(
    (exercise) =>
      `${exercise.name} ${exercise.muscles.join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (equipment === 'all' || equipment === exercise.equipment) &&
      (muscle === 'all' || exercise.muscles.includes(muscle)),
  );
  return (
    <div className="program-exercise-library">
      <div className="row-between">
        <h4>Exercise library</h4>
        <Badge>{filtered.length} movements</Badge>
      </div>
      <Field label="Search exercises">
        <input
          className="input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by exercise or muscle…"
        />
      </Field>
      <div className="form-grid">
        <Field label="Equipment filter">
          <select
            className="select"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
          >
            <option value="all">All equipment</option>
            {equipmentOptions.map((item) => (
              <option value={item} key={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Muscle group">
          <select
            className="select"
            value={muscle}
            onChange={(event) => setMuscle(event.target.value)}
          >
            <option value="all">All muscles</option>
            {muscleOptions.map((item) => (
              <option value={item} key={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="program-library-results">
        {filtered.length ? (
          filtered.map((exercise) => (
            <div className="program-library-result" key={exercise.id}>
              <div>
                <strong>{exercise.name}</strong>
                <p className="small muted program-capitalize">
                  {exercise.muscles.join(' · ')} ·{' '}
                  {exercise.equipment.replaceAll('_', ' ')}
                </p>
                <details>
                  <summary className="small">Movement guide</summary>
                  <p className="small muted">{exercise.instructions}</p>
                </details>
              </div>
              <Button
                variant="secondary"
                aria-label={`Add ${exercise.name}`}
                onClick={() => onAdd(exercise)}
              >
                Add
              </Button>
            </div>
          ))
        ) : (
          <p className="muted">
            No movements match. Try another search or filter.
          </p>
        )}
      </div>
    </div>
  );
}

function ProgramContents({
  program,
  state,
}: Pick<PageProps, 'state'> & { program: Program }) {
  return (
    <div className="stack">
      <div>
        <div className="row">
          <Badge tone="green">{sourceName(program)}</Badge>
          <Badge>{program.difficulty}</Badge>
          <Badge>{program.visibility}</Badge>
        </div>
        <h2>{program.title || 'Untitled program'}</h2>
        <p className="muted">{program.description || 'No description yet.'}</p>
      </div>
      {program.routines.map((routine, index) => (
        <section className="program-preview-routine" key={routine.id}>
          <div className="row-between">
            <h3>
              <span className="muted">
                {String(index + 1).padStart(2, '0')}
              </span>{' '}
              {routine.name}
            </h3>
            <span className="muted small">
              {routine.durationMinutes} min · {routine.exercises.length}{' '}
              exercises
            </span>
          </div>
          {routine.exercises.map((exercise, exerciseIndex) => {
            const definition = state.exercises.find(
              (entry) => entry.id === exercise.exerciseId,
            );
            return (
              <div
                className="program-preview-exercise"
                key={`${exercise.exerciseId}:${exerciseIndex}`}
              >
                <div className="row-between">
                  <strong>{exercise.name}</strong>
                  {exercise.group && (
                    <Badge tone="blue">{exercise.group}</Badge>
                  )}
                </div>
                <div className="program-prescription-list">
                  {exercise.sets.map((set, setIndex) => (
                    <span
                      className={`program-prescription ${set.isWarmup ? 'is-warmup' : ''}`}
                      key={setIndex}
                    >
                      {set.isWarmup ? 'Warm-up' : `Set ${setIndex + 1}`}:{' '}
                      {set.durationSeconds
                        ? `${set.durationSeconds}s`
                        : `${set.reps} reps`}{' '}
                      ·{' '}
                      {set.weight
                        ? `${displayLoad(set.weight, state.user.unit)} ${state.user.unit}`
                        : 'bodyweight / no load'}{' '}
                      · {set.restSeconds}s rest
                    </span>
                  ))}
                </div>
                {definition && (
                  <details>
                    <summary className="small muted">
                      Exercise instructions
                    </summary>
                    <p className="small muted">{definition.instructions}</p>
                  </details>
                )}
              </div>
            );
          })}
          {!routine.exercises.length && (
            <p className="muted small">No exercises added yet.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function ProgramDetail({
  program,
  state,
  run,
  toast,
  onClose,
  onEdit,
  onSchedule,
}: PageProps & {
  program: Program;
  onClose: () => void;
  onEdit?: () => void;
  onSchedule?: () => void;
}) {
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isConnectedMember = state.relationships.some(
    (link) =>
      link.status === 'active' &&
      link.trainerId === state.user.id &&
      link.memberId === program.ownerId,
  );
  const canEndorse =
    state.user.role === 'trainer' &&
    program.source === 'ai' &&
    isConnectedMember &&
    program.visibility === 'shared';
  const endorsed =
    program.endorsedBy === state.user.id &&
    program.endorsedRevision === program.revision;
  useEffect(() => {
    setReviewed([]);
    setError('');
  }, [program.id, program.revision]);
  async function endorse() {
    if (busy || reviewed.length !== program.routines.length) return;
    setBusy(true);
    setError('');
    try {
      await run({ type: 'endorse_program', id: program.id });
      toast('This program version is marked as reviewed.');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Program details" wide onClose={onClose}>
      <div className="stack">
        <ProgramContents program={program} state={state} />
        <p className="small muted">
          Version {program.revision}. Scheduling creates a separate snapshot of
          each routine. Later edits or deletions do not rewrite workout history.
        </p>
        {program.source === 'ai' && (
          <p className="program-info-note">
            Local plan preview: this program started from a rule-based template.
            Hosted AI is not connected. Review the exercise choices and loads
            before training.
          </p>
        )}
        {canEndorse && (
          <section className="program-review-box">
            <h3>Trainer review</h3>
            {endorsed ? (
              <Badge tone="green">You reviewed this version</Badge>
            ) : (
              <>
                <p className="small muted">
                  Review every routine, including exercise choices, loads, rest
                  and suitability for your client. An edit requires a fresh
                  review.
                </p>
                {program.routines.map((routine) => (
                  <label className="program-checkbox" key={routine.id}>
                    <input
                      type="checkbox"
                      checked={reviewed.includes(routine.id)}
                      onChange={(event) =>
                        setReviewed((previous) =>
                          event.target.checked
                            ? [...previous, routine.id]
                            : previous.filter((id) => id !== routine.id),
                        )
                      }
                    />
                    <span>I reviewed {routine.name}</span>
                  </label>
                ))}
                <Button
                  variant="secondary"
                  busy={busy}
                  disabled={reviewed.length !== program.routines.length}
                  onClick={() => void endorse()}
                >
                  Mark reviewed by trainer
                </Button>
              </>
            )}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
          </section>
        )}
        <div className="actions">
          {onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              Edit program
            </Button>
          )}
          {onSchedule && (
            <Button onClick={onSchedule}>
              {state.user.role === 'trainer'
                ? 'Assign to client'
                : 'Schedule program'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignmentModal({
  program,
  state,
  run,
  toast,
  onClose,
}: PageProps & { program: Program; onClose: () => void }) {
  const clientIds = state.relationships
    .filter(
      (link) => link.status === 'active' && link.trainerId === state.user.id,
    )
    .map((link) => link.memberId);
  const clients = state.users.filter((person) => clientIds.includes(person.id));
  const [memberId, setMemberId] = useState(
    state.user.role === 'member' ? state.user.id : clients[0]?.id || '',
  );
  const [startDate, setStartDate] = useState(localDate());
  const [weeks, setWeeks] = useState(4);
  const [mapping, setMapping] = useState<DayMapping[]>([]);
  const [note, setNote] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [operationId] = useState(() => crypto.randomUUID());
  const submitting = useRef(false);
  const preview = schedulePreview(startDate, weeks, mapping);
  const conflicts = preview.filter((entry) =>
    state.occurrences.some(
      (occurrence) =>
        occurrence.memberId === memberId &&
        occurrence.date === entry.date &&
        occurrence.status !== 'cancelled' &&
        occurrence.status !== 'skipped',
    ),
  );
  const duplicateConflicts = preview.filter((entry) =>
    state.occurrences.some(
      (occurrence) =>
        occurrence.memberId === memberId &&
        occurrence.date === entry.date &&
        occurrence.routine.id === entry.routineId &&
        ['planned', 'in_progress'].includes(occurrence.status),
    ),
  );
  const routineName = (id: string) =>
    program.routines.find((routine) => routine.id === id)?.name || 'Routine';
  const mappedIds = new Set(mapping.map((item) => item.routineId));
  const unmapped = program.routines.filter(
    (routine) => !mappedIds.has(routine.id),
  );

  function setDay(day: number, routineId: string) {
    setMapping((previous) => [
      ...previous.filter((entry) => entry.day !== day),
      ...(routineId ? [{ day, routineId }] : []),
    ]);
    setAcknowledge(false);
  }
  async function assign() {
    if (submitting.current) return;
    if (!memberId) {
      setError('Select an active client before assigning a program.');
      return;
    }
    if (!mapping.length || !preview.length) {
      setError(
        'Choose a valid start date, number of weeks, and at least one training day.',
      );
      return;
    }
    if (startDate < localDate()) {
      setError('Choose today or a future start date.');
      return;
    }
    if (duplicateConflicts.length) {
      setError(
        'The same routine is already scheduled on these dates. Change the start date or weekly mapping to avoid duplicate sessions.',
      );
      return;
    }
    if (conflicts.length && !acknowledge) {
      setError(
        'Review the existing sessions and confirm the overlapping training dates.',
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await run({
        type: 'assign_program',
        programId: program.id,
        memberId,
        startDate,
        weeks,
        mapping,
        note: note.trim(),
        operationId,
      });
      toast(
        `${preview.length} sessions scheduled. Each routine keeps its own days.`,
      );
      onClose();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        state.user.role === 'trainer'
          ? 'Assign a program'
          : 'Schedule your program'
      }
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="stack">
        <div className="row-between">
          <div>
            <h3>{program.title}</h3>
            <p className="small muted">
              Map a routine to each training day. Rest days stay open.
            </p>
          </div>
          <Badge tone="green">Version {program.revision}</Badge>
        </div>
        {state.user.role === 'trainer' && (
          <Field label="Client">
            <select
              className="select"
              value={memberId}
              disabled={busy}
              onChange={(event) => {
                setMemberId(event.target.value);
                setAcknowledge(false);
              }}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {!clients.length && (
              <p className="error-text">
                Connect with a client and have them accept your request before
                assigning a program.
              </p>
            )}
          </Field>
        )}
        <div className="form-grid">
          <Field label="Start date">
            <input
              className="input"
              type="date"
              min={localDate()}
              value={startDate}
              disabled={busy}
              onChange={(event) => {
                setStartDate(event.target.value);
                setAcknowledge(false);
              }}
            />
          </Field>
          <Field label="Number of weeks">
            <input
              className="input"
              type="number"
              min={1}
              max={52}
              step={1}
              value={weeks}
              disabled={busy}
              onChange={(event) => {
                setWeeks(Number(event.target.value));
                setAcknowledge(false);
              }}
            />
          </Field>
        </div>
        <div className="program-day-mapping">
          {DISPLAY_DAYS.map((day) => (
            <Field key={day} label={WEEKDAYS[day]}>
              <select
                className="select"
                value={
                  mapping.find((entry) => entry.day === day)?.routineId || ''
                }
                disabled={busy}
                onChange={(event) => setDay(day, event.target.value)}
              >
                <option value="">Rest day</option>
                {program.routines.map((routine) => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
        {mapping.length > 0 && unmapped.length > 0 && (
          <p className="program-info-note">
            Not scheduled: {unmapped.map((routine) => routine.name).join(', ')}.
            These routines remain in the program for later.
          </p>
        )}
        <Field label="Coaching note (optional)">
          <textarea
            className="textarea"
            rows={2}
            maxLength={2000}
            value={note}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
            placeholder="A focus or reminder for this block…"
          />
        </Field>
        <section className="program-schedule-preview">
          <div className="row-between">
            <h3>Schedule preview</h3>
            <Badge tone="green">{preview.length} sessions</Badge>
          </div>
          {preview.length ? (
            <>
              <p className="small muted">
                {displayDate(preview[0].date)} –{' '}
                {displayDate(preview[preview.length - 1].date)} ·{' '}
                {mapping.length} training{' '}
                {mapping.length === 1 ? 'day' : 'days'} per week
              </p>
              <div className="program-preview-dates">
                {preview.slice(0, 21).map((entry) => (
                  <div className="program-preview-date" key={entry.date}>
                    <span>{displayDate(entry.date)}</span>
                    <strong>{routineName(entry.routineId)}</strong>
                    {conflicts.some(
                      (conflict) => conflict.date === entry.date,
                    ) && <Badge tone="amber">Existing session</Badge>}
                  </div>
                ))}
              </div>
              {preview.length > 21 && (
                <p className="small muted">
                  And {preview.length - 21} further sessions on the same weekly
                  pattern.
                </p>
              )}
            </>
          ) : (
            <p className="muted small">
              Choose at least one training day to see your dates.
            </p>
          )}
        </section>
        {conflicts.length > 0 && (
          <div className="program-conflict-note">
            <strong>
              {conflicts.length}{' '}
              {conflicts.length === 1
                ? 'date already has'
                : 'dates already have'}{' '}
              a scheduled session.
            </strong>
            <p className="small">
              Existing workouts will be kept. You can adjust the days above or
              allow more than one session on those dates.
            </p>
            <label className="program-checkbox">
              <input
                type="checkbox"
                checked={acknowledge}
                disabled={busy}
                onChange={(event) => setAcknowledge(event.target.checked)}
              />
              <span>Keep both sessions on the overlapping dates</span>
            </label>
          </div>
        )}
        {duplicateConflicts.length > 0 && (
          <p className="error-text" role="alert">
            The same routine is already scheduled on {duplicateConflicts.length}{' '}
            of these dates. Change the start date or day mapping to avoid
            duplicate sessions.
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="program-editor-footer">
          <p className="small muted">
            Completing one session leaves the rest of this schedule in place.
          </p>
          <div className="actions">
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              busy={busy}
              disabled={
                !memberId ||
                !preview.length ||
                duplicateConflicts.length > 0 ||
                (conflicts.length > 0 && !acknowledge)
              }
              onClick={() => void assign()}
            >
              Confirm schedule
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function StudioPage(props: PageProps) {
  const { state, navigate, toast } = props;
  const [goal, setGoal] = useState(
    state.user.goal || 'Build strength and consistency',
  );
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(45);
  const [difficulty, setDifficulty] = useState<GenerationRequest['difficulty']>(
    state.user.experience,
  );
  const availableEquipment = EQUIPMENT;
  const [equipment, setEquipment] = useState<string[]>(() =>
    normalizeProfileEquipment(state.user.equipment),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<Program | null>(null);
  const [editor, setEditor] = useState<Program | null>(null);
  const [replaceDraft, setReplaceDraft] = useState(false);
  const requestOwner = useRef(state.user.id);
  requestOwner.current = state.user.id;

  useEffect(() => {
    setGenerated(null);
    setEditor(null);
    setError('');
  }, [state.user.id]);

  async function generate() {
    if (busy) return;
    if (!goal.trim()) {
      setError('Describe your training goal.');
      return;
    }
    if (!equipment.length) {
      setError(
        'Choose available equipment, including bodyweight if you train without weights.',
      );
      return;
    }
    const owner = state.user.id;
    setBusy(true);
    setError('');
    try {
      const result = await generatePlan({
        goal: goal.trim(),
        days,
        minutes,
        difficulty,
        equipment,
      });
      if (requestOwner.current !== owner) return;
      if (result.provider !== 'local-template')
        throw new Error(
          'The plan provider was not recognized. Please try again.',
        );
      setGenerated({
        ...result.program,
        ownerId: owner,
        visibility: 'private',
        source: 'ai',
      });
      toast(
        'Local plan preview is ready. Review and customize it before saving.',
      );
    } catch (failure) {
      if (requestOwner.current === owner) setError(errorText(failure));
    } finally {
      if (requestOwner.current === owner) setBusy(false);
    }
  }
  function editGenerated() {
    if (!generated) return;
    const existingDraft = readDraft(state.user.id);
    if (existingDraft && existingDraft.id !== generated.id) {
      setReplaceDraft(true);
      return;
    }
    setEditor(existingDraft || generated);
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="A starting point, shaped by you"
        title="Plan studio"
        description="Turn your training preferences into a practical first draft. Review each movement, adjust the details, and make it your own."
        actions={
          <Button variant="secondary" onClick={() => navigate('plans')}>
            My programs
          </Button>
        }
      />
      <div className="program-studio-layout">
        <div className="stack">
          <Card className="program-studio-form">
            <div className="row-between">
              <h2>Your training brief</h2>
              <Badge tone="blue">Local plan preview</Badge>
            </div>
            <p className="muted small">
              This preview uses a local exercise template. Hosted AI is not
              connected. All local planning features are available without a
              purchase.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void generate();
              }}
              className="stack"
            >
              <Field label="Training goal">
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={500}
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="e.g. Build full-body strength with three consistent sessions a week"
                />
              </Field>
              <div className="form-grid">
                <Field label="Days per week">
                  <select
                    className="select"
                    value={days}
                    onChange={(event) => setDays(Number(event.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map((number) => (
                      <option value={number} key={number}>
                        {number} {number === 1 ? 'day' : 'days'}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Session length">
                  <select
                    className="select"
                    value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value))}
                  >
                    {[20, 30, 45, 60, 75, 90].map((number) => (
                      <option value={number} key={number}>
                        {number} minutes
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Training experience">
                <select
                  className="select"
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value as GenerationRequest['difficulty'],
                    )
                  }
                >
                  <option value="beginner">
                    Beginner — building the habit
                  </option>
                  <option value="intermediate">
                    Intermediate — training consistently
                  </option>
                  <option value="advanced">
                    Advanced — experienced lifter
                  </option>
                </select>
              </Field>
              <fieldset className="program-equipment-fieldset">
                <legend>Available equipment</legend>
                <div className="program-equipment-options">
                  {availableEquipment.map((item) => (
                    <label
                      className={`program-equipment-chip ${equipment.includes(item) ? 'is-selected' : ''}`}
                      key={item}
                    >
                      <input
                        type="checkbox"
                        checked={equipment.includes(item)}
                        onChange={(event) =>
                          setEquipment((previous) =>
                            event.target.checked
                              ? [...previous, item]
                              : previous.filter((entry) => entry !== item),
                          )
                        }
                      />
                      <span className="program-capitalize">
                        {item.replaceAll('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" busy={busy}>
                {generated
                  ? 'Create another preview'
                  : 'Create local plan preview'}
              </Button>
            </form>
          </Card>
          <div className="program-info-note">
            <strong>You decide the final plan.</strong>
            <p>
              Templates start with zero external load so you can choose a
              suitable weight. Use the editor to adjust sets, reps, rest and
              exercise choices. Share the saved program with your trainer for a
              review.
            </p>
          </div>
        </div>
        <div className="program-studio-output">
          {generated ? (
            <Card className="program-generated-plan">
              <div className="row-between">
                <div>
                  <p className="eyebrow">Your first draft</p>
                  <h2>{generated.title}</h2>
                </div>
                <Badge tone="green">Ready to customize</Badge>
              </div>
              <p className="muted">{generated.description}</p>
              <div className="program-studio-metrics">
                <div>
                  <strong>{generated.routines.length}</strong>
                  <span>training days</span>
                </div>
                <div>
                  <strong>
                    {generated.routines[0]?.durationMinutes || minutes}
                  </strong>
                  <span>minutes / session</span>
                </div>
                <div>
                  <strong>
                    {generated.routines.reduce(
                      (total, routine) => total + routine.exercises.length,
                      0,
                    )}
                  </strong>
                  <span>movements</span>
                </div>
              </div>
              <div className="stack">
                {generated.routines.map((routine, index) => (
                  <div className="program-generated-routine" key={routine.id}>
                    <span className="program-routine-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3>{routine.name}</h3>
                      <p className="small muted">
                        {routine.exercises
                          .map((exercise) => exercise.name)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="small muted">
                Preview only — nothing has been added to your library or
                schedule yet.
              </p>
              <Button onClick={editGenerated}>Customize & save plan</Button>
            </Card>
          ) : (
            <div className="program-studio-empty">
              <div className="program-studio-symbol" aria-hidden="true">
                ✳
              </div>
              <p className="eyebrow">Build a rhythm that lasts</p>
              <h2>
                Your next chapter
                <br />
                starts with a plan.
              </h2>
              <p className="muted">
                Choose your days, equipment and training goal. Your editable
                preview will appear here.
              </p>
              <div className="program-studio-steps">
                <span>01 Set your direction</span>
                <span>02 Review your movements</span>
                <span>03 Make room for progress</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {editor && (
        <ProgramEditor
          key={`${state.user.id}:${editor.id}`}
          {...props}
          initial={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setGenerated(null);
            navigate('plans');
          }}
        />
      )}
      {replaceDraft && (
        <ConfirmDialog
          title="Replace your saved draft?"
          description="You have an unfinished program in this browser. Opening this preview in the editor replaces that draft. Saved programs are unaffected."
          onClose={() => setReplaceDraft(false)}
          onConfirm={() => {
            localStorage.removeItem(draftKey(state.user.id));
            setEditor(generated);
            setReplaceDraft(false);
          }}
        />
      )}
    </div>
  );
}
