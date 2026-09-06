// ============================================================
// Shrewsbury Shotguns — Facturier
// ============================================================

// ---------- Fatal error banner ----------
// If ANYTHING below throws, we show it on screen instead of failing
// silently (which looks like "nothing works").
function showFatalError(message) {
  let banner = document.getElementById('fatal-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'fatal-error-banner';
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;background:#8F1420;color:#fff;' +
      'font-family:monospace;font-size:13px;padding:10px 16px;text-align:left;';
    document.body.prepend(banner);
  }
  banner.innerHTML =
    '<strong>Erreur JavaScript :</strong> ' + escapeHtmlSafe(message) +
    ' — vérifie que index.html, app.js, catalog.js et config.js sont tous à jour et bien présents (ouvre la console F12 pour le détail).';
}
function escapeHtmlSafe(str) {
  return String(str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
window.addEventListener('error', (e) => showFatalError(e.message));

// ---------- DOM helpers (never crash if an element is missing) ----------
const $ = (id) => document.getElementById(id);
function on(id, event, handler) {
  const el = $(id);
  if (!el) {
    console.warn(`[Shrewsbury] Élément #${id} introuvable — vérifie index.html.`);
    return;
  }
  el.addEventListener(event, handler);
}

// ---------- Small utils ----------
const fmtMoney = (n) => {
  const val = Number(n) || 0;
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' $';
};
const fmtDate = (isoOrDate) => {
  if (!isoOrDate) return '—';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Catalog (defensive: works even if catalog.js failed to load) ----------
const SAFE_CATALOG = typeof CATALOG !== 'undefined' && Array.isArray(CATALOG) ? CATALOG : [];
const safeFindCatalogItem = typeof findCatalogItem === 'function' ? findCatalogItem : () => null;
if (SAFE_CATALOG.length === 0) {
  console.warn('[Shrewsbury] catalog.js introuvable ou vide — le menu déroulant de produits sera vide.');
}

// ---------- Supabase client (isolated: a bad config must never
// block the rest of the app, especially the live preview) ----------
let supabase = null;
try {
  if (typeof window.supabase === 'undefined') throw new Error('librairie supabase-js non chargée');
  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    throw new Error('config.js manquant ou incomplet');
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('Supabase non configuré correctement :', err);
}

// ---------- Item rows state ----------
let itemIdCounter = 0;
let items = []; // {id, name, custom, category, requiresHunting, serie, prix, qte, remise}

function newItem() {
  itemIdCounter += 1;
  return {
    id: itemIdCounter,
    name: '',
    custom: false,
    category: '',
    requiresHunting: false,
    serie: '',
    prix: '',
    qte: 1,
    remise: 0,
  };
}

function addItemRow() {
  items.push(newItem());
  renderItemRows();
  renderPreview();
}

function removeItemRow(id) {
  if (items.length <= 1) return; // keep at least one row
  items = items.filter((it) => it.id !== id);
  renderItemRows();
  renderPreview();
}

function buildCatalogOptions(selectedName) {
  let html = `<option value="" ${!selectedName ? 'selected' : ''}>— Choisir un produit —</option>`;
  SAFE_CATALOG.forEach((group) => {
    html += `<optgroup label="${escapeAttr(group.category)}">`;
    group.items.forEach((it) => {
      const sel = it.name === selectedName ? 'selected' : '';
      html += `<option value="${escapeAttr(it.name)}" ${sel}>${escapeHtml(it.name)} — ${fmtMoney(it.price)}</option>`;
    });
    html += `</optgroup>`;
  });
  html += `<option value="__custom__" ${selectedName === '__custom__' ? 'selected' : ''}>Autre (saisie libre)</option>`;
  return html;
}

function renderItemRows() {
  const container = $('items-container');
  if (!container) return;
  container.innerHTML = '';
  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    const selectedValue = it.custom ? '__custom__' : it.name;
    row.innerHTML = `
      ${items.length > 1 ? '<button type="button" class="remove-row" data-id="' + it.id + '">RETIRER</button>' : ''}
      <div class="field">
        <label>Produit</label>
        <select class="it-select" data-id="${it.id}">
          ${buildCatalogOptions(selectedValue)}
        </select>
      </div>
      ${it.custom ? `
      <div class="field">
        <label>Nom du produit (personnalisé)</label>
        <input type="text" class="it-custom-name" data-id="${it.id}" placeholder="Ex : Fusil artisanal" value="${escapeAttr(it.name)}">
      </div>` : ''}
      <div class="field">
        <label>Numéro de série (optionnel)</label>
        <input type="text" class="it-serie" data-id="${it.id}" placeholder="Ex : SN-88214" value="${escapeAttr(it.serie)}">
      </div>
      <div class="field-row price-discount">
        <div class="field" style="margin-bottom:0;">
          <label>Quantité</label>
          <input type="number" min="1" class="it-qte" data-id="${it.id}" value="${it.qte}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Prix unitaire ($)</label>
          <input type="number" min="0" step="1" class="it-prix" data-id="${it.id}" placeholder="0" value="${escapeAttr(it.prix)}">
        </div>
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>Réduction sur ce produit (%)</label>
        <input type="number" min="0" max="100" step="1" class="it-remise" data-id="${it.id}" placeholder="0" value="${it.remise || ''}">
      </div>
      ${it.requiresHunting ? `<div class="item-warning">Nécessite un permis de chasse valide</div>` : ''}
    `;
    container.appendChild(row);
  });

  // wire events
  container.querySelectorAll('.remove-row').forEach((btn) => {
    btn.addEventListener('click', () => removeItemRow(Number(btn.dataset.id)));
  });
  container.querySelectorAll('.it-select').forEach((sel) => {
    sel.addEventListener('change', onItemSelectChange);
  });
  container.querySelectorAll('.it-custom-name, .it-serie, .it-qte, .it-prix, .it-remise').forEach((input) => {
    input.addEventListener('input', onItemFieldChange);
  });
}

function onItemSelectChange(e) {
  const id = Number(e.target.dataset.id);
  const item = items.find((it) => it.id === id);
  if (!item) return;
  const value = e.target.value;
  if (value === '__custom__') {
    item.custom = true;
    item.name = '';
    item.category = '';
    item.requiresHunting = false;
  } else {
    const catalogItem = safeFindCatalogItem(value);
    item.custom = false;
    item.name = value;
    item.prix = catalogItem ? catalogItem.price : item.prix;
    item.category = catalogItem ? catalogItem.category : '';
    item.requiresHunting = catalogItem ? !!catalogItem.requiresHunting : false;
  }
  renderItemRows();
  renderPreview();
}

function onItemFieldChange(e) {
  const id = Number(e.target.dataset.id);
  const item = items.find((it) => it.id === id);
  if (!item) return;
  if (e.target.classList.contains('it-custom-name')) item.name = e.target.value;
  if (e.target.classList.contains('it-serie')) item.serie = e.target.value;
  if (e.target.classList.contains('it-qte')) item.qte = Math.max(1, Number(e.target.value) || 1);
  if (e.target.classList.contains('it-prix')) item.prix = e.target.value;
  if (e.target.classList.contains('it-remise')) item.remise = Math.min(100, Math.max(0, Number(e.target.value) || 0));
  renderPreview();
}

// ---------- Draft / current invoice state ----------
let currentInvoiceNumber = null; // null until saved

function getFormState() {
  return {
    acheteur_nom: ($('f-nom')?.value || '').trim(),
    acheteur_id_carte: ($('f-carte')?.value || '').trim(),
    ppa_numero: ($('f-ppa')?.value || '').trim(),
    permis_chasse_numero: ($('f-chasse')?.value || '').trim(),
    casier_judiciaire: $('f-casier')?.value || 'Vierge',
    casier_detail: ($('f-casier-detail')?.value || '').trim(),
    date_vente: $('f-date')?.value || '',
    notes: ($('f-notes')?.value || '').trim(),
    discount_type: $('f-discount-type')?.value || 'none',
    discount_value: Number($('f-discount-value')?.value) || 0,
    items: items
      .filter((it) => it.name.trim() !== '' || it.serie.trim() !== '' || Number(it.prix) > 0)
      .map((it) => ({
        arme: it.name.trim(),
        serie: it.serie.trim(),
        qte: Math.max(1, Number(it.qte) || 1),
        prix: Number(it.prix) || 0,
        remise: Number(it.remise) || 0,
      })),
  };
}

function lineTotal(it) {
  const base = it.prix * it.qte;
  return base * (1 - (it.remise || 0) / 100);
}

function computeSubtotal(itemsArr) {
  return itemsArr.reduce((sum, it) => sum + lineTotal(it), 0);
}

function computeGlobalDiscount(subtotal, discountType, discountValue) {
  if (discountType === 'percent') return subtotal * (Math.min(100, discountValue) / 100);
  if (discountType === 'fixed') return Math.min(subtotal, discountValue);
  return 0;
}

function renderPreview(overrideData, overrideNumber) {
  const data = overrideData || getFormState();
  const number = overrideNumber !== undefined ? overrideNumber : currentInvoiceNumber;

  const numEl = $('inv-number');
  if (numEl) {
    numEl.textContent = number ? `FACTURE N° ${String(number).padStart(5, '0')}` : 'FACTURE N° BROUILLON';
    numEl.classList.toggle('draft', !number);
  }

  if ($('inv-date')) $('inv-date').textContent = `Date : ${fmtDate(data.date_vente || new Date())}`;
  if ($('inv-nom')) $('inv-nom').textContent = data.acheteur_nom || '—';
  if ($('inv-carte')) $('inv-carte').textContent = `N° carte d'identité : ${data.acheteur_id_carte || '—'}`;
  if ($('inv-ppa')) $('inv-ppa').textContent = `PPA : ${data.ppa_numero || '—'}`;
  if ($('inv-chasse')) $('inv-chasse').textContent = `Permis de chasse : ${data.permis_chasse_numero || '—'}`;

  let casierText = data.casier_judiciaire || '—';
  if (data.casier_judiciaire === 'Non vierge' && data.casier_detail) {
    casierText += ` (${data.casier_detail})`;
  }
  if ($('inv-casier')) $('inv-casier').textContent = `Casier judiciaire : ${casierText}`;

  const body = $('inv-items-body');
  const validItems = data.items || [];
  if (body) {
    if (validItems.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);font-family:var(--sans);padding:20px;">Aucun produit ajouté</td></tr>`;
    } else {
      body.innerHTML = validItems
        .map((it) => {
          const total = lineTotal(it);
          const remiseLabel = it.remise > 0 ? `-${it.remise}%` : '—';
          return `
        <tr>
          <td class="designation">${escapeHtml(it.arme) || '—'}</td>
          <td>${escapeHtml(it.serie) || '—'}</td>
          <td class="num">${it.qte}</td>
          <td class="num">${fmtMoney(it.prix)}</td>
          <td class="num" style="${it.remise > 0 ? 'color:var(--red-dark);' : ''}">${remiseLabel}</td>
          <td class="num">${fmtMoney(total)}</td>
        </tr>`;
        })
        .join('');
    }
  }

  const subtotal = computeSubtotal(validItems);
  const globalDiscount = computeGlobalDiscount(subtotal, data.discount_type, data.discount_value);
  const total = Math.max(0, subtotal - globalDiscount);

  if ($('inv-subtotal')) $('inv-subtotal').textContent = fmtMoney(subtotal);
  const discountRow = $('inv-global-discount-row');
  if (discountRow) {
    if (globalDiscount > 0) {
      discountRow.style.display = 'block';
      if ($('inv-global-discount')) $('inv-global-discount').textContent = `- ${fmtMoney(globalDiscount)}`;
    } else {
      discountRow.style.display = 'none';
    }
  }
  if ($('inv-total')) $('inv-total').textContent = fmtMoney(total);
  if ($('inv-notes-footer')) $('inv-notes-footer').textContent = data.notes ? `Note : ${data.notes}` : '';

  return { data, subtotal, globalDiscount, total };
}

