import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiRequest,
  ApiError,
  cacheState,
  clearAuth,
  getCachedUserId,
  getToken,
  readCachedState,
  setAuth,
} from './api';
import { Avatar, Badge, Button, Card, Icon, Modal } from './ui';
import { errorMessage } from './utils';
import { TodayPage, JournalPage, ProgressPage, MemberSync } from './Member';
import { CoachPage, ClientsPage } from './Trainer';
import { PlansPage, StudioPage } from './Programs';
import { DiscoverPage, MessagesPage, NotificationsPage } from './Community';
import { SettingsPage } from './Account';
import type { Action, PageProps, Role, Route, WebState } from './types';
import './styles.css';

const labels: Record<Route, string> = {
  today: 'Today',
  plans: 'Plans & schedule',
  journal: 'Workout journal',
  progress: 'Progress',
  coach: 'Overview',
  clients: 'Clients',
  discover: 'Find a coach',
  messages: 'Messages',
  notifications: 'Notifications',
  settings: 'Settings',
  studio: 'Plan studio',
};
const icons: Record<Route, string> = {
  today: 'home',
  plans: 'calendar',
  journal: 'journal',
  progress: 'chart',
  coach: 'home',
  clients: 'users',
  discover: 'search',
  messages: 'message',
  notifications: 'bell',
  settings: 'settings',
  studio: 'sparkles',
};
const memberRoutes: Route[] = [
  'today',
  'plans',
  'journal',
  'progress',
  'studio',
  'discover',
  'messages',
];
const trainerRoutes: Route[] = [
  'coach',
  'clients',
  'plans',
  'studio',
  'messages',
];

