import { createClient } from '@supabase/supabase-js';

/**
 * Expo Router discovers legacy native modules while loading the web shell.
 * Their imports must not require a hosted project or initialize remote auth.
 * The functional web application uses web/api.ts and the local Node API.
 * Any accidental legacy HTTP operation fails explicitly, without a network call.
 */
export const supabase = createClient(
  'http://127.0.0.1:8094',
  'disabled-local-web-adapter',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async () => {
        throw new Error(
          'Hosted Supabase is not connected in this web workspace. Use the local API adapter.',
        );
      },
    },
  },
);
