import { createClient } from '@supabase/supabase-js';

// Credentials for the main Sunrays School database (Students/Teachers)
const SCHOOL_SUPABASE_URL = 'https://huswdxaskewutqnqqwgs.supabase.co';
const SCHOOL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1c3dkeGFza2V3dXRxbnFxd2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjIwNzYsImV4cCI6MjA3OTE5ODA3Nn0.-hphx6YhEWYApg10BOz2HNkEb4H2X7KmfrEgM8SZqsg';

export const schoolSupabase = createClient(SCHOOL_SUPABASE_URL, SCHOOL_SUPABASE_ANON_KEY);