function Login({ onLogin }: { onLogin: (state: WebState) => void }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [help, setHelp] = useState(false);
  const submit = async (demoRole?: Role) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const body = demoRole
        ? { email: `${demoRole}@aigym.local`, password: 'TrainToday!2026' }
        : register
          ? { name, email, password, role }
          : { email, password };
      const result = await apiRequest<{ token: string; state: WebState }>(
        register && !demoRole ? '/api/auth/register' : '/api/auth/login',
        { method: 'POST', body: JSON.stringify(body) },
      );
      setAuth(result.token, result.state.user.id);
      cacheState(result.state);
      onLogin(result.state);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-symbol">
            <Icon name="dumbbell" size={26} />
          </span>
          <span>
            AI GYM<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">YOUR WORK. YOUR PROGRESS.</span>
          <h1>
            Show up.
            <br />
            Get stronger.
            <br />
            <span>Keep the story.</span>
          </h1>
          <p>
            A thoughtful home for your training. Plan with purpose, log every
            effort, and build progress with your coach.
          </p>
          <div className="story-workout">
            <div className="row-between">
              <span className="eyebrow">A LITTLE BETTER, EVERY WEEK</span>
              <Icon name="activity" />
            </div>
            <div className="story-bars" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <span key={n} className={`story-bar story-bar-${n}`} />
              ))}
            </div>
            <div className="row-between small muted">
              <span>Consistency adds up.</span>
              <span>One session at a time.</span>
            </div>
          </div>
        </div>
        <span className="auth-footnote">
          A digital workout journal for people who put in the work.
        </span>
      </section>
      <main className="auth-panel">
        <div className="auth-form-wrap">
          <Badge tone="green">WEB WORKSPACE</Badge>
          <h2>
            {register
              ? 'Make room for progress.'
              : 'Welcome to your next chapter.'}
          </h2>
          <p className="muted">
            {register
              ? 'Create a local account and start your training journal.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            className="stack auth-form"
          >
            {register && (
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  className="input"
                  autoComplete="name"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <input
                className="input"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 10 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  register ? 'At least 10 characters' : 'Your password'
                }
              />
            </label>
            {register && (
              <label className="field">
                <span className="field-label">Account type</span>
                <select
                  className="select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="member">Member — my training</option>
                  <option value="trainer">Trainer — coach my clients</option>
                </select>
              </label>
            )}
            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" busy={busy}>
              {register ? 'Create account' : 'Sign in'}
              <Icon name="arrow" size={17} />
            </Button>
          </form>
          <div className="auth-links">
            <button
              className="text-button"
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register
                ? 'Already have an account? Sign in'
                : 'Create an account'}
            </button>
            <button className="text-button muted" onClick={() => setHelp(true)}>
              Account help
            </button>
          </div>
          <div className="demo-divider">
            <span>OR EXPLORE THE DEMO</span>
          </div>
          <div className="demo-options">
            <button
              className="demo-option"
              disabled={busy}
              onClick={() => void submit('member')}
            >
              <Icon name="dumbbell" />
              <span>
                <strong>Member workspace</strong>
                <small>Alex’s training journal</small>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
            <button
              className="demo-option"
              disabled={busy}
              onClick={() => void submit('trainer')}
            >
              <Icon name="users" />
              <span>
                <strong>Trainer workspace</strong>
                <small>Jordan’s coaching studio</small>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
          <p className="local-disclosure">
            <Icon name="shield" size={15} />
            <span>
              Local preview. Accounts and training records are saved on this
              computer. Demo profiles are fictional. No payment or email is
              sent.
            </span>
          </p>
        </div>
      </main>
      {help && (
        <Modal title="Account help" onClose={() => setHelp(false)}>
          <div className="stack">
            <p>
              This workspace uses a local account system. Email delivery and
              password-reset links are not connected yet.
            </p>
            <p className="muted">
              You can explore using the member or trainer demo buttons. Both
              demo accounts use <code>TrainToday!2026</code>. Signed-in users
              can change their password in Settings using their current
              password.
            </p>
            <p className="muted">
              Use a separate test password for this preview. Keep real sensitive
              information out of demo accounts.
            </p>
            <Button onClick={() => setHelp(false)}>Got it</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

class PageBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <Card className="empty">
        <h2>This page needs a fresh start.</h2>
        <p className="muted">
          Your saved training data is still in your workspace.
        </p>
        <Button
          onClick={() => {
            this.setState({ error: false });
            this.props.onRetry();
          }}
        >
          Reload page
        </Button>
      </Card>
    ) : (
      this.props.children
    );
  }
}

