import React, { useEffect, useState } from 'react';
import { exportAccount } from './api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Modal,
  PageHeader,
} from './ui';
import type { PageProps, Person } from './types';
import './Community.css';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const equipmentOptions = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'resistance_band', label: 'Resistance bands' },
  { id: 'cable', label: 'Cable machine' },
  { id: 'machine', label: 'Machines' },
  { id: 'pull_up_bar', label: 'Pull-up bar' },
  { id: 'bench', label: 'Bench' },
];
const normalizedEquipmentName = (value: string) =>
  value.toLowerCase().replace(/[\s_-]/g, '');
const equipmentId = (value: string) =>
  equipmentOptions.find(
    (item) =>
      normalizedEquipmentName(item.id) === normalizedEquipmentName(value) ||
      normalizedEquipmentName(item.label) === normalizedEquipmentName(value),
  )?.id;
const equipmentLabel = (value: string) =>
  equipmentOptions.find((item) => item.id === equipmentId(value))?.label ??
  value;
type ProfileDraft = Pick<
  Person,
  'name' | 'bio' | 'goal' | 'experience' | 'availability' | 'unit' | 'isPublic'
> & { equipment: string; specialties: string };
type AccountModal =
  'password' | 'delete' | 'support' | 'privacy' | 'terms' | 'mobile' | null;
