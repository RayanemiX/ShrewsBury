const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    }
);

window.supabaseClient = supabaseClient;
window.supabase = supabaseClient;

console.log("✓ Client Supabase initialisé");
