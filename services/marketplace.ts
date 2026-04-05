import { supabase } from '@/config/supabase';
import type { TrainerPublicProfile, Review, Invite, InviteType } from '@/types/marketplace';

/* ── Trainer Discovery ──────────────────────────────────────── */

export async function searchTrainers(
  query?: string,
  specialty?: string,
  limit = 20,
  offset = 0,
): Promise<TrainerPublicProfile[]> {
  const { data, error } = await supabase.rpc('search_trainers', {
    p_query: query || null,
    p_specialty: specialty || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return ((data as any[]) ?? []).map(mapTrainerRow);
}

export async function getTrainerPublicProfile(trainerId: string): Promise<TrainerPublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, specialties, certifications, intro_video, experience_years, rating_avg, rating_count')
    .eq('id', trainerId)
    .eq('role', 'trainer')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? mapTrainerRow(data) : null;
}

function mapTrainerRow(row: Record<string, unknown>): TrainerPublicProfile {
  return {
    id: row.id as string,
    username: (row.username as string) ?? null,
    fullName: row.full_name as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    bio: (row.bio as string) ?? null,
    specialties: (row.specialties as string[]) ?? [],
    certifications: (row.certifications as string[]) ?? [],
    introVideo: (row.intro_video as string) ?? null,
    experienceYears: (row.experience_years as number) ?? 0,
    ratingAvg: (row.rating_avg as number) ?? 0,
    ratingCount: (row.rating_count as number) ?? 0,
  };
}

/* ── Reviews ────────────────────────────────────────────────── */

export async function fetchReviews(trainerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles!reviews_client_id_fkey(full_name, avatar_url)')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) ?? []).map((row) => ({
    id: row.id,
    trainerId: row.trainer_id,
    clientId: row.client_id,
    clientName: row.profiles?.full_name ?? 'Anonymous',
    clientAvatar: row.profiles?.avatar_url ?? null,
    rating: row.rating,
    title: row.title ?? '',
    body: row.body ?? '',
    testimonialVideo: row.testimonial_video ?? null,
    createdAt: row.created_at,
  }));
}

export async function submitReview(params: {
  trainerId: string;
  clientId: string;
  rating: number;
  title: string;
  body: string;
  testimonialVideo?: string;
}): Promise<void> {
  const { error } = await supabase.from('reviews').upsert(
    {
      trainer_id: params.trainerId,
      client_id: params.clientId,
      rating: params.rating,
      title: params.title,
      body: params.body,
      testimonial_video: params.testimonialVideo ?? null,
    },
    { onConflict: 'trainer_id,client_id' },
  );
  if (error) throw error;
}

/* ── Username ───────────────────────────────────────────────── */

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_username_available', {
    p_username: username.toLowerCase(),
  });
  if (error) throw error;
  return data as boolean;
}

export async function setUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ username: username.toLowerCase() })
    .eq('id', userId);
  if (error) throw error;
}

export async function findByUsername(username: string) {
  const { data, error } = await supabase.rpc('find_user_by_username', {
    p_username: username.toLowerCase(),
  });
  if (error) throw error;
  return (data as any[])?.[0] ?? null;
}

/* ── Invites ────────────────────────────────────────────────── */

export async function createInvite(
  trainerId: string,
  inviteType: InviteType,
  inviteValue: string,
): Promise<Invite> {
  const { data, error } = await supabase
    .from('invites')
    .upsert(
      {
        trainer_id: trainerId,
        invite_type: inviteType,
        invite_value: inviteValue.toLowerCase().trim(),
        status: 'pending',
      },
      { onConflict: 'trainer_id,invite_value' },
    )
    .select()
    .single();
  if (error) throw error;
  return mapInviteRow(data);
}

export async function fetchTrainerInvites(trainerId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as any[]) ?? []).map(mapInviteRow);
}

function mapInviteRow(row: Record<string, unknown>): Invite {
  return {
    id: row.id as string,
    trainerId: row.trainer_id as string,
    inviteType: row.invite_type as InviteType,
    inviteValue: row.invite_value as string,
    status: row.status as 'pending' | 'accepted' | 'expired',
    createdAt: row.created_at as string,
    acceptedAt: (row.accepted_at as string) ?? null,
  };
}

/* ── Trainer Profile Update ─────────────────────────────────── */

export async function updateTrainerProfile(
  userId: string,
  fields: {
    bio?: string;
    specialties?: string[];
    certifications?: string[];
    intro_video?: string;
    experience_years?: number;
    is_public?: boolean;
  },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId);
  if (error) throw error;
}

/* ── Training Request ───────────────────────────────────────── */

export async function requestTraining(clientId: string, trainerId: string): Promise<void> {
  // Check for an existing link first to avoid RLS conflicts
  const { data: existing } = await supabase
    .from('trainer_client_links')
    .select('status')
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') {
      throw new Error('You are already training with this trainer.');
    }
    if (existing.status === 'pending') {
      throw new Error('You already have a pending request with this trainer.');
    }
  }

  const { error } = await supabase
    .from('trainer_client_links')
    .upsert(
      { trainer_id: trainerId, client_id: clientId, status: 'pending' },
      { onConflict: 'trainer_id,client_id' },
    );
  if (error) throw error;
}
