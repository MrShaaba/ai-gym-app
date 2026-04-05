import { supabase } from '@/config/supabase';

export interface Profile {
  id: string;
  role: 'client' | 'trainer';
  full_name: string;
  avatar_url: string | null;
  goal: string | null;
  bio: string | null;
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
  fields: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'goal' | 'bio'>>,
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
