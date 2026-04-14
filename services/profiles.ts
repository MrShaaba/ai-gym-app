import { supabase } from '@/config/supabase';

export interface Profile {
  id: string;
  role: 'client' | 'trainer';
  plan_tier?: 'free' | 'premium';
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  admin_override?: boolean;
  full_name: string;
  avatar_url: string | null;
  goal: string | null;
  bio: string | null;
  username: string | null;
  specialties: string[];
  certifications: string[];
  intro_video: string | null;
  experience_years: number;
  is_public: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

/** Fetch a single profile by user id. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/** Update a profile. Only the fields provided will change. */
export async function updateProfile(
  userId: string,
  fields: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'goal' | 'bio' | 'username' | 'specialties' | 'certifications' | 'intro_video' | 'experience_years' | 'is_public'>>,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
