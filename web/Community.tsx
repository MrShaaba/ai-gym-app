import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from './ui';
import type { PageProps, Person, Relationship, Route } from './types';
import './Community.css';

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
const knownRoutes: Route[] = [
  'today',
  'plans',
  'journal',
  'progress',
  'coach',
  'clients',
  'discover',
  'messages',
  'notifications',
  'settings',
  'studio',
];
const asRoute = (value: string): Route =>
  knownRoutes.find((route) => route === value) ?? 'notifications';

function relationshipWith(
  relationships: Relationship[],
  userId: string,
  trainerId: string,
) {
  return relationships.find(
    (link) =>
      link.memberId === userId &&
      link.trainerId === trainerId &&
      ['active', 'pending'].includes(link.status),
  );
}

export function DiscoverPage({ state, run, navigate, toast }: PageProps) {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [revoke, setRevoke] = useState<Relationship | null>(null);
  const publicTrainers = state.users.filter(
    (person) =>
      person.role === 'trainer' &&
      person.isPublic &&
      person.id !== state.user.id,
  );
  const specialties = [
    ...new Set(publicTrainers.flatMap((person) => person.specialties)),
  ].sort();
  const trainers = publicTrainers.filter(
    (person) =>
      (specialty === 'all' || person.specialties.includes(specialty)) &&
      `${person.name} ${person.bio} ${person.specialties.join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const selected = state.users.find((person) => person.id === selectedId);
  const selectedLink = selected
    ? relationshipWith(state.relationships, state.user.id, selected.id)
    : undefined;
  const reviews = selected
    ? state.reviews.filter((review) => review.trainerId === selected.id)
    : [];
  const ownReview = reviews.find((review) => review.memberId === state.user.id);
  const links = state.relationships.filter(
    (link) =>
      (link.memberId === state.user.id || link.trainerId === state.user.id) &&
      ['active', 'pending'].includes(link.status),
  );
  const nameOf = (id: string) =>
    state.users.find((person) => person.id === id)?.name ?? 'Gym member';

  function openProfile(person: Person) {
    const existingReview = state.reviews.find(
      (review) =>
        review.trainerId === person.id && review.memberId === state.user.id,
    );
    setSelectedId(person.id);
    setRequesting(false);
    setNote('');
    setConsent(false);
    setError('');
    setRating(existingReview?.rating ?? 5);
    setReviewBody(existingReview?.body ?? '');
  }

  async function respond(link: Relationship, accept: boolean) {
    setBusy(link.id);
    setError('');
    try {
      await run({ type: 'respond_link', id: link.id, accept });
      toast(
        accept
          ? 'Connection accepted. Your coaching space is ready.'
          : 'Request declined.',
      );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  async function requestConnection(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !consent) return;
    setBusy('request');
    setError('');
    try {
      await run({
        type: 'request_link',
        trainerId: selected.id,
        note: note.trim(),
      });
      setRequesting(false);
      toast('Request sent. Your trainer must accept before coaching begins.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  async function saveReview(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy('review');
    setError('');
    try {
      await run({
        type: 'submit_review',
        trainerId: selected.id,
        rating,
        body: reviewBody.trim(),
      });
      toast(
        ownReview
          ? 'Your review was updated.'
          : 'Thank you. Your review is published.',
      );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="BETTER TOGETHER"
        title="Find your trainer"
        description="A little guidance. A stronger routine. Connect with a coach who fits the way you train."
      />
      {error && !selected && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {links.length > 0 && (
        <Card>
          <div className="panel-header">
            <h2>Your connections</h2>
            <Badge>{links.length}</Badge>
          </div>
          <div className="stack">
            {links.map((link) => {
              const otherId =
                state.user.role === 'member' ? link.trainerId : link.memberId;
              const incoming =
                link.status === 'pending' && link.requestedBy !== state.user.id;
              return (
                <div className="com-connection" key={link.id}>
                  <Avatar name={nameOf(otherId)} />
                  <div className="com-grow">
                    <strong>{nameOf(otherId)}</strong>
                    <p className="muted small">
                      {link.status === 'active'
                        ? 'Connected'
                        : incoming
                          ? 'Invited you to connect'
                          : 'Waiting for a response'}
                    </p>
                    {link.note && <p className="small com-wrap">{link.note}</p>}
                    {incoming && (
                      <p className="muted small">
                        {state.user.role === 'member'
                          ? 'Accepting lets this trainer see your training profile, workout history and reflections, assign programs, and exchange messages with you.'
                          : 'This member has requested coaching. Accepting opens their training profile, history, program assignments, and messaging.'}
                      </p>
                    )}
                  </div>
                  <div className="actions">
                    {incoming && (
                      <>
                        <Button
                          busy={busy === link.id}
                          disabled={busy !== null}
                          onClick={() => void respond(link, true)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busy !== null}
                          onClick={() => void respond(link, false)}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {link.status === 'pending' && !incoming && (
                      <Button
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => setRevoke(link)}
                      >
                        Withdraw request
                      </Button>
                    )}
                    {link.status === 'active' && (
                      <>
                        {state.user.role === 'member' && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const trainer = state.users.find(
                                (person) => person.id === otherId,
                              );
                              if (trainer) openProfile(trainer);
                            }}
                          >
                            View profile
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => navigate('messages')}
                        >
                          Message
                        </Button>
                        <Button variant="ghost" onClick={() => setRevoke(link)}>
                          Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <div className="com-discover-filters">
        <Field label="Search trainers">
          <input
            className="input"
            value={query}
            placeholder="Name, specialty, or approach"
            onChange={(event) => setQuery(event.target.value)}
            type="search"
          />
        </Field>
        <Field label="Specialty">
          <select
            className="select"
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
          >
            <option value="all">All specialties</option>
            {specialties.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="muted small" aria-live="polite">
        {trainers.length} {trainers.length === 1 ? 'trainer' : 'trainers'}{' '}
        available in this local workspace
      </p>
      {trainers.length ? (
        <div className="grid-3">
          {trainers.map((trainer) => {
            const trainerReviews = state.reviews.filter(
              (review) => review.trainerId === trainer.id,
            );
            const average = trainerReviews.length
              ? (
                  trainerReviews.reduce(
                    (sum, review) => sum + review.rating,
                    0,
                  ) / trainerReviews.length
                ).toFixed(1)
              : null;
            const connection = relationshipWith(
              state.relationships,
              state.user.id,
              trainer.id,
            );
            return (
              <Card key={trainer.id} className="com-trainer-card">
                <div className="row-between">
                  <Avatar name={trainer.name} size="lg" />
                  {connection && (
                    <Badge
                      tone={connection.status === 'active' ? 'green' : 'amber'}
                    >
                      {connection.status === 'active'
                        ? 'Your trainer'
                        : 'Request pending'}
                    </Badge>
                  )}
                </div>
                <div>
                  <h2>{trainer.name}</h2>
                  <p className="muted small">
                    {average
                      ? `★ ${average} · ${trainerReviews.length} ${trainerReviews.length === 1 ? 'review' : 'reviews'}`
                      : 'No reviews yet'}
                  </p>
                </div>
                <p className="muted com-bio-preview">
                  {trainer.bio || 'This trainer is setting up their profile.'}
                </p>
                <div className="com-tags">
                  {trainer.specialties.slice(0, 4).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  className="com-card-button"
                  onClick={() => openProfile(trainer)}
                >
                  View profile <span aria-hidden="true">↗</span>
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            query || specialty !== 'all'
              ? 'No matching trainers'
              : 'Your next coach is on the way'
          }
          description={
            query || specialty !== 'all'
              ? 'Try another name or choose a different specialty.'
              : 'Public trainer profiles appear here. Trainers can make their profile discoverable in Settings.'
          }
          action={
            query || specialty !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setSpecialty('all');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}
      <p className="small muted">
        Discovery is limited to accounts in this local workspace. Coaching fees,
        bookings, and payments are not connected.
      </p>
      {selected && (
        <Modal
          title={selected.name}
          onClose={() => {
            if (!busy) {
              setSelectedId(null);
              setError('');
            }
          }}
          wide
        >
          <div className="stack">
            <div className="row">
              <Avatar name={selected.name} size="lg" />
              <div>
                <Badge tone="blue">Trainer</Badge>
                <p className="muted small">
                  Member since {dateLabel(selected.createdAt)}
                </p>
              </div>
            </div>
            <p className="com-wrap">
              {selected.bio || 'This trainer has not added a biography yet.'}
            </p>
            <div className="com-tags">
              {selected.specialties.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            {selected.availability.length > 0 && (
              <p className="small muted">
                Usual training days:{' '}
                {selected.availability.map((day) => days[day]).join(', ')}.
                Confirm availability directly with your trainer.
              </p>
            )}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            {state.user.role === 'member' && !selectedLink && !requesting && (
              <Button onClick={() => setRequesting(true)}>
                Request coaching
              </Button>
            )}
            {selectedLink?.status === 'pending' && (
              <Badge tone="amber">Connection request pending</Badge>
            )}
            {selectedLink?.status === 'active' && (
              <Button onClick={() => navigate('messages')}>
                Message your trainer
              </Button>
            )}
            {requesting && (
              <form
                className="com-request-form stack"
                onSubmit={(event) => void requestConnection(event)}
              >
                <Field
                  label="Tell your trainer what you want to work on"
                  hint="Optional. Avoid including sensitive health information."
                >
                  <textarea
                    className="textarea"
                    maxLength={1000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    placeholder="I would like help building a consistent strength routine…"
                  />
                </Field>
                <label className="com-checkbox">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    required
                  />
                  <span>
                    I agree to share my training profile, workout history, and
                    reflections with this trainer once they accept. We can then
                    exchange messages and they can assign programs. I can
                    disconnect at any time.
                  </span>
                </label>
                <div className="actions">
                  <Button
                    type="submit"
                    busy={busy === 'request'}
                    disabled={!consent || busy !== null}
                  >
                    Send request
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => setRequesting(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            <div className="divider" />
            <div>
              <h3>Member reviews</h3>
              <p className="muted small">
                Reviews come from connected members in this workspace.
              </p>
            </div>
            {reviews.length ? (
              <div className="stack">
                {reviews.map((review) => (
                  <div className="com-review" key={review.id}>
                    <div className="row-between">
                      <strong>
                        {review.memberId === state.user.id
                          ? 'Your review'
                          : nameOf(review.memberId)}
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
                      {dateLabel(review.createdAt)}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No reviews yet.</p>
            )}
            {state.user.role === 'member' &&
              selectedLink?.status === 'active' && (
                <form
                  className="stack com-request-form"
                  onSubmit={(event) => void saveReview(event)}
                >
                  <h3>
                    {ownReview ? 'Edit your review' : 'Share your experience'}
                  </h3>
                  <Field label="Rating">
                    <select
                      className="select"
                      value={rating}
                      onChange={(event) =>
                        setRating(Number(event.target.value))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value} {value === 1 ? 'star' : 'stars'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Your review"
                    hint="Your name and review will be visible on this trainer’s public profile."
                  >
                    <textarea
                      className="textarea"
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                      required
                      maxLength={2000}
                      rows={3}
                    />
                  </Field>
                  <div>
                    <Button
                      type="submit"
                      busy={busy === 'review'}
                      disabled={!reviewBody.trim() || busy !== null}
                    >
                      {ownReview ? 'Update review' : 'Publish review'}
                    </Button>
                  </div>
                </form>
              )}
          </div>
        </Modal>
      )}
      {revoke && (
        <ConfirmDialog
          title={
            revoke.status === 'pending'
              ? 'Withdraw this request?'
              : 'Disconnect coaching?'
          }
          description={
            revoke.status === 'pending'
              ? 'The pending request will be withdrawn. You can send another request later.'
              : 'This connection will end and trainer access to private training data will be removed. Workout history is preserved. Messaging requires an active connection.'
          }
          onClose={() => {
            if (!busy) setRevoke(null);
          }}
          busy={busy === 'revoke'}
          onConfirm={async () => {
            setBusy('revoke');
            setError('');
            try {
              await run({ type: 'revoke_link', id: revoke.id });
              setRevoke(null);
              toast(
                revoke.status === 'pending'
                  ? 'Connection request withdrawn.'
                  : 'Coaching connection ended.',
              );
            } catch (failure) {
              setError(errorMessage(failure));
              setRevoke(null);
            } finally {
              setBusy(null);
            }
          }}
        />
      )}
    </div>
  );
}

export function MessagesPage({
  state,
  run,
  navigate,
  refresh,
  toast,
}: PageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const activeIds = useMemo(
    () =>
      new Set(
        state.relationships
          .filter(
            (link) =>
              link.status === 'active' &&
              (link.memberId === state.user.id ||
                link.trainerId === state.user.id),
          )
          .map((link) =>
            link.memberId === state.user.id ? link.trainerId : link.memberId,
          ),
      ),
    [state.relationships, state.user.id],
  );
  const contacts = state.users.filter((person) => activeIds.has(person.id));
  const selected =
    contacts.find((person) => person.id === selectedId) ?? contacts[0];
  const conversation = state.messages
    .filter(
      (message) =>
        selected &&
        ((message.senderId === state.user.id &&
          message.recipientId === selected.id) ||
          (message.senderId === selected.id &&
            message.recipientId === state.user.id)),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  useEffect(() => {
    setText('');
    setError('');
  }, [selected?.id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [selected?.id, conversation.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await run({
        type: 'send_message',
        recipientId: selected.id,
        text: text.trim(),
      });
      setText('');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="STAY CONNECTED"
        title="Messages"
        description="Keep the conversation going between sessions."
        actions={
          <Button
            variant="secondary"
            busy={refreshing}
            disabled={refreshing || sending}
            onClick={async () => {
              setRefreshing(true);
              try {
                await refresh();
                toast('Messages refreshed.');
              } catch (failure) {
                setError(errorMessage(failure));
              } finally {
                setRefreshing(false);
              }
            }}
          >
            Refresh
          </Button>
        }
      />
      {contacts.length > 0 && selected ? (
        <Card className="com-messenger">
          <aside className="com-contact-list" aria-label="Conversations">
            <h2 className="com-contact-heading">Your conversations</h2>
            {contacts.map((person) => {
              const latest = state.messages
                .filter(
                  (message) =>
                    message.senderId === person.id ||
                    message.recipientId === person.id,
                )
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
              return (
                <button
                  type="button"
                  className={`com-contact ${person.id === selected.id ? 'com-contact-active' : ''}`}
                  aria-pressed={person.id === selected.id}
                  key={person.id}
                  disabled={sending}
                  onClick={() => setSelectedId(person.id)}
                >
                  <Avatar name={person.name} />
                  <span className="com-contact-copy">
                    <strong>{person.name}</strong>
                    <span className="muted small com-contact-preview">
                      {latest?.text ?? 'Start a conversation'}
                    </span>
                  </span>
                </button>
              );
            })}
          </aside>
          <section
            className="com-chat"
            aria-label={`Conversation with ${selected.name}`}
          >
            <div className="com-chat-header">
              <Avatar name={selected.name} />
              <div>
                <h2>{selected.name}</h2>
                <p className="small muted">
                  {selected.role === 'trainer' ? 'Your trainer' : 'Your member'}{' '}
                  · Connected
                </p>
              </div>
            </div>
            <div
              className="com-message-list"
              role="log"
              aria-label="Message history"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {conversation.length ? (
                conversation.map((message) => {
                  const mine = message.senderId === state.user.id;
                  return (
                    <article
                      key={message.id}
                      className={`com-message ${mine ? 'com-message-own' : ''}`}
                    >
                      <span className="small muted">
                        {mine ? 'You' : selected.name}
                      </span>
                      <p>{message.text}</p>
                      <time
                        className="com-message-time"
                        dateTime={message.createdAt}
                      >
                        {dateLabel(message.createdAt)} ·{' '}
                        {timeLabel(message.createdAt)}
                      </time>
                    </article>
                  );
                })
              ) : (
                <Empty
                  title="A good conversation starts here"
                  description={`Send ${selected.name.split(' ')[0]} a question, a session update, or a quick hello.`}
                />
              )}
              <div ref={bottom} />
            </div>
            <form
              className="com-compose"
              onSubmit={(event) => void send(event)}
            >
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <label className="small" htmlFor="message-text">
                Message {selected.name}
              </label>
              <textarea
                id="message-text"
                className="textarea"
                placeholder="How did today’s session feel?"
                rows={3}
                value={text}
                disabled={sending}
                maxLength={4000}
                onChange={(event) => setText(event.target.value)}
              />
              <div className="row-between">
                <span className="small muted">
                  Saved to this workspace · {text.length}/4,000
                </span>
                <Button
                  type="submit"
                  disabled={!text.trim() || sending}
                  busy={sending}
                >
                  Send message <span aria-hidden="true">↗</span>
                </Button>
              </div>
            </form>
          </section>
        </Card>
      ) : (
        <>
          <Empty
            title="Your coaching conversations live here"
            description="Messaging opens when a trainer and member accept a connection. Pending requests do not enable messaging."
            action={
              <Button
                onClick={() =>
                  navigate(
                    state.user.role === 'trainer' ? 'clients' : 'discover',
                  )
                }
              >
                {state.user.role === 'trainer'
                  ? 'Manage members'
                  : 'Find a trainer'}
              </Button>
            }
          />
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </>
      )}
      <p className="muted small">
        Messages stay in this local workspace. Email and push delivery are not
        connected; use Refresh to check for new replies.
      </p>
    </div>
  );
}

export function NotificationsPage({ state, run, navigate }: PageProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const all = [...state.notifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const unread = all.filter((notice) => !notice.read);
  const visible = filter === 'unread' ? unread : all;

  async function markAll() {
    setBusy('all');
    setError('');
    try {
      await run({ type: 'mark_notification', id: 'all' });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="IN THE LOOP"
        title="Notifications"
        description="Program updates, coaching requests, and small steps forward."
        actions={
          <Button
            variant="secondary"
            disabled={busy !== null || !unread.length}
            busy={busy === 'all'}
            onClick={() => void markAll()}
          >
            Mark all as read
          </Button>
        }
      />
      <div className="actions" aria-label="Filter notifications">
        <Button
          variant={filter === 'all' ? 'primary' : 'ghost'}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All ({all.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'primary' : 'ghost'}
          aria-pressed={filter === 'unread'}
          onClick={() => setFilter('unread')}
        >
          Unread ({unread.length})
        </Button>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {visible.length ? (
        <Card>
          <div className="com-notices">
            {visible.map((notice) => (
              <article
                className={`com-notice ${!notice.read ? 'com-notice-unread' : ''}`}
                key={notice.id}
              >
                <span
                  className="com-notice-indicator"
                  aria-label={notice.read ? 'Read' : 'Unread'}
                />
                <div className="com-grow">
                  <div className="row-between">
                    <h2>{notice.title}</h2>
                    <time className="small muted" dateTime={notice.createdAt}>
                      {dateLabel(notice.createdAt)}
                    </time>
                  </div>
                  <p className="muted com-wrap">{notice.body}</p>
                  <div className="actions">
                    <Button
                      variant="ghost"
                      disabled={busy !== null}
                      busy={busy === notice.id}
                      onClick={async () => {
                        setBusy(notice.id);
                        setError('');
                        try {
                          if (!notice.read)
                            await run({
                              type: 'mark_notification',
                              id: notice.id,
                            });
                          navigate(asRoute(notice.route));
                        } catch (failure) {
                          setError(errorMessage(failure));
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      View details <span aria-hidden="true">↗</span>
                    </Button>
                    {!notice.read && (
                      <Button
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={async () => {
                          setBusy(notice.id);
                          setError('');
                          try {
                            await run({
                              type: 'mark_notification',
                              id: notice.id,
                            });
                          } catch (failure) {
                            setError(errorMessage(failure));
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Card>
      ) : (
        <Empty
          title={filter === 'unread' ? 'You’re all caught up' : 'A fresh start'}
          description={
            filter === 'unread'
              ? 'No unread notifications. Your next update will appear here.'
              : 'Requests, assignments, messages, and feedback will show up here as you train.'
          }
        />
      )}
      <p className="small muted">
        These are in-app notifications. External email and push notifications
        are not connected.
      </p>
    </div>
  );
}
