/**
 * Hypodermical Benelux — public Supabase config.
 *
 * The URL and anon key are PUBLIC by design — row-level security on the
 * database (see /supabase/schema.sql) is what protects data, not these
 * values. Replace the placeholders with your project's values from
 * Supabase → Project Settings → API. Keep them in sync with .env.
 */
window.HYPO_SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'your-anon-public-key'
};

/** True once real credentials have been pasted in. */
window.HYPO_SUPABASE.isConfigured = () =>
  !!window.HYPO_SUPABASE.url &&
  !window.HYPO_SUPABASE.url.includes('YOUR-PROJECT') &&
  !!window.HYPO_SUPABASE.anonKey &&
  !window.HYPO_SUPABASE.anonKey.includes('your-anon');
