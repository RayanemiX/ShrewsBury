// js/supabaseClient.js

window.supabaseClient = window.supabase.createClient(
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

console.log("Supabase client initialisé :", window.supabaseClient);
