import { supabase } from '@/config/supabase';
import type { TrainerClient } from '@/types/assignment';

/* ── helpers ──────────────────────────────────────────────────── */

/** Format a date string into a short relative "last active" label. */
function formatLastActive(dateStr: string | null): string {
  if (!dateStr) return 'New';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
}

/* ── queries ─────────────────────────────────────────────────── */

/** Fetch all clients linked to a trainer (via trainer_client_links + profiles). */
export async function fetchTrainerClients(
  trainerId: string,
): Promise<TrainerClient[]> {
  // 1. Get all links for this trainer
  const { data: links, error: linkErr } = await supabase
    .from('trainer_client_links')
    .select('client_id, status, created_at')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });
  if (linkErr) throw linkErr;
  if (!links || links.length === 0) return [];

  const clientIds = links.map((l) => l.client_id as string);

  // 2. Fetch profiles for those clients
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, goal, created_at')
    .in('id', clientIds);
  if (profErr) throw profErr;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p]),
  );

  // 3. Fetch workout data per client (count + last workout date)
  const { data: workouts, error: wcErr } = await supabase
    .from('completed_workouts')
    .select('user_id, created_at')
    .in('user_id', clientIds);
  if (wcErr) throw wcErr;

  const countMap = new Map<string, number>();
  const lastActiveMap = new Map<string, string>();
  for (const w of workouts ?? []) {
    const uid = w.user_id as string;
    countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
    const wDate = w.created_at as string;
    const existing = lastActiveMap.get(uid);
    if (!existing || wDate > existing) {
      lastActiveMap.set(uid, wDate);
    }
  }

  // 4. Merge into TrainerClient objects
  return links.map((link) => {
    const cid = link.client_id as string;
    const p = profileMap.get(cid);
    const fullName = (p?.full_name as string) || 'Unknown';
    const names = fullName.split(' ');
    const initials = names
      .map((n: string) => n[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2);

    return {
      clientId: cid,
      clientName: fullName,
      clientInitials: initials,
      goal: (p?.goal as string) ?? 'General Fitness',
      email: '', // not exposed between users
      active: link.status === 'active',
      lastActive: formatLastActive(lastActiveMap.get(cid) ?? null),
      workoutCount: countMap.get(cid) ?? 0,
      assignmentCount: 0, // filled by store/screen
      adherencePercent: 0,
      memberSince: p?.created_at
        ? new Date(p.created_at as string).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })
        : '',
    };
  });
}

/** Fetch a single client's profile (for trainer viewing). */
export async function fetchClientProfile(
  clientId: string,
): Promise<TrainerClient | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, goal, created_at')
    .eq('id', clientId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const fullName = (data.full_name as string) || 'Unknown';
  const names = fullName.split(' ');
  const initials = names
    .map((n: string) => n[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  return {
    clientId: data.id as string,
    clientName: fullName,
    clientInitials: initials,
    goal: (data.goal as string) ?? 'General Fitness',
    email: '',
    active: true, // assume active when fetched directly
    lastActive: 'New',
    workoutCount: 0,
    assignmentCount: 0,
    adherencePercent: 0,
    memberSince: new Date(data.created_at as string).toLocaleDateString(
      'en-US',
      { month: 'short', year: 'numeric' },
    ),
  };
}

/** Create or reactivate a trainer-client link. */
export async function linkClient(
  trainerId: string,
  clientId: string,
): Promise<void> {
  const { error } = await supabase
    .from('trainer_client_links')
    .upsert(
      { trainer_id: trainerId, client_id: clientId, status: 'active' },
      { onConflict: 'trainer_id,client_id' },
    );
  if (error) throw error;
}