// ---------- Wire static form controls ----------
on('f-discount-type', 'change', (e) => {
  const wrap = $('f-discount-value-wrap');
  if (wrap) wrap.style.display = e.target.value === 'none' ? 'none' : 'block';
  renderPreview();
});
on('f-discount-value', 'input', () => renderPreview());

on('f-casier', 'change', (e) => {
  const wrap = $('f-casier-detail-wrap');
  if (wrap) wrap.style.display = e.target.value === 'Non vierge' ? 'block' : 'none';
  renderPreview();
});

['f-nom', 'f-carte', 'f-ppa', 'f-chasse', 'f-casier-detail', 'f-date', 'f-notes'].forEach((id) => {
  on(id, 'input', () => renderPreview());
});

on('add-item', 'click', addItemRow);

on('btn-new', 'click', () => {
  items = [newItem()];
  currentInvoiceNumber = null;
  const setVal = (id, val) => { if ($(id)) $(id).value = val; };
  setVal('f-nom', '');
  setVal('f-carte', '');
  setVal('f-ppa', '');
  setVal('f-chasse', '');
  setVal('f-casier', 'Vierge');
  setVal('f-casier-detail', '');
  if ($('f-casier-detail-wrap')) $('f-casier-detail-wrap').style.display = 'none';
  setVal('f-date', todayISO());
  setVal('f-notes', '');
  setVal('f-discount-type', 'none');
  setVal('f-discount-value', '');
  if ($('f-discount-value-wrap')) $('f-discount-value-wrap').style.display = 'none';
  if ($('save-status')) $('save-status').textContent = '';
  renderItemRows();
  renderPreview();
});

