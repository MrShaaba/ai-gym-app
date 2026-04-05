import { supabase } from '@/config/supabase';
import type { TrainerClient } from '@/types/assignment';

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

  // 3. Fetch workout counts per client
  const { data: workoutCounts, error: wcErr } = await supabase
    .from('completed_workouts')
    .select('user_id')
    .in('user_id', clientIds);
  if (wcErr) throw wcErr;

  const countMap = new Map<string, number>();
  for (const w of workoutCounts ?? []) {
    const uid = w.user_id as string;
    countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
  }

  // 4. Merge into TrainerClient objects
  return links.map((link) => {
    const p = profileMap.get(link.client_id as string);
    const fullName = (p?.full_name as string) || 'Unknown';
    const names = fullName.split(' ');
    const initials = names
      .map((n: string) => n[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2);

    return {
      clientId: link.client_id as string,
      clientName: fullName,
      clientInitials: initials,
      goal: (p?.goal as string) ?? 'General Fitness',
      email: '', // not exposed between users
      active: link.status === 'active',
      lastActive: '',
      workoutCount: countMap.get(link.client_id as string) ?? 0,
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
    lastActive: '',
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
