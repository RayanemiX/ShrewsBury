// ============================================================
// CONFIGURATION SUPABASE
// ============================================================
// 1. Va sur https://supabase.com -> crée un projet (gratuit).
// 2. Dans le projet : Settings -> API.
// 3. Copie "Project URL" et colle-le dans SUPABASE_URL ci-dessous.
// 4. Copie la clé "anon public" et colle-la dans SUPABASE_ANON_KEY.
// 5. Crée la table avec le script SQL fourni dans README.md.
//
// ATTENTION : cette clé "anon" est visible par tout le monde
// (site sans login). C'est normal et attendu pour ce projet,
// mais ça veut dire que TOUTE personne ayant le lien du site
// pourra lire et ajouter des factures. Ne mets jamais ici la
// clé "service_role" (celle-là doit toujours rester secrète).
// ============================================================

const SUPABASE_URL = "https://VOTRE-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "VOTRE_CLE_ANON_PUBLIC";