on('btn-save', 'click', saveInvoice);

async function saveInvoice() {
  const statusEl = $('save-status');
  const setStatus = (msg, color) => {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = color;
    }
  };

  if (!supabase) {
    setStatus('Supabase non configuré — vérifie config.js.', 'var(--red-dark)');
    return;
  }

  const state = getFormState();

  if (!state.acheteur_nom) {
    setStatus("Le nom de l'acheteur est requis.", 'var(--red-dark)');
    return;
  }
  if (state.items.length === 0) {
    setStatus('Ajoute au moins un produit avec un prix.', 'var(--red-dark)');
    return;
  }

  const subtotal = computeSubtotal(state.items);
  const globalDiscount = computeGlobalDiscount(subtotal, state.discount_type, state.discount_value);
  const total = Math.max(0, subtotal - globalDiscount);

  setStatus('Enregistrement...', 'var(--muted)');

  const payload = {
    acheteur_nom: state.acheteur_nom,
    acheteur_id_carte: state.acheteur_id_carte,
    ppa_numero: state.ppa_numero,
    permis_chasse_numero: state.permis_chasse_numero,
    casier_judiciaire:
      state.casier_judiciaire === 'Non vierge' && state.casier_detail
        ? `${state.casier_judiciaire} (${state.casier_detail})`
        : state.casier_judiciaire,
    date_vente: state.date_vente || todayISO(),
    items: state.items,
    discount_type: state.discount_type,
    discount_value: state.discount_value,
    total: total,
    notes: state.notes,
  };

  try {
    const { data, error } = await supabase.from('invoices').insert(payload).select().single();
    if (error) throw error;

    currentInvoiceNumber = data.id;
    renderPreview(state, data.id);
    setStatus(`Facture N° ${String(data.id).padStart(5, '0')} enregistrée.`, 'var(--brown-soft)');
    loadHistory();
  } catch (err) {
    console.error(err);
    setStatus("Erreur d'enregistrement — vérifie config.js et la table Supabase.", 'var(--red-dark)');
  }
}

