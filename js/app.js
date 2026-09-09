// =========================================================================
// Helpers communs à toutes les pages (après supabaseClient.js)
// =========================================================================

const NAV_ITEMS = [
  { key: "dashboard",     label: "Tableau de bord",   href: "dashboard.html",     roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "caisse",        label: "Caisse / Facture",  href: "caisse.html",        roles: ["pdg","gestionnaire"] },
  { key: "comptabilite",  label: "Comptabilité",      href: "comptabilite.html",  roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "stock",         label: "Stock",             href: "stock.html",         roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "calculateur",   label: "Calculateur",       href: "calculateur.html",   roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "employes",      label: "Employés",          href: "employes.html",      roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "clients",       label: "Clients",           href: "clients.html",       roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "fournisseurs",  label: "Fournisseurs",      href: "fournisseurs.html",   roles: ["pdg","gestionnaire","gouvernement"] },
  { key: "comptes",       label: "Comptes / accès",   href: "comptes.html",       roles: ["pdg"] },
];

const ROLE_LABEL = { pdg: "PDG", gestionnaire: "Gestionnaire", gouvernement: "Gouvernement" };

// Vérifie la session + le rôle. allowedRoles = null => toute personne connectée.
async function requireAuth(allowedRoles = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = "index.html"; return null; }

  const { data: profile, error } = await supabase
    .from("profiles").select("*").eq("id", session.user.id).single();

  if (error || !profile || !profile.actif) {
    await supabase.auth.signOut();
    window.location.href = "index.html";
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    alert("Votre rôle (" + ROLE_LABEL[profile.role] + ") n'a pas accès à cette page.");
    window.location.href = "dashboard.html";
    return null;
  }
  window.__profile = profile;
  renderSidebar(profile);
  return { user: session.user, profile };
}

function renderSidebar(profile) {
  const el = document.getElementById("sidebar");
  if (!el) return;
  const current = location.pathname.split("/").pop();
  const links = NAV_ITEMS
    .filter(i => i.roles.includes(profile.role))
    .map(i => `<div class="nav-link ${i.href === current ? "active" : ""}" onclick="location.href='${i.href}'">${i.label}</div>`)
    .join("");

  el.innerHTML = `
    <div class="brand">
      <img src="assets/logo.png" onerror="this.style.display='none'">
      <div>
        <div class="name">SHREWSBURY</div>
        <div class="sub">ARMORY · ERP</div>
      </div>
    </div>
    ${links}
    <div class="sidebar-foot">
      <div><span class="role-pill">${ROLE_LABEL[profile.role]}</span></div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${profile.nom}</div>
      <button class="btn-logout" onclick="doLogout()">Se déconnecter</button>
    </div>`;
}

async function doLogout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// ---------- formatage ----------
function money(n) {
  n = Number(n || 0);
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " $";
}
function dateFR(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR");
}
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n;]/.test(s) ? `"${s}"` : s;
}
function downloadCSV(filename, rows) {
  const content = rows.map(r => r.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { return false; }
}