const draftOf = (user: Person): ProfileDraft => ({
  name: user.name,
  bio: user.bio,
  goal: user.goal,
  experience: user.experience,
  availability: [...user.availability],
  unit: user.unit,
  isPublic: user.isPublic,
  equipment: user.equipment.map(equipmentLabel).join(', '),
  specialties: user.specialties.join(', '),
});
const splitList = (value: string) => [
  ...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';

export function SettingsPage({ state, run, toast }: PageProps) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftOf(state.user));
  const [modal, setModal] = useState<AccountModal>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [supportCopied, setSupportCopied] = useState(false);
  const profileChanged =
    JSON.stringify(draft) !== JSON.stringify(draftOf(state.user));
  const trainerReviews = state.reviews
    .filter((review) => review.trainerId === state.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const averageRating = trainerReviews.length
    ? trainerReviews.reduce((total, review) => total + review.rating, 0) /
      trainerReviews.length
    : null;
  useEffect(() => {
    setDraft(draftOf(state.user));
    setError('');
    setSaved(false);
  }, [state.user.id]); // Preserve unsaved edits during background refreshes.

  function update<K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }
  function openModal(next: AccountModal) {
    setModal(next);
    setModalError('');
    setCurrentPassword('');
    setPassword('');
    setConfirmPassword('');
    setDeleteConfirmed(false);
    setSupportCopied(false);
  }
  function closeModal() {
    if (!busy) {
      setModal(null);
      setModalError('');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('Enter a name for your profile.');
      return;
    }
    const selectedEquipment = splitList(draft.equipment);
    const unsupported = selectedEquipment.filter((item) => !equipmentId(item));
    if (unsupported.length) {
      setError(
        `Choose equipment from the options below. Unrecognized equipment: ${unsupported.join(', ')}.`,
      );
      return;
    }
    const equipment = [
      ...new Set(selectedEquipment.map((item) => equipmentId(item)!)),
    ];
    setBusy('profile');
    setError('');
    try {
      const updated = await run({
        type: 'update_profile',
        updates: {
          ...draft,
          name: draft.name.trim(),
          bio: draft.bio.trim(),
          goal: draft.goal.trim(),
          equipment,
          specialties: splitList(draft.specialties),
        },
      });
      setDraft(draftOf(updated.user));
      setSaved(true);
      toast('Your profile has been saved.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  async function downloadData() {
    setBusy('export');
    setError('');
    try {
      const data = await exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ai-gym-account-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Your account export is ready. Check your downloads.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setModalError('');
    if (password !== confirmPassword) {
      setModalError('The new passwords do not match.');
      return;
    }
    if (password === currentPassword) {
      setModalError('Choose a different password from your current password.');
      return;
    }
    setBusy('password');
    try {
      await run({ type: 'change_password', currentPassword, password });
      setModal(null);
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      toast('Your password has been changed.');
    } catch (failure) {
      setModalError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    if (!deleteConfirmed) return;
    setBusy('delete');
    setModalError('');
    try {
      await run({ type: 'delete_account', password: currentPassword });
    } catch (failure) {
      setModalError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Your settings"
        description="A training space that fits you. Keep your profile and preferences up to date."
      />
      <Card>
        <div className="row-between">
          <div className="row">
            <Avatar name={state.user.name} size="lg" />
            <div>
              <h2>{state.user.name}</h2>
              <p className="muted small">{state.user.email}</p>
            </div>
          </div>
          <Badge tone="blue">
            {state.user.role === 'trainer'
              ? 'Trainer account'
              : 'Member account'}
          </Badge>
        </div>
      </Card>
      {state.user.role === 'trainer' && (
        <Card>
          <section className="stack" aria-labelledby="trainer-member-reviews">
            <div className="row-between">
              <div>
                <h2 id="trainer-member-reviews">Your member reviews</h2>
                <p className="muted small">
                  Feedback from the people you coach.
                </p>
              </div>
              {averageRating !== null && (
                <Badge tone="green">
                  {averageRating.toFixed(1)} / 5 · {trainerReviews.length}{' '}
                  {trainerReviews.length === 1 ? 'review' : 'reviews'}
                </Badge>
              )}
            </div>
            {trainerReviews.length ? (
              <div className="stack">
                {trainerReviews.map((review) => (
                  <article className="com-review" key={review.id}>
                    <div className="row-between">
                      <strong>
                        {state.users.find(
                          (person) => person.id === review.memberId,
                        )?.name ?? 'Member'}
                      </strong>
                      <span
                        className="com-stars"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </span>
                    </div>
                    <p className="com-wrap">{review.body}</p>
                    <time className="small muted" dateTime={review.createdAt}>
                      {new Date(review.createdAt).toLocaleDateString(
                        undefined,
                        { month: 'short', day: 'numeric', year: 'numeric' },
                      )}
                    </time>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Your first review is still ahead"
                description="Connected members can share a rating and written review from your trainer profile in Discover."
              />
            )}
            <p className="muted small">
              {state.user.isPublic
                ? 'These reviews appear on your public trainer profile. Members can update their own review while your connection is active.'
                : 'Your profile is currently private. Existing reviews remain here and will appear in Discover if you make your profile public.'}
            </p>
          </section>
        </Card>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <form className="stack" onSubmit={(event) => void saveProfile(event)}>
        <Card className="stack">
          <div>
            <h2>Your profile</h2>
            <p className="muted small">
              {state.user.role === 'trainer'
                ? 'Help members understand your approach to coaching.'
                : 'Give your training a little direction.'}
            </p>
          </div>
          <div className="form-grid">
            <Field label="Full name">
              <input
                className="input"
                autoComplete="name"
                value={draft.name}
                required
                maxLength={80}
                onChange={(event) => update('name', event.target.value)}
              />
            </Field>
            <Field
              label="Email"
              hint="Email changes and verification are not connected in this local preview."
            >
              <input
                className="input"
                type="email"
                value={state.user.email}
                readOnly
                aria-readonly="true"
              />
            </Field>
          </div>
          <Field
            label={
              state.user.role === 'trainer'
                ? 'About your coaching'
                : 'About you'
            }
            hint={
              state.user.role === 'trainer'
                ? 'Visible to members if your profile is public.'
                : 'Visible to your connected trainer. Avoid sensitive health details.'
            }
          >
            <textarea
              className="textarea"
              rows={3}
              maxLength={2000}
              value={draft.bio}
              onChange={(event) => update('bio', event.target.value)}
              placeholder={
                state.user.role === 'trainer'
                  ? 'Your approach, experience, and what members can expect…'
                  : 'A few words about your training journey…'
              }
            />
          </Field>
          <Field label="Training goal">
            <textarea
              className="textarea"
              rows={2}
              maxLength={500}
              value={draft.goal}
              onChange={(event) => update('goal', event.target.value)}
              placeholder="Build strength and make three sessions a week a habit"
            />
          </Field>
          <div className="form-grid">
            <Field label="Training experience">
              <select
                className="select"
                value={draft.experience}
                onChange={(event) =>
                  update(
                    'experience',
                    event.target.value as Person['experience'],
                  )
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
            <Field
              label="Weight display"
              hint="Changing units converts displayed weights and preserves your logged work."
            >
              <select
                className="select"
                value={draft.unit}
                onChange={(event) =>
                  update('unit', event.target.value as Person['unit'])
                }
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </Field>
          </div>
        </Card>
        <Card className="stack">
          <div>
            <h2>Your training setup</h2>
            <p className="muted small">
              Use these preferences when you build or generate a plan. Your
              existing schedule stays as assigned.
            </p>
          </div>
          <fieldset className="acct-fieldset">
            <legend>Preferred training days</legend>
            <div className="acct-days">
              {dayNames.map((name, day) => (
                <label
                  key={day}
                  className={`acct-day ${draft.availability.includes(day) ? 'acct-day-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={draft.availability.includes(day)}
                    onChange={(event) =>
                      update(
                        'availability',
                        event.target.checked
                          ? [...draft.availability, day].sort()
                          : draft.availability.filter((value) => value !== day),
                      )
                    }
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label="Available equipment"
            hint="Choose the options below or enter their names separated by commas. Leave blank if you are still deciding."
          >
            <input
              className="input"
              value={draft.equipment}
              maxLength={500}
              onChange={(event) => update('equipment', event.target.value)}
              placeholder="Dumbbells, Bench, Bodyweight"
            />
          </Field>
          <div className="com-tags" aria-label="Common equipment">
            {equipmentOptions.map((item) => {
              const chosen = splitList(draft.equipment).some(
                (value) => equipmentId(value) === item.id,
              );
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`chip ${chosen ? 'chip-active' : ''}`}
                  aria-pressed={chosen}
                  onClick={() => {
                    const current = splitList(draft.equipment);
                    update(
                      'equipment',
                      (chosen
                        ? current.filter(
                            (value) => equipmentId(value) !== item.id,
                          )
                        : [...current, item.label]
                      ).join(', '),
                    );
                  }}
                >
                  {chosen ? '✓ ' : '+ '}
                  {item.label}
                </button>
              );
            })}
          </div>
        </Card>
        {state.user.role === 'trainer' && (
          <Card className="stack">
            <div>
              <h2>Trainer discovery</h2>
              <p className="muted small">
                Make it easier for members to find the right fit.
              </p>
            </div>
            <Field
              label="Specialties"
              hint="Separate specialties with commas. Clear the field to remove all specialties."
            >
              <input
                className="input"
                maxLength={500}
                value={draft.specialties}
                onChange={(event) => update('specialties', event.target.value)}
                placeholder="Strength training, Mobility, Beginners"
              />
            </Field>
            <label className="com-checkbox">
              <input
                type="checkbox"
                checked={draft.isPublic}
                onChange={(event) => update('isPublic', event.target.checked)}
              />
              <span>
                <strong>Show my profile in Discover</strong>
                <span className="acct-label-detail">
                  Your name, coaching bio, specialties, and member reviews
                  become visible to signed-in members in this workspace. Your
                  email remains private to your connections.
                </span>
              </span>
            </label>
          </Card>
        )}
        <div className="acct-save-row">
          <p className="small muted" role="status">
            {saved
              ? 'All changes saved.'
              : profileChanged
                ? 'You have unsaved changes.'
                : 'Your profile is up to date.'}
          </p>
          <div className="actions">
            {profileChanged && (
              <Button
                variant="ghost"
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setDraft(draftOf(state.user));
                  setError('');
                }}
              >
                Discard changes
              </Button>
            )}
            <Button
              type="submit"
              busy={busy === 'profile'}
              disabled={busy !== null || !profileChanged || !draft.name.trim()}
            >
              Save changes
            </Button>
          </div>
        </div>
      </form>
      <div className="grid-2">
        <Card className="stack">
          <div>
            <h2>Account & privacy</h2>
            <p className="muted small">
              Manage your password and your personal data.
            </p>
          </div>
          <div className="acct-setting-row">
            <div>
              <strong>Password</strong>
              <p className="small muted">Update your sign-in password.</p>
            </div>
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => openModal('password')}
            >
              Change
            </Button>
          </div>
          <div className="acct-setting-row">
            <div>
              <strong>Export your data</strong>
              <p className="small muted">
                Download your account records as a JSON file.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={busy !== null}
              busy={busy === 'export'}
              onClick={() => void downloadData()}
            >
              Export
            </Button>
          </div>
          <div className="acct-setting-row">
            <div>
              <strong>Delete account</strong>
              <p className="small muted">
                Permanently remove this account from the workspace.
              </p>
            </div>
            <Button
              variant="danger"
              disabled={busy !== null}
              onClick={() => openModal('delete')}
            >
              Delete
            </Button>
          </div>
        </Card>
        <Card className="stack">
          <div>
            <h2>Help & information</h2>
            <p className="muted small">Know what this preview can do.</p>
          </div>
          <button
            type="button"
            className="acct-link-row"
            onClick={() => openModal('support')}
          >
            <span>Get help & report an issue</span>
            <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="acct-link-row"
            onClick={() => openModal('privacy')}
          >
            <span>Privacy & your data</span>
            <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="acct-link-row"
            onClick={() => openModal('terms')}
          >
            <span>Preview terms</span>
            <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="acct-link-row"
            onClick={() => openModal('mobile')}
          >
            <span>Mobile validation plan</span>
            <Badge tone="amber">Pending</Badge>
          </button>
        </Card>
      </div>
      <Card className="stack">
        <div className="row-between">
          <div>
            <h2>This iteration</h2>
            <p className="muted small">
              The web coaching loop runs in a local workspace. Hosting and
              device integrations are a later release.
            </p>
          </div>
          <Badge tone="amber">Local preview</Badge>
        </div>
        <div className="acct-capabilities">
          <div>
            <strong>Training, coaching & messages</strong>
            <Badge tone="green">Available locally</Badge>
          </div>
          <div>
            <strong>Plan generation</strong>
            <Badge tone="blue">Local templates</Badge>
          </div>
          <div>
            <strong>Hosted AI service</strong>
            <Badge tone="muted">Not connected</Badge>
          </div>
          <div>
            <strong>Email & account recovery</strong>
            <Badge tone="muted">Not connected</Badge>
          </div>
          <div>
            <strong>Push notifications</strong>
            <Badge tone="muted">Not connected</Badge>
          </div>
          <div>
            <strong>Billing & subscriptions</strong>
            <Badge tone="muted">Not connected</Badge>
          </div>
          <div>
            <strong>Supabase & public hosting</strong>
            <Badge tone="muted">Not connected</Badge>
          </div>
          <div>
            <strong>iOS / Android device validation</strong>
            <Badge tone="amber">Pending</Badge>
          </div>
        </div>
        <p className="muted small">
          No payments are collected. Notifications appear inside the app.
          Generated plans use local exercise templates and are labeled
          accordingly.
        </p>
      </Card>
      {modal === 'password' && (
        <Modal title="Change your password" onClose={closeModal}>
          <form
            className="stack"
            onSubmit={(event) => void changePassword(event)}
          >
            <Field label="Current password">
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                maxLength={128}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password" hint="Use 12–128 characters.">
              <input
                type="password"
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
            {modalError && (
              <p className="error-text" role="alert">
                {modalError}
              </p>
            )}
            <div className="actions">
              <Button
                type="submit"
                busy={busy === 'password'}
                disabled={busy !== null}
              >
                Update password
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy !== null}
                onClick={closeModal}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="Delete your account?" onClose={closeModal}>
          <form
            className="stack"
            onSubmit={(event) => void deleteAccount(event)}
          >
            <p>
              This permanently removes your account and its personal records
              from this local workspace. Your coaching connections will end. You
              will be signed out.
            </p>
            <p className="muted small">
              Download an export from Settings first if you want a copy. This
              action cannot be undone.
            </p>
            <Field label="Confirm your password">
              <input
                type="password"
                className="input"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                maxLength={128}
              />
            </Field>
            <label className="com-checkbox">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(event) => setDeleteConfirmed(event.target.checked)}
                required
              />
              <span>I understand that deleting my account is permanent.</span>
            </label>
            {modalError && (
              <p className="error-text" role="alert">
                {modalError}
              </p>
            )}
            <div className="actions">
              <Button
                type="submit"
                variant="danger"
                busy={busy === 'delete'}
                disabled={busy !== null || !deleteConfirmed || !currentPassword}
              >
                Delete my account
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy !== null}
                onClick={closeModal}
              >
                Keep account
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {modal === 'support' && (
        <Modal title="Help & issue reports" onClose={closeModal}>
          <div className="stack">
            <p>
              This preview has no connected support inbox. Report issues
              directly to the person running this workspace.
            </p>
            <h3>A useful issue report includes</h3>
            <ol className="acct-prose-list">
              <li>The page and action you were using.</li>
              <li>What you expected and what actually happened.</li>
              <li>The exact error shown and whether refreshing changed it.</li>
              <li>
                Your browser and whether you were signed in as a trainer or
                member.
              </li>
            </ol>
            <p className="muted small">
              Never include your password or another member’s private training
              data. A screenshot with personal details hidden can help.
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `AI Gym local web preview\nRole: ${state.user.role}\nBrowser: ${navigator.userAgent}\nDate: ${new Date().toISOString()}\nPage / action:\nExpected:\nObserved:\nError shown:`,
                  );
                  setSupportCopied(true);
                  setModalError('');
                } catch {
                  setModalError(
                    'Clipboard is unavailable. You can copy the report prompts above manually.',
                  );
                }
              }}
            >
              {supportCopied
                ? 'Report template copied'
                : 'Copy report template'}
            </Button>
            {modalError && (
              <p className="error-text" role="alert">
                {modalError}
              </p>
            )}
            <h3>Common questions</h3>
            <p className="small">
              <strong>Where are my email notifications?</strong> This iteration
              only has in-app notifications. Check Notifications and refresh
              Messages for new replies.
            </p>
            <p className="small">
              <strong>Can I recover a forgotten password?</strong> Email
              recovery is not connected yet. Contact the workspace operator;
              avoid using an important existing password for this preview.
            </p>
            <p className="small">
              <strong>Can I use another device?</strong> Local workspace data is
              not automatically synchronized through a hosted service. Mobile
              validation is pending.
            </p>
          </div>
        </Modal>
      )}
      {modal === 'privacy' && (
        <Modal title="Privacy in this preview" onClose={closeModal}>
          <div className="stack">
            <p>
              This page describes the current local web preview. A production
              privacy policy and deployment review are still required before a
              public release.
            </p>
            <h3>What is stored</h3>
            <p>
              Your profile, account credentials, programs, schedule, completed
              workouts, reflections, messages, trainer reviews, and
              notifications are stored by the local workspace. Your browser can
              also keep a workout draft and pending save operations so you can
              recover a session.
            </p>
            <h3>Who can see it</h3>
            <p>
              Your active trainer can see the training data needed to coach you.
              A pending request does not grant that access. Disconnecting ends
              coaching access. Public trainer profile details and reviews are
              visible to signed-in users in this workspace. Messaging is
              available to the participants of an active coaching connection.
            </p>
            <h3>Your choices</h3>
            <p>
              Edit or clear your profile fields, change trainer discoverability,
              disconnect a trainer in Discover, export your account, or delete
              your account in Settings. Deletion cannot remove copies someone
              has already downloaded.
            </p>
            <h3>Local preview limits</h3>
            <p>
              The workspace operator controls the local storage and any backups.
              This version is not a hosted production service. Live AI, email
              delivery, push delivery, and payment processing are not connected.
              Avoid adding sensitive health information during testing.
            </p>
          </div>
        </Modal>
      )}
      {modal === 'terms' && (
        <Modal title="Local preview terms" onClose={closeModal}>
          <div className="stack">
            <p>
              This is a development preview for evaluating workout planning,
              journaling, and trainer collaboration. Features and stored data
              may change before production release.
            </p>
            <h3>Training responsibly</h3>
            <p>
              Plans and local template suggestions are general fitness guidance.
              Choose weights and movements appropriate to your ability, stop if
              a movement causes pain, and ask a qualified professional when you
              need individualized advice.
            </p>
            <h3>Coaching connections</h3>
            <p>
              A coaching request requires acceptance before private training
              data is shared. Profiles and reviews are user-provided. This
              preview does not verify professional qualifications, arrange paid
              coaching contracts, or collect payments.
            </p>
            <h3>Use with care</h3>
            <p>
              Use accounts you control, keep messages respectful, and only
              upload or enter content you have permission to use. Export records
              you want to keep. Hosted service terms, production support
              commitments, and billing terms remain pending.
            </p>
          </div>
        </Modal>
      )}
      {modal === 'mobile' && (
        <Modal title="Mobile validation · pending" onClose={closeModal}>
          <div className="stack">
            <p>
              This iteration is being developed for the browser. These checks
              are reserved for actual iOS and Android devices; they have not
              been completed by viewing the web app.
            </p>
            <ul className="acct-mobile-list">
              {[
                'Install and sign in on a physical iOS device',
                'Install and sign in on a physical Android device',
                'Start, pause, resume, cancel, and complete a workout',
                'Recover a workout after backgrounding or reopening the app',
                'Retry a workout save after a network interruption',
                'Verify trainer/member data isolation and account switching',
                'Validate safe areas, keyboard entry, decimal weights, and accessibility',
                'Test device notifications and permissions after a provider is connected',
                'Confirm secure storage, biometric behavior, and release distribution',
              ].map((check) => (
                <li key={check}>
                  <Badge tone="amber">Pending</Badge>
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