export default function WebApp() {
  const [state, setState] = useState<WebState | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [route, setRoute] = useState<Route>('today');
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    kind: 'success' | 'error';
  } | null>(null);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const mutationVersion = useRef(0);
  const acceptState = useCallback((next: WebState) => {
    const current = stateRef.current;
    if (
      current?.user.id === next.user.id &&
      Date.parse(current.serverTime) > Date.parse(next.serverTime)
    )
      return;
    stateRef.current = next;
    setState(next);
    cacheState(next);
  }, []);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback(
    (text: string, kind: 'success' | 'error' = 'success') => {
      setNotice({ text, kind });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setNotice(null), 5000);
    },
    [],
  );
  const navigate = useCallback((next: Route) => {
    window.location.hash = next;
    setRoute(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  useEffect(() => {
    document.title = state
      ? `${labels[route]} · AI Gym`
      : 'AI Gym · Your training journal';
  }, [route, state?.user.id]);
  useEffect(() => {
    if (!menu) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href]',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [menu]);
  const signOut = useCallback(async () => {
    const token = getToken();
    clearAuth();
    stateRef.current = null;
    setState(null);
    setMenu(false);
    setOffline(false);
    window.location.hash = '';
    if (token) {
      try {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* Local session is already cleared; remote token has a bounded expiry. */
      }
    }
  }, []);
  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const version = mutationVersion.current;
    try {
      const next = await apiRequest<WebState>('/api/state');
      if (getToken() !== token || version !== mutationVersion.current) return;
      acceptState(next);
      setOffline(false);
      setStartupError('');
    } catch (error) {
      if (getToken() !== token) return;
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        setState(null);
        return;
      }
      setOffline(true);
      if (!stateRef.current) {
        const cached = readCachedState();
        if (cached) setState(cached);
        else setStartupError(errorMessage(error));
      }
    }
  }, [acceptState]);
  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    const syncHash = () => {
      const next = window.location.hash.slice(1) as Route;
      if (Object.prototype.hasOwnProperty.call(labels, next)) setRoute(next);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearch((value) => !value);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => {
    if (!state?.user.id) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('aigym-workspace');
      channelRef.current = channel;
      channel.onmessage = onFocus;
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [state?.user.id, refresh]);
  const run = useCallback(
    async (action: Action): Promise<WebState> => {
      const current = stateRef.current;
      const token = getToken();
      if (!current || !token || getCachedUserId() !== current.user.id)
        throw new Error('Sign in to continue.');
      mutationVersion.current += 1;
      const next = await apiRequest<WebState | { deleted: true }>(
        '/api/action',
        { method: 'POST', body: JSON.stringify(action) },
      );
      if (getToken() !== token)
        throw new Error(
          'Your session changed. Please try again in the correct account.',
        );
      if ('deleted' in next) {
        for (const key of [
          `aigym.web.cache.${current.user.id}`,
          `aigym.web.draft.v1.${current.user.id}`,
          `aigym.web.outbox.v1.${current.user.id}`,
          `aigym:program-draft:${current.user.id}`,
        ]) {
          try {
            localStorage.removeItem(key);
          } catch {
            /* Server account is deleted even when browser storage is unavailable. */
          }
        }
        clearAuth();
        stateRef.current = null;
        setState(null);
        window.location.hash = '';
        toast('Your local account and associated records were deleted.');
        return current;
      }
      mutationVersion.current += 1;
      acceptState(next);
      setOffline(false);
      channelRef.current?.postMessage('changed');
      return next;
    },
    [toast, acceptState],
  );
  if (loading)
    return (
      <main className="startup">
        <span className="brand-symbol">
          <Icon name="dumbbell" size={30} />
        </span>
        <h1>Opening your journal</h1>
        <p className="muted">A moment to get ready.</p>
        <span className="spinner" />
      </main>
    );
  if (!state)
    return (
      <>
        {startupError && (
          <div className="connection-notice" role="alert">
            {startupError}
            <Button variant="secondary" onClick={() => void refresh()}>
              Retry connection
            </Button>
          </div>
        )}
        <Login
          onLogin={(next) => {
            setState(next);
            setOffline(false);
            setStartupError('');
            navigate(next.user.role === 'trainer' ? 'coach' : 'today');
          }}
        />
        {notice && (
          <div className={`toast toast-${notice.kind}`} role="status">
            {notice.text}
          </div>
        )}
      </>
    );
  const isTrainer = state.user.role === 'trainer';
  const routes = isTrainer ? trainerRoutes : memberRoutes;
  const effectiveRoute =
    routes.includes(route) || route === 'notifications' || route === 'settings'
      ? route
      : isTrainer
        ? 'coach'
        : 'today';
  const props: PageProps = { state, run, navigate, refresh, toast };
  const pages: Record<Route, React.ComponentType<PageProps>> = {
    today: TodayPage,
    plans: PlansPage,
    journal: JournalPage,
    progress: ProgressPage,
    coach: CoachPage,
    clients: ClientsPage,
    studio: StudioPage,
    discover: DiscoverPage,
    messages: MessagesPage,
    notifications: NotificationsPage,
    settings: SettingsPage,
  };
  const Page = pages[effectiveRoute];
  const unread = state.notifications.filter((item) => !item.read).length;
  const filteredRoutes = [
    ...routes,
    'notifications' as Route,
    'settings' as Route,
  ].filter((item) => labels[item].toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="web-app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      {!isTrainer && <MemberSync {...props} />}
      <button
        className={`sidebar-overlay ${menu ? 'visible' : ''}`}
        aria-label="Close navigation"
        tabIndex={menu ? 0 : -1}
        onClick={() => setMenu(false)}
      />
      <aside
        id="workspace-navigation"
        ref={sidebarRef}
        className={`sidebar ${menu ? 'sidebar-open' : ''}`}
      >
        <a
          href={isTrainer ? '#coach' : '#today'}
          className="brand"
          onClick={() => setMenu(false)}
        >
          <span className="brand-symbol">
            <Icon name="dumbbell" size={24} />
          </span>
          <span>
            AI GYM<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">
          {isTrainer ? 'COACHING STUDIO' : 'YOUR TRAINING SPACE'}
        </div>
        <nav aria-label="Main navigation" className="main-navigation">
          {routes.map((item) => (
            <button
              key={item}
              className={`nav-item ${effectiveRoute === item ? 'nav-active' : ''}`}
              aria-current={effectiveRoute === item ? 'page' : undefined}
              onClick={() => navigate(item)}
            >
              <Icon name={icons[item]} />
              <span>{labels[item]}</span>
              {item === 'studio' && <span className="nav-new">NEW</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="status-dot" />
            <span>
              Local workspace<small>Saved on this computer</small>
            </span>
            <Icon name="shield" size={15} />
          </div>
          <button
            className={`nav-item ${effectiveRoute === 'settings' ? 'nav-active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>
          <div className="sidebar-profile">
            <Avatar name={state.user.name} />
            <div>
              <strong>{state.user.name}</strong>
              <span>{isTrainer ? 'Trainer account' : 'Member account'}</span>
            </div>
            <button
              className="icon-button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="row">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumbs">
              <span>{isTrainer ? 'Studio' : 'Workspace'}</span>
              <Icon name="chevron-right" size={14} />
              <strong>{labels[effectiveRoute]}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setQuery('');
                setSearch(true);
              }}
              aria-label="Search workspace"
            >
              <Icon name="search" size={17} />
              <span>Jump to…</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button notification-button"
              onClick={() => navigate('notifications')}
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            >
              <Icon name="bell" />
              {unread > 0 && <span className="notification-dot" />}
            </button>
            <Avatar name={state.user.name} size="sm" />
          </div>
        </header>
        {offline && (
          <div className="offline-banner" role="status">
            <Icon name="info" size={17} />
            <span>
              Connection interrupted. Showing your saved workspace. Pending
              workouts will retry when connected.
            </span>
            <Button variant="ghost" onClick={() => void refresh()}>
              Retry
            </Button>
          </div>
        )}
        <main id="main-content" className="workspace-content" tabIndex={-1}>
          <PageBoundary
            key={`${state.user.id}-${effectiveRoute}`}
            onRetry={() => void refresh()}
          >
            <Page {...props} />
          </PageBoundary>
          <footer className="workspace-footer">
            <span>Built one workout at a time.</span>
            <span>Local preview · Mobile validation pending</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div
          className={`toast toast-${notice.kind}`}
          role={notice.kind === 'error' ? 'alert' : 'status'}
        >
          <Icon name={notice.kind === 'error' ? 'info' : 'check'} size={18} />
          {notice.text}
          <button
            aria-label="Dismiss message"
            className="icon-button"
            onClick={() => setNotice(null)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {search && (
        <Modal title="Jump to your workspace" onClose={() => setSearch(false)}>
          <input
            className="input"
            aria-label="Search pages"
            autoFocus
            placeholder="Find a page…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search-results">
            {filteredRoutes.map((item) => (
              <button
                className="list-row row-between"
                key={item}
                onClick={() => {
                  navigate(item);
                  setSearch(false);
                }}
              >
                <span className="row">
                  <Icon name={icons[item]} />
                  {labels[item]}
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
            {filteredRoutes.length === 0 && (
              <p className="muted">
                No matching pages. Try “plans” or “settings”.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
