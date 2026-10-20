import React, { useMemo, useState } from 'react';
import {
  Action,
  Assignment,
  Occurrence,
  PageProps,
  Person,
  Relationship,
  WebState,
  Workout,
} from './types';
import {
  Avatar,
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
import './Trainer.css';

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function calendarDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(value: string): string {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  );
}

function periodStart(today: string): string {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - 13);
  return calendarDate(date);
}

function adherence(occurrences: Occurrence[], today: string) {
  const start = periodStart(today);
  const period = occurrences.filter(
    (item) =>
      item.date >= start && item.date <= today && item.status !== 'cancelled',
  );
  const completed = period.filter((item) => item.status === 'completed').length;
  const missed = period.filter(
    (item) => item.date < today && item.status !== 'completed',
  ).length;
  const total = completed + missed;
  return {
    completed,
    missed,
    total,
    percent: total ? Math.round((completed / total) * 100) : null,
  };
}

function personFor(state: WebState, id: string): Person | undefined {
  return state.users.find((person) => person.id === id);
}

function canReview(workout: Workout, state: WebState): boolean {
  const occurrence = state.occurrences.find(
    (item) => item.id === workout.occurrenceId,
  );
  return (
    (!occurrence?.trainerId || occurrence.trainerId === state.user.id) &&
    (!workout.review || workout.review.trainerId === state.user.id)
  );
}

function feedbackLabel(workout: Workout, state: WebState): string {
  if (workout.review)
    return workout.review.trainerId === state.user.id
      ? 'Reviewed by you'
      : 'Reviewed by another coach';
  return canReview(workout, state)
    ? 'Needs your review'
    : 'Assigned by another coach';
}

function isActionableSession(occurrence: Occurrence, state: WebState): boolean {
  return (
    occurrence.status === 'in_progress' ||
    (occurrence.status === 'planned' &&
      state.assignments.some(
        (assignment) =>
          assignment.id === occurrence.assignmentId && assignment.active,
      ))
  );
}

function useAction(props: PageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function perform(action: Action, message: string): Promise<boolean> {
    setBusy(true);
    setError('');
    try {
      await props.run(action);
      props.toast(message, 'success');
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The change could not be saved. Please try again.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, perform };
}

function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="error-text" role="alert">
      {message}
    </p>
  ) : null;
}

function RelationshipBadge({ relationship }: { relationship: Relationship }) {
  const status = relationship.status;
  return (
    <Badge
      tone={
        status === 'active' ? 'green' : status === 'pending' ? 'amber' : 'muted'
      }
    >
      {status === 'revoked'
        ? 'Access ended'
        : status === 'declined'
          ? 'Declined'
          : status === 'pending'
            ? 'Pending consent'
            : 'Active'}
    </Badge>
  );
}

function PersonLabel({
  person,
  subtitle,
}: {
  person?: Person;
  subtitle?: string;
}) {
  const name = person?.name || 'Member';
  return (
    <div className="row trainer-person">
      <Avatar name={name} />
      <div>
        <strong>{name}</strong>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </div>
    </div>
  );
}

