// Charge le SDK Supabase (via <script> CDN dans chaque page) puis crée le client.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
});