// ---------- History ----------
async function loadHistory() {
  const body = $('history-body');
  const sub = $('history-sub');
  if (!body || !sub) return;

  if (!supabase) {
    sub.textContent = "Supabase non configuré — modifie config.js pour activer l'historique.";
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Historique indisponible.</td></tr>`;
    return;
  }

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    sub.textContent = `${data.length} vente${data.length > 1 ? 's' : ''} enregistrée${data.length > 1 ? 's' : ''}.`;

    if (data.length === 0) {
      body.innerHTML = `<tr class="empty-row"><td colspan="5">Aucune vente enregistrée pour l'instant.</td></tr>`;
      return;
    }

    body.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${String(row.id).padStart(5, '0')}</td>
        <td>${fmtDate(row.date_vente)}</td>
        <td class="designation">${escapeHtml(row.acheteur_nom)}</td>
        <td class="num">${fmtMoney(row.total)}</td>
        <td><button type="button" class="small ghost btn-reprint" data-id="${row.id}">RÉIMPRIMER</button></td>
      </tr>`
      )
      .join('');

    body.querySelectorAll('.btn-reprint').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = data.find((r) => r.id === Number(btn.dataset.id));
        if (row) reprint(row);
      });
    });
  } catch (err) {
    console.error(err);
    sub.textContent = "Impossible de charger l'historique — vérifie config.js et la table Supabase.";
    body.innerHTML = '';
  }
}

function reprint(row) {
  const data = {
    acheteur_nom: row.acheteur_nom,
    acheteur_id_carte: row.acheteur_id_carte,
    ppa_numero: row.ppa_numero,
    permis_chasse_numero: row.permis_chasse_numero,
    casier_judiciaire: row.casier_judiciaire,
    casier_detail: '',
    date_vente: row.date_vente,
    notes: row.notes,
    discount_type: row.discount_type || 'none',
    discount_value: row.discount_value || 0,
    items: (row.items || []).map((it) => ({ ...it, remise: it.remise || 0 })),
  };
  currentInvoiceNumber = row.id;
  renderPreview(data, row.id);
  const inv = $('invoice');
  if (inv) inv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- Export as image ----------
async function captureInvoice() {
  if (typeof html2canvas === 'undefined') {
    throw new Error('html2canvas non chargé (vérifie ta connexion internet / le CDN)');
  }
  const node = $('invoice');
  return html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });
}

on('btn-download', 'click', async () => {
  try {
    const canvas = await captureInvoice();
    const link = document.createElement('a');
    const numLabel = currentInvoiceNumber ? String(currentInvoiceNumber).padStart(5, '0') : 'brouillon';
    link.download = `facture-shrewsbury-${numLabel}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error(err);
    if ($('copy-status')) $('copy-status').textContent = 'Erreur lors du téléchargement : ' + err.message;
  }
});

on('btn-copy', 'click', async () => {
  const statusEl = $('copy-status');
  try {
    const canvas = await captureInvoice();
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        if (statusEl) statusEl.textContent = 'Image copiée dans le presse-papiers.';
      } catch (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = 'Copie impossible sur ce navigateur — utilise plutôt Télécharger.';
      }
    }, 'image/png');
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = 'Erreur : ' + err.message;
  }
});

// ---------- Init ----------
function init() {
  if ($('f-date')) $('f-date').value = todayISO();
  items = [newItem()];
  renderItemRows();
  renderPreview();
  loadHistory();
}

try {
  init();
} catch (err) {
  console.error(err);
  showFatalError(err.message);
}