function WorkoutDetail({
  workout,
  ...props
}: PageProps & { workout: Workout }) {
  const [feedback, setFeedback] = useState(workout.review?.text || '');
  const { busy, error, perform } = useAction(props);
  const completedSets = workout.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => set.completed).length,
    0,
  );
  const totalSets = workout.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
  const member = personFor(props.state, workout.userId);
  const eligible = canReview(workout, props.state);
  const displayUnit = member?.unit || 'kg';
  const weight = (kg: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
      displayUnit === 'lb' ? kg * 2.2046226218 : kg,
    );
  return (
    <div className="page-stack trainer-workout-detail">
      <div className="row-between trainer-wrap">
        <div>
          <h3>{workout.routineName}</h3>
          <p className="muted small">
            {workout.programTitle} · {dateLabel(workout.date)}
          </p>
        </div>
        <Badge tone={workout.review ? 'green' : eligible ? 'amber' : 'muted'}>
          {feedbackLabel(workout, props.state)}
        </Badge>
      </div>
      <div className="grid-3">
        <Stat
          label="Recorded time"
          value={`${Math.round(workout.durationSeconds / 60)} min`}
        />
        <Stat label="Completed sets" value={`${completedSets}/${totalSets}`} />
        <Stat
          label="Effort"
          value={
            workout.reflection.effort
              ? `${workout.reflection.effort}/10`
              : 'Not recorded'
          }
        />
      </div>
      <div className="trainer-note-block">
        <h4>Member reflection</h4>
        <p className="trainer-preserve">
          {workout.reflection.notes || 'No reflection was added.'}
        </p>
      </div>
      {workout.exercises.map((exercise, exerciseIndex) => (
        <section
          className="trainer-exercise"
          key={`${exercise.exerciseId}-${exerciseIndex}`}
        >
          <h4>
            {exercise.name}
            {exercise.group ? (
              <span className="muted small"> · {exercise.group}</span>
            ) : null}
          </h4>
          <div className="table-wrap">
            <table className="trainer-table">
              <caption className="trainer-sr-only">
                Recorded sets for {exercise.name}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Set</th>
                  <th scope="col">Reps / time</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Rest</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set, index) => (
                  <tr key={index}>
                    <th scope="row">
                      {index + 1}
                      {set.isWarmup ? ' · warm-up' : ''}
                    </th>
                    <td>
                      {set.durationSeconds
                        ? `${set.durationSeconds}s`
                        : `${set.reps} reps`}
                    </td>
                    <td>
                      {weight(set.weight)} {displayUnit}
                    </td>
                    <td>{set.restSeconds}s</td>
                    <td>
                      <Badge tone={set.completed ? 'green' : 'muted'}>
                        {set.completed ? 'Done' : 'Not completed'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {eligible ? (
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await perform(
              { type: 'review_workout', id: workout.id, text: feedback.trim() },
              workout.review
                ? 'Coaching feedback updated.'
                : 'Coaching feedback sent to the member.',
            );
          }}
        >
          <Field
            label="Coaching feedback"
            hint="Visible to this member in their workout journal. Include a useful observation and the next adjustment."
          >
            <textarea
              className="textarea"
              required
              maxLength={4000}
              value={feedback}
              rows={4}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Your last squat set looked challenging in the log. Keep the same weight next time and aim for one more controlled rep."
            />
          </Field>
          {workout.review && (
            <p className="muted small">
              Last feedback:{' '}
              {new Date(workout.review.createdAt).toLocaleString()}
            </p>
          )}
          <ErrorMessage message={error} />
          <div className="actions">
            <Button
              type="submit"
              busy={busy}
              disabled={busy || !feedback.trim()}
            >
              {workout.review ? 'Update feedback' : 'Send feedback'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="trainer-note-block">
          <h4>
            {workout.review
              ? `Feedback from ${personFor(props.state, workout.review.trainerId)?.name || 'another coach'}`
              : 'Assigned by another coach'}
          </h4>
          {workout.review && (
            <p className="trainer-preserve">{workout.review.text}</p>
          )}
          <p className="muted small">
            {workout.review
              ? 'This feedback belongs to another coach and is preserved here for context.'
              : 'Only the coach who assigned this session can add its workout review. You can discuss the training with your member in messages.'}
          </p>
        </div>
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  ...props
}: PageProps & { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, perform } = useAction(props);
  return (
    <Modal title="Invite a member" onClose={onClose}>
      <form
        className="page-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            await perform(
              {
                type: 'request_link',
                memberEmail: email.trim().toLowerCase(),
                note: note.trim(),
              },
              'Invitation created. The member must accept before you can coach them.',
            )
          )
            onClose();
        }}
      >
        <p className="muted">
          Invite an existing member account in this workspace. They will see an
          in-app request and must accept before their training data is shared.
        </p>
        <Field label="Member email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="member@example.com"
            required
            maxLength={254}
          />
        </Field>
        <Field label="Personal note (optional)">
          <textarea
            className="textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Tell them how you can help with their training."
          />
        </Field>
        <p className="trainer-disclosure small">
          No email is sent in this local web edition. New members need to create
          an account here before you can invite them.
        </p>
        <ErrorMessage message={error} />
        <div className="actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" busy={busy} disabled={busy || !email.trim()}>
            Create invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignmentCard({
  assignment,
  occurrences,
  onCancel,
  busy,
  state,
}: {
  assignment: Assignment;
  occurrences: Occurrence[];
  onCancel: () => void;
  busy: boolean;
  state: WebState;
}) {
  const routineName = (id: string) =>
    occurrences.find(
      (item) => item.assignmentId === assignment.id && item.routine.id === id,
    )?.routine.name ||
    state.programs
      .find((program) => program.id === assignment.programId)
      ?.routines.find((routine) => routine.id === id)?.name ||
    'Routine snapshot';
  const completed = occurrences.filter(
    (item) =>
      item.assignmentId === assignment.id && item.status === 'completed',
  ).length;
  return (
    <div className="trainer-assignment">
      <div className="row-between trainer-wrap">
        <div>
          <h4>{assignment.programTitle}</h4>
          <p className="muted small">
            From {dateLabel(assignment.startDate)} · {assignment.weeks}{' '}
            {assignment.weeks === 1 ? 'week' : 'weeks'} · revision{' '}
            {assignment.revision}
          </p>
        </div>
        <Badge tone={assignment.active ? 'blue' : 'muted'}>
          {assignment.active ? 'Assigned' : 'Cancelled'}
        </Badge>
      </div>
      <ul className="trainer-mapping">
        {assignment.mapping.map((item, index) => (
          <li key={`${item.day}-${item.routineId}-${index}`}>
            <span>{weekdays[item.day]}</span>
            <strong>{routineName(item.routineId)}</strong>
          </li>
        ))}
      </ul>
      {assignment.note && (
        <p className="trainer-preserve muted small">{assignment.note}</p>
      )}
      <div className="row-between trainer-wrap">
        <p className="muted small">
          {completed} completed {completed === 1 ? 'session' : 'sessions'}{' '}
          preserved in the journal
        </p>
        {assignment.active && (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel future sessions
          </Button>
        )}
      </div>
    </div>
  );
}

function ClientModal({
  relationship,
  onClose,
  ...props
}: PageProps & { relationship: Relationship; onClose: () => void }) {
  const member = personFor(props.state, relationship.memberId);
  const [tab, setTab] = useState<'overview' | 'journal' | 'schedule'>(
    'overview',
  );
  const [note, setNote] = useState(relationship.trainerNote || '');
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    type: 'cancel_assignment' | 'revoke_link' | 'skip';
    id: string;
    name: string;
  } | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<string | null>(
    null,
  );
  const [newDate, setNewDate] = useState('');
  const { busy, error, perform } = useAction(props);
  const today = calendarDate();
  const workouts = props.state.workouts
    .filter((workout) => workout.userId === relationship.memberId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const occurrences = props.state.occurrences.filter(
    (item) => item.memberId === relationship.memberId,
  );
  const assignments = props.state.assignments.filter(
    (assignment) =>
      assignment.memberId === relationship.memberId &&
      assignment.trainerId === props.state.user.id,
  );
  const metrics = adherence(occurrences, today);
  const selectedWorkout = workouts.find((workout) => workout.id === workoutId);
  const schedule = occurrences
    .filter((item) => isActionableSession(item, props.state))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (relationship.status !== 'active') return null;

  async function confirmAction() {
    if (!confirmation) return;
    const action: Action =
      confirmation.type === 'skip'
        ? { type: 'change_occurrence', id: confirmation.id, status: 'skipped' }
        : { type: confirmation.type, id: confirmation.id };
    const success = await perform(
      action,
      confirmation.type === 'revoke_link'
        ? 'Coaching access ended.'
        : confirmation.type === 'skip'
          ? 'Session marked as skipped.'
          : 'Future sessions cancelled. Completed history is preserved.',
    );
    setConfirmation(null);
    if (success && confirmation.type === 'revoke_link') onClose();
  }

  return (
    <>
      <Modal title={member?.name || 'Member details'} onClose={onClose} wide>
        <div className="page-stack">
          <div className="row-between trainer-wrap">
            <PersonLabel person={member} subtitle={member?.email} />
            <RelationshipBadge relationship={relationship} />
          </div>
          <div
            className="trainer-tabs"
            role="group"
            aria-label="Member information"
          >
            {(['overview', 'journal', 'schedule'] as const).map((item) => (
              <button
                className={`chip ${tab === item ? 'chip-active' : ''}`}
                key={item}
                aria-pressed={tab === item}
                onClick={() => setTab(item)}
              >
                {item === 'overview'
                  ? 'Intake & notes'
                  : item === 'journal'
                    ? `Workout journal (${workouts.length})`
                    : 'Assignments & schedule'}
              </button>
            ))}
          </div>
          {tab === 'overview' && (
            <>
              <div className="grid-3">
                <Stat
                  label="14-day adherence"
                  value={metrics.percent === null ? '—' : `${metrics.percent}%`}
                  detail={`${metrics.completed} complete · ${metrics.missed} missed`}
                />
                <Stat
                  label="Completed workouts"
                  value={String(workouts.length)}
                  detail="Shared workout history"
                />
                <Stat
                  label="Awaiting your feedback"
                  value={String(
                    workouts.filter(
                      (workout) =>
                        !workout.review && canReview(workout, props.state),
                    ).length,
                  )}
                  detail="Sessions eligible for your review"
                />
              </div>
              <p className="muted small">
                Adherence counts completed and missed dated sessions over the
                last 14 days. Future sessions and unfinished sessions today are
                excluded; skipped past sessions count as missed.
              </p>
              <section className="trainer-intake">
                <h3>Training intake</h3>
                <dl>
                  <div>
                    <dt>Goal</dt>
                    <dd className="trainer-preserve">
                      {member?.goal || 'The member has not added a goal yet.'}
                    </dd>
                  </div>
                  <div>
                    <dt>Experience</dt>
                    <dd className="trainer-capitalize">
                      {member?.experience || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Equipment</dt>
                    <dd>
                      {member?.equipment.length
                        ? member.equipment.join(', ')
                        : 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Preferred days</dt>
                    <dd>
                      {member?.availability.length
                        ? [...member.availability]
                            .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
                            .map((day) => weekdays[day])
                            .join(', ')
                        : 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Weight unit</dt>
                    <dd>
                      {member?.unit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                    </dd>
                  </div>
                  <div>
                    <dt>About</dt>
                    <dd className="trainer-preserve">
                      {member?.bio || 'No introduction added.'}
                    </dd>
                  </div>
                </dl>
              </section>
              {relationship.note && (
                <div className="trainer-note-block">
                  <h4>Connection note</h4>
                  <p className="trainer-preserve">{relationship.note}</p>
                </div>
              )}
              <form
                className="stack"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await perform(
                    {
                      type: 'save_client_note',
                      id: relationship.id,
                      text: note.trim(),
                    },
                    'Private coaching note saved.',
                  );
                }}
              >
                <Field
                  label="Private coach note"
                  hint="Only you can see this note. Member-facing workout advice belongs in their journal feedback."
                >
                  <textarea
                    className="textarea"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={5}
                    maxLength={8000}
                    placeholder="Training preferences, progression decisions, and things to discuss at the next check-in."
                  />
                </Field>
                <div className="actions">
                  <Button
                    type="submit"
                    busy={busy}
                    disabled={busy || note === (relationship.trainerNote || '')}
                  >
                    Save private note
                  </Button>
                </div>
              </form>
              <div className="divider" />
              <div className="row-between trainer-wrap">
                <div>
                  <h4>Coaching access</h4>
                  <p className="muted small">
                    Ending this connection removes your private data access and
                    cancels your planned future sessions. Completed history is
                    preserved.
                  </p>
                </div>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    setConfirmation({
                      type: 'revoke_link',
                      id: relationship.id,
                      name: member?.name || 'this member',
                    })
                  }
                >
                  End coaching connection
                </Button>
              </div>
            </>
          )}
          {tab === 'journal' &&
            (selectedWorkout ? (
              <>
                <div>
                  <Button variant="ghost" onClick={() => setWorkoutId(null)}>
                    ← Back to workout history
                  </Button>
                </div>
                <WorkoutDetail
                  key={selectedWorkout.id}
                  {...props}
                  workout={selectedWorkout}
                />
              </>
            ) : (
              <>
                <div className="row-between trainer-wrap">
                  <h3>Completed workouts</h3>
                  <p className="muted small">
                    Actual sets, reflections, and your feedback
                  </p>
                </div>
                {workouts.length ? (
                  <div className="stack">
                    {workouts.map((workout) => (
                      <button
                        className="trainer-workout-row"
                        key={workout.id}
                        onClick={() => setWorkoutId(workout.id)}
                      >
                        <span>
                          <strong>{workout.routineName}</strong>
                          <span className="muted small trainer-block">
                            {dateLabel(workout.date)} · {workout.programTitle} ·{' '}
                            {Math.round(workout.durationSeconds / 60)} min
                          </span>
                        </span>
                        <Badge
                          tone={
                            workout.review
                              ? 'green'
                              : canReview(workout, props.state)
                                ? 'amber'
                                : 'muted'
                          }
                        >
                          {workout.review || !canReview(workout, props.state)
                            ? feedbackLabel(workout, props.state)
                            : 'Review workout'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No completed workouts yet"
                    description="When this member finishes a session, the recorded sets and reflection appear here for your review."
                    action={
                      <Button
                        onClick={() => {
                          onClose();
                          props.navigate('plans');
                        }}
                      >
                        Assign a program
                      </Button>
                    }
                  />
                )}
              </>
            ))}
          {tab === 'schedule' && (
            <>
              <div className="row-between trainer-wrap">
                <div>
                  <h3>Program assignments</h3>
                  <p className="muted small">
                    Routine snapshots stay attached to their dated sessions.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    onClose();
                    props.navigate('plans');
                  }}
                >
                  Assign a program
                </Button>
              </div>
              {assignments.length ? (
                <div className="stack">
                  {assignments.map((assignment) => (
                    <AssignmentCard
                      key={assignment.id}
                      state={props.state}
                      assignment={assignment}
                      occurrences={occurrences}
                      busy={busy}
                      onCancel={() =>
                        setConfirmation({
                          type: 'cancel_assignment',
                          id: assignment.id,
                          name: assignment.programTitle,
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  title="No programs assigned by you"
                  description="Choose a program and map each routine to the member’s training days."
                />
              )}
              <section className="stack">
                <h3>Open sessions</h3>
                <p className="muted small">
                  Overdue sessions appear first. Only sessions you assigned can
                  be rescheduled or skipped here.
                </p>
                {schedule.length ? (
                  schedule.map((item) => (
                    <div className="trainer-session" key={item.id}>
                      <div className="row-between trainer-wrap">
                        <div>
                          <h4>{item.routine.name}</h4>
                          <p className="muted small">
                            {dateLabel(item.date)} · {item.programTitle}
                          </p>
                        </div>
                        <Badge
                          tone={
                            item.date < today
                              ? 'amber'
                              : item.status === 'in_progress'
                                ? 'blue'
                                : 'muted'
                          }
                        >
                          {item.date < today
                            ? 'Overdue'
                            : item.status === 'in_progress'
                              ? 'In progress'
                              : item.date === today
                                ? 'Today'
                                : 'Planned'}
                        </Badge>
                      </div>
                      {item.status === 'planned' &&
                        item.trainerId === props.state.user.id &&
                        (editingOccurrence === item.id ? (
                          <form
                            className="trainer-reschedule"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              if (
                                await perform(
                                  {
                                    type: 'change_occurrence',
                                    id: item.id,
                                    date: newDate,
                                  },
                                  'Session rescheduled.',
                                )
                              )
                                setEditingOccurrence(null);
                            }}
                          >
                            <Field label="New session date">
                              <input
                                className="input"
                                type="date"
                                min={today}
                                required
                                value={newDate}
                                onChange={(event) =>
                                  setNewDate(event.target.value)
                                }
                              />
                            </Field>
                            <div className="actions">
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                onClick={() => setEditingOccurrence(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                busy={busy}
                                disabled={
                                  busy || !newDate || newDate === item.date
                                }
                              >
                                Save date
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="actions">
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => {
                                setEditingOccurrence(item.id);
                                setNewDate(
                                  item.date < today ? today : item.date,
                                );
                              }}
                            >
                              Reschedule
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                setConfirmation({
                                  type: 'skip',
                                  id: item.id,
                                  name: item.routine.name,
                                })
                              }
                            >
                              Mark skipped
                            </Button>
                          </div>
                        ))}
                    </div>
                  ))
                ) : (
                  <Empty
                    title="No open sessions"
                    description="Completed workouts remain in the journal. Assign a program to schedule the next training block."
                  />
                )}
              </section>
            </>
          )}
          <ErrorMessage message={error} />
        </div>
      </Modal>
      {confirmation && (
        <ConfirmDialog
          title={
            confirmation.type === 'revoke_link'
              ? 'End this coaching connection?'
              : confirmation.type === 'skip'
                ? 'Skip this session?'
                : 'Cancel future sessions?'
          }
          description={
            confirmation.type === 'revoke_link'
              ? `You will lose access to ${confirmation.name}’s private training information, and your planned future sessions will be cancelled. Completed history and any session already in progress will remain in their account.`
              : confirmation.type === 'skip'
                ? `${confirmation.name} will be marked as skipped. Other dates in the program are unchanged.`
                : `Unfinished future sessions for ${confirmation.name} will be cancelled. Completed workouts and their recorded sets are preserved.`
          }
          onConfirm={confirmAction}
          onClose={() => setConfirmation(null)}
          busy={busy}
        />
      )}
    </>
  );
}

function PendingConnection({
  relationship,
  props,
  onWithdraw,
}: {
  relationship: Relationship;
  props: PageProps;
  onWithdraw: () => void;
}) {
  const { busy, error, perform } = useAction(props);
  const incoming = relationship.requestedBy !== props.state.user.id;
  return (
    <div className="trainer-pending">
      <div className="row-between trainer-wrap">
        <PersonLabel
          person={personFor(props.state, relationship.memberId)}
          subtitle={
            incoming
              ? 'Requested your coaching'
              : 'Waiting for member acceptance'
          }
        />
        <Badge tone="amber">
          {incoming ? 'Incoming request' : 'Invitation sent'}
        </Badge>
      </div>
      {relationship.note && (
        <p className="trainer-preserve muted">{relationship.note}</p>
      )}
      <div className="actions">
        {incoming ? (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                perform(
                  { type: 'respond_link', id: relationship.id, accept: false },
                  'Request declined.',
                )
              }
            >
              Decline
            </Button>
            <Button
              busy={busy}
              disabled={busy}
              onClick={() =>
                perform(
                  { type: 'respond_link', id: relationship.id, accept: true },
                  'Connection accepted. You can now review training and assign programs.',
                )
              }
            >
              Accept request
            </Button>
          </>
        ) : (
          <Button variant="ghost" disabled={busy} onClick={onWithdraw}>
            Withdraw invitation
          </Button>
        )}
      </div>
      <ErrorMessage message={error} />
    </div>
  );
}

export function CoachPage(props: PageProps) {
  const { state, navigate } = props;
  const [clientId, setClientId] = useState<string | null>(null);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [withdraw, setWithdraw] = useState<Relationship | null>(null);
  const { busy, error, perform } = useAction(props);
  const today = calendarDate();
  const relationships = state.relationships.filter(
    (link) => link.trainerId === state.user.id,
  );
  const active = relationships.filter((link) => link.status === 'active');
  const activeIds = new Set(active.map((link) => link.memberId));
  const pending = relationships.filter((link) => link.status === 'pending');
  const occurrences = state.occurrences.filter((item) =>
    activeIds.has(item.memberId),
  );
  const workouts = state.workouts.filter((workout) =>
    activeIds.has(workout.userId),
  );
  const metrics = adherence(occurrences, today);
  const open = occurrences
    .filter((item) => item.date <= today && isActionableSession(item, state))
    .sort((a, b) => a.date.localeCompare(b.date));
  const unreviewed = workouts
    .filter((workout) => !workout.review && canReview(workout, state))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const recent = [...workouts]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
  const selectedClient = active.find((link) => link.memberId === clientId);
  const selectedWorkout = workouts.find((workout) => workout.id === workoutId);
  return (
    <div className="page-stack trainer-page">
      <PageHeader
        eyebrow="Coach workspace"
        title={`Keep your members moving, ${state.user.name.split(' ')[0]}.`}
        description="A clear view of training commitments, completed sessions, and the next useful conversation."
        actions={
          <>
            <Button variant="secondary" onClick={() => setInvite(true)}>
              Invite a member
            </Button>
            <Button onClick={() => navigate('plans')}>Manage programs</Button>
          </>
        }
      />
      <div className="grid-4">
        <Stat
          label="Active members"
          value={String(active.length)}
          detail={`${pending.length} pending ${pending.length === 1 ? 'connection' : 'connections'}`}
        />
        <Stat
          label="14-day adherence"
          value={metrics.percent === null ? '—' : `${metrics.percent}%`}
          detail={
            metrics.total
              ? `${metrics.completed} complete · ${metrics.missed} missed`
              : 'No elapsed scheduled sessions yet'
          }
        />
        <Stat
          label="Awaiting your feedback"
          value={String(unreviewed.length)}
          detail="Completed workouts eligible for review"
        />
        <Stat
          label="Due / overdue"
          value={String(open.length)}
          detail={`${open.filter((item) => item.date === today).length} today · ${open.filter((item) => item.date < today).length} overdue`}
        />
      </div>
      <p className="muted small trainer-metric-caption">
        Adherence uses the last 14 calendar days: completed sessions ÷
        (completed + missed). Future sessions and unfinished sessions today are
        excluded. Skipped past sessions count as missed.
      </p>
      {active.length === 0 && pending.length === 0 && (
        <Card>
          <Empty
            title="Your coaching workspace starts with a connection"
            description="Invite a member who has an account, or publish your profile so members can request your coaching. Both sides agree before training information is shared."
            action={
              <div className="actions">
                <Button onClick={() => setInvite(true)}>Invite a member</Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('settings')}
                >
                  Edit public profile
                </Button>
              </div>
            }
          />
        </Card>
      )}
      <div className="grid-2 trainer-dashboard-grid">
        <Card>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Today & follow-up</p>
              <h2>Training queue</h2>
            </div>
            <Badge tone={open.length ? 'amber' : 'green'}>
              {open.length} open
            </Badge>
          </div>
          {open.length ? (
            <div className="stack">
              {open.slice(0, 8).map((item) => (
                <button
                  className="trainer-queue-row"
                  key={item.id}
                  onClick={() => setClientId(item.memberId)}
                >
                  <span>
                    <strong>
                      {personFor(state, item.memberId)?.name || 'Member'}
                    </strong>
                    <span className="trainer-block muted small">
                      {item.routine.name} · {dateLabel(item.date)}
                    </span>
                  </span>
                  <Badge tone={item.date < today ? 'amber' : 'blue'}>
                    {item.date < today
                      ? 'Overdue'
                      : item.status === 'in_progress'
                        ? 'Training'
                        : 'Today'}
                  </Badge>
                </button>
              ))}
              {open.length > 8 && (
                <p className="muted small">
                  Showing 8 of {open.length} open sessions. Open a member’s
                  schedule for every session.
                </p>
              )}
            </div>
          ) : (
            <Empty
              title="No sessions needing a follow-up"
              description="Dated assignments will appear here when they are due. Future sessions do not count as missed."
            />
          )}
        </Card>
        <Card>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Close the coaching loop</p>
              <h2>Ready for your review</h2>
            </div>
            <Badge tone="blue">{unreviewed.length}</Badge>
          </div>
          {unreviewed.length ? (
            <div className="stack">
              {unreviewed.slice(0, 6).map((workout) => (
                <button
                  className="trainer-queue-row"
                  key={workout.id}
                  onClick={() => setWorkoutId(workout.id)}
                >
                  <span>
                    <strong>
                      {personFor(state, workout.userId)?.name || 'Member'}
                    </strong>
                    <span className="trainer-block muted small">
                      {workout.routineName} · {dateLabel(workout.date)}
                    </span>
                    <span className="trainer-block small trainer-reflection-preview">
                      {workout.reflection.notes ||
                        'Open the session to review their recorded sets.'}
                    </span>
                  </span>
                  <span className="trainer-open-label">Review →</span>
                </button>
              ))}
              {unreviewed.length > 6 && (
                <p className="muted small">
                  Showing 6 of {unreviewed.length}. Additional sessions are
                  available in each member’s journal.
                </p>
              )}
            </div>
          ) : (
            <Empty
              title="Feedback is up to date"
              description="Newly completed workouts appear here with actual sets and the member’s reflection."
            />
          )}
        </Card>
      </div>
      <div className="grid-2 trainer-dashboard-grid">
        <Card>
          <div className="panel-header">
            <div>
              <p className="eyebrow">A shared commitment</p>
              <h2>Connection requests</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate('clients')}>
              All members →
            </Button>
          </div>
          {pending.length ? (
            <div className="stack">
              {pending.map((relationship) => (
                <PendingConnection
                  key={relationship.id}
                  relationship={relationship}
                  props={props}
                  onWithdraw={() => setWithdraw(relationship)}
                />
              ))}
            </div>
          ) : (
            <Empty
              title="No pending requests"
              description="Member requests and invitations will appear here. An invitation never grants access on its own."
            />
          )}
        </Card>
        <Card>
          <div className="panel-header">
            <div>
              <p className="eyebrow">The latest effort</p>
              <h2>Recent completions</h2>
            </div>
          </div>
          {recent.length ? (
            <div className="stack">
              {recent.map((workout) => (
                <button
                  className="trainer-queue-row"
                  key={workout.id}
                  onClick={() => setWorkoutId(workout.id)}
                >
                  <span>
                    <strong>{workout.routineName}</strong>
                    <span className="trainer-block muted small">
                      {personFor(state, workout.userId)?.name || 'Member'} ·{' '}
                      {dateLabel(workout.date)}
                    </span>
                  </span>
                  <Badge tone={workout.review ? 'green' : 'muted'}>
                    {feedbackLabel(workout, state)}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="The journal is ready"
              description="Your members’ completed sessions will build a shared record of their progress."
            />
          )}
        </Card>
      </div>
      <Card>
        <div className="row-between trainer-wrap">
          <div>
            <h2>Plan the next training block</h2>
            <p className="muted">
              Build routines, map the week, then use member reflections to
              adjust the next revision.
            </p>
          </div>
          <div className="actions">
            <Button variant="secondary" onClick={() => navigate('messages')}>
              Open messages
            </Button>
            <Button onClick={() => navigate('plans')}>
              Programs & assignments
            </Button>
          </div>
        </div>
      </Card>
      <ErrorMessage message={error} />
      {selectedClient && (
        <ClientModal
          key={selectedClient.id}
          {...props}
          relationship={selectedClient}
          onClose={() => setClientId(null)}
        />
      )}
      {selectedWorkout && (
        <Modal
          title={`${personFor(state, selectedWorkout.userId)?.name || 'Member'} · Workout review`}
          onClose={() => setWorkoutId(null)}
          wide
        >
          <WorkoutDetail
            key={selectedWorkout.id}
            {...props}
            workout={selectedWorkout}
          />
        </Modal>
      )}
      {invite && <InviteModal {...props} onClose={() => setInvite(false)} />}
      {withdraw && (
        <ConfirmDialog
          title="Withdraw this invitation?"
          description="The member will no longer be able to accept this coaching invitation. You can send a new invitation later."
          busy={busy}
          onClose={() => setWithdraw(null)}
          onConfirm={async () => {
            await perform(
              { type: 'revoke_link', id: withdraw.id },
              'Invitation withdrawn.',
            );
            setWithdraw(null);
          }}
        />
      )}
    </div>
  );
}

export function ClientsPage(props: PageProps) {
  const { state } = props;
  const [filter, setFilter] = useState<
    'active' | 'pending' | 'archived' | 'all'
  >('active');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [withdraw, setWithdraw] = useState<Relationship | null>(null);
  const { busy, error, perform } = useAction(props);
  const today = calendarDate();
  const relationships = useMemo(
    () =>
      state.relationships.filter((link) => link.trainerId === state.user.id),
    [state.relationships, state.user.id],
  );
  const active = relationships.filter((link) => link.status === 'active');
  const pending = relationships.filter((link) => link.status === 'pending');
  const archived = relationships.filter(
    (link) => link.status === 'revoked' || link.status === 'declined',
  );
  const visible = relationships
    .filter((relationship) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'archived'
          ? relationship.status === 'revoked' ||
            relationship.status === 'declined'
          : relationship.status === filter);
      const person = personFor(state, relationship.memberId);
      return (
        matchesFilter &&
        `${person?.name || 'Member'} ${person?.email || ''}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
    })
    .sort((a, b) =>
      (personFor(state, a.memberId)?.name || '').localeCompare(
        personFor(state, b.memberId)?.name || '',
      ),
    );
  const selected = active.find((link) => link.id === selectedId);
  const labels = {
    active: `Active (${active.length})`,
    pending: `Pending (${pending.length})`,
    archived: `Archived (${archived.length})`,
    all: `All (${relationships.length})`,
  };
  return (
    <div className="page-stack trainer-page">
      <PageHeader
        eyebrow="Your coaching relationships"
        title="Members"
        description="Get to know the person behind each training log. Review their work, plan the next session, and keep the conversation moving."
        actions={
          <Button onClick={() => setInvite(true)}>Invite a member</Button>
        }
      />
      <Card>
        <div className="trainer-roster-toolbar">
          <div
            className="trainer-tabs"
            role="group"
            aria-label="Filter coaching connections"
          >
            {(['active', 'pending', 'archived', 'all'] as const).map(
              (value) => (
                <button
                  key={value}
                  className={`chip ${filter === value ? 'chip-active' : ''}`}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {labels[value]}
                </button>
              ),
            )}
          </div>
          <label className="trainer-search">
            <span className="trainer-sr-only">
              Search members by name or email
            </span>
            <input
              className="input"
              type="search"
              placeholder="Search name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </Card>
      {visible.length ? (
        <div className="trainer-roster-grid">
          {visible.map((relationship) => {
            const member = personFor(state, relationship.memberId);
            const memberWorkouts = state.workouts.filter(
              (workout) => workout.userId === relationship.memberId,
            );
            const memberOccurrences = state.occurrences.filter(
              (item) => item.memberId === relationship.memberId,
            );
            const metrics = adherence(memberOccurrences, today);
            const latest = [...memberWorkouts].sort((a, b) =>
              b.completedAt.localeCompare(a.completedAt),
            )[0];
            return (
              <Card className="card trainer-member-card" key={relationship.id}>
                {relationship.status === 'pending' ? (
                  <PendingConnection
                    relationship={relationship}
                    props={props}
                    onWithdraw={() => setWithdraw(relationship)}
                  />
                ) : (
                  <>
                    <div className="row-between trainer-wrap">
                      <PersonLabel
                        person={member}
                        subtitle={
                          relationship.status === 'active'
                            ? member?.email
                            : `Connection ${relationship.status}`
                        }
                      />
                      <RelationshipBadge relationship={relationship} />
                    </div>
                    {relationship.status === 'active' ? (
                      <>
                        <p className="trainer-goal">
                          {member?.goal || 'No training goal added yet.'}
                        </p>
                        <dl className="trainer-mini-stats">
                          <div>
                            <dt>14-day adherence</dt>
                            <dd>
                              {metrics.percent === null
                                ? '—'
                                : `${metrics.percent}%`}
                            </dd>
                          </div>
                          <div>
                            <dt>Workouts</dt>
                            <dd>{memberWorkouts.length}</dd>
                          </div>
                          <div>
                            <dt>To review</dt>
                            <dd>
                              {
                                memberWorkouts.filter(
                                  (workout) =>
                                    !workout.review &&
                                    canReview(workout, state),
                                ).length
                              }
                            </dd>
                          </div>
                        </dl>
                        <p className="muted small">
                          {latest
                            ? `Last session: ${dateLabel(latest.date)} · ${latest.routineName}`
                            : 'No completed sessions yet.'}
                        </p>
                        <div className="actions">
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedId(relationship.id)}
                          >
                            Open member journal
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="muted small">
                        This connection is archived. Private training data is no
                        longer available through this connection. Send a new
                        invitation to reconnect with member consent.
                      </p>
                    )}
                  </>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Empty
            title={
              search
                ? 'No matching members'
                : filter === 'pending'
                  ? 'No pending connections'
                  : filter === 'archived'
                    ? 'No archived connections'
                    : 'No members here yet'
            }
            description={
              search
                ? 'Try a different name or email, or choose another connection filter.'
                : filter === 'pending'
                  ? 'Incoming member requests and outgoing invitations appear here until answered.'
                  : filter === 'archived'
                    ? 'Connections that have ended or been declined appear here.'
                    : 'Invite an existing member account. Once they accept, you can read their journal and assign training.'
            }
            action={
              !search && filter !== 'archived' ? (
                <Button onClick={() => setInvite(true)}>Invite a member</Button>
              ) : undefined
            }
          />
        </Card>
      )}
      <p className="muted small">
        Coaching is consent-based. Pending invitations do not share private
        training data. Archived connections do not grant access.
      </p>
      <ErrorMessage message={error} />
      {selected && (
        <ClientModal
          key={selected.id}
          {...props}
          relationship={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
      {invite && <InviteModal {...props} onClose={() => setInvite(false)} />}
      {withdraw && (
        <ConfirmDialog
          title="Withdraw this invitation?"
          description="The member will no longer be able to accept this invitation. You can invite them again later."
          busy={busy}
          onClose={() => setWithdraw(null)}
          onConfirm={async () => {
            await perform(
              { type: 'revoke_link', id: withdraw.id },
              'Invitation withdrawn.',
            );
            setWithdraw(null);
          }}
        />
      )}
    </div>
  );
}
