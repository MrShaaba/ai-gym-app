import { supabase } from '@/config/supabase';
import type { UserRole } from '@/types/user';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Create a new account. Supabase auth + profile trigger handles profile row.
 * The role and full_name are passed via user_metadata so the DB trigger can read them.
 */
export async function signUp({ email, password, fullName, role }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) throw error;
  return data;
}

/** Sign in with email + password. */
export async function signIn({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Sign out and clear local session. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get the current session (null if not logged in). */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthStateChange(
  callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription.unsubscribe;
}
