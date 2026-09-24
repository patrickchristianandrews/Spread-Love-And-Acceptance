/*
  dashboard-config.js
  Fill these in from Supabase: Project Settings → API.
  See dashboard-setup.md, step 5.

  The URL and the anon (or "publishable") key are safe to publish on a
  static site: row-level security in supabase/schema.sql is what protects
  the data. NEVER put the service_role or "secret" key here.

  While these still hold the placeholder values, dashboard.html runs in
  preview mode with a sample household, and nothing is saved.
*/
window.TOL_DASHBOARD_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-OR-PUBLISHABLE-KEY'
};
