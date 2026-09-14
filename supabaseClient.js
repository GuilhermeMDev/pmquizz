const SUPABASE_URL = 'https://jkpklrarbzsxujiwceju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0nklKeI6CsTQZ8BVvee6_g_6lVdOGiP';

if (window.supabase) {
    window.supabaseApp = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    window.supabaseApp = null;
    console.error("Supabase CDN failed to load. AdBlock or network issue?");
}
