// ============================================================
// Shrewsbury Shotguns — Facturier
// ============================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ---------- Item rows state ----------
let itemIdCounter = 0;
let items = []; // {id, arme, serie, prix, qte}

function newItem() {
  itemIdCounter += 1;
  return { id: itemIdCounter, arme: '', serie: '', prix: '', qte: 1 };
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

function renderItemRows() {
  const container = document.getElementById('items-container');
  container.innerHTML = '';
  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      ${items.length > 1 ? '<button type="button" class="remove-row" data-id="' + it.id + '">RETIRER</button>' : ''}
      <div class="field">
        <label>Arme</label>
        <input type="text" class="it-arme" data-id="${it.id}" placeholder="Ex : Pistolet Combat MK2" value="${escapeAttr(it.arme)}">
      </div>
      <div class="field">
        <label>Numéro de série</label>
        <input type="text" class="it-serie" data-id="${it.id}" placeholder="Ex : SN-88214" value="${escapeAttr(it.serie)}">
      </div>
      <div class="field-row qty-price">
        <div class="field" style="margin-bottom:0;">
          <label>Quantité</label>
          <input type="number" min="1" class="it-qte" data-id="${it.id}" value="${it.qte}">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label>Prix unitaire ($)</label>
          <input type="number" min="0" step="1" class="it-prix" data-id="${it.id}" placeholder="0" value="${escapeAttr(it.prix)}">
        </div>
      </div>
    `;
    container.appendChild(row);
  });

  // wire events
  container.querySelectorAll('.remove-row').forEach((btn) => {
    btn.addEventListener('click', () => removeItemRow(Number(btn.dataset.id)));
  });
  container.querySelectorAll('.it-arme, .it-serie, .it-qte, .it-prix').forEach((input) => {
    input.addEventListener('input', onItemFieldChange);
  });
}

function onItemFieldChange(e) {
  const id = Number(e.target.dataset.id);
  const item = items.find((it) => it.id === id);
  if (!item) return;
  if (e.target.classList.contains('it-arme')) item.arme = e.target.value;
  if (e.target.classList.contains('it-serie')) item.serie = e.target.value;
  if (e.target.classList.contains('it-qte')) item.qte = Math.max(1, Number(e.target.value) || 1);
  if (e.target.classList.contains('it-prix')) item.prix = e.target.value;
  renderPreview();
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- Draft / current invoice state ----------
let currentInvoiceNumber = null; // null until saved
let currentSavedAt = null;

function getFormState() {
  return {
    acheteur_nom: document.getElementById('f-nom').value.trim(),
    acheteur_id_carte: document.getElementById('f-carte').value.trim(),
    ppa_numero: document.getElementById('f-ppa').value.trim(),
    permis_chasse_numero: document.getElementById('f-chasse').value.trim(),
    casier_judiciaire: document.getElementById('f-casier').value,
    casier_detail: document.getElementById('f-casier-detail').value.trim(),
    date_vente: document.getElementById('f-date').value,
    notes: document.getElementById('f-notes').value.trim(),
    items: items
      .filter((it) => it.arme.trim() !== '' || it.serie.trim() !== '' || Number(it.prix) > 0)
      .map((it) => ({
        arme: it.arme.trim(),
        serie: it.serie.trim(),
        qte: Math.max(1, Number(it.qte) || 1),
        prix: Number(it.prix) || 0,
      })),
  };
}

function computeTotal(itemsArr) {
  return itemsArr.reduce((sum, it) => sum + it.prix * it.qte, 0);
}

function renderPreview(overrideData, overrideNumber) {
  const data = overrideData || getFormState();
  const number = overrideNumber !== undefined ? overrideNumber : currentInvoiceNumber;

  document.getElementById('inv-number').textContent = number
    ? `FACTURE N° ${String(number).padStart(5, '0')}`
    : 'FACTURE N° BROUILLON';
  document.getElementById('inv-number').classList.toggle('draft', !number);

  document.getElementById('inv-date').textContent = `Date : ${fmtDate(data.date_vente || new Date())}`;
  document.getElementById('inv-nom').textContent = data.acheteur_nom || '—';
  document.getElementById('inv-carte').textContent = `N° carte d'identité : ${data.acheteur_id_carte || '—'}`;
  document.getElementById('inv-ppa').textContent = `PPA : ${data.ppa_numero || '—'}`;
  document.getElementById('inv-chasse').textContent = `Permis de chasse : ${data.permis_chasse_numero || '—'}`;

  let casierText = data.casier_judiciaire || '—';
  if (data.casier_judiciaire === 'Non vierge' && data.casier_detail) {
    casierText += ` (${data.casier_detail})`;
  }
  document.getElementById('inv-casier').textContent = `Casier judiciaire : ${casierText}`;

  const body = document.getElementById('inv-items-body');
  const validItems = data.items || [];
  if (validItems.length === 0) {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);font-family:var(--sans);padding:20px;">Aucune arme ajoutée</td></tr>`;
  } else {
    body.innerHTML = validItems
      .map(
        (it) => `
      <tr>
        <td class="designation">${escapeHtml(it.arme) || '—'}</td>
        <td>${escapeHtml(it.serie) || '—'}</td>
        <td class="num">${it.qte}</td>
        <td class="num">${fmtMoney(it.prix)}</td>
        <td class="num">${fmtMoney(it.prix * it.qte)}</td>
      </tr>`
      )
      .join('');
  }

  const total = computeTotal(validItems);
  document.getElementById('inv-subtotal').textContent = fmtMoney(total);
  document.getElementById('inv-total').textContent = fmtMoney(total);
  document.getElementById('inv-notes-footer').textContent = data.notes ? `Note : ${data.notes}` : '';

  return { data, total };
}

// ---------- Casier judiciaire detail toggle ----------
document.getElementById('f-casier').addEventListener('change', (e) => {
  document.getElementById('f-casier-detail-wrap').style.display =
    e.target.value === 'Non vierge' ? 'block' : 'none';
  renderPreview();
});

// ---------- Wire form inputs to live preview ----------
['f-nom', 'f-carte', 'f-ppa', 'f-chasse', 'f-casier-detail', 'f-date', 'f-notes'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => renderPreview());
});

// ---------- Add item / new invoice / save ----------
document.getElementById('add-item').addEventListener('click', addItemRow);

document.getElementById('btn-new').addEventListener('click', () => {
  items = [newItem()];
  currentInvoiceNumber = null;
  document.getElementById('f-nom').value = '';
  document.getElementById('f-carte').value = '';
  document.getElementById('f-ppa').value = '';
  document.getElementById('f-chasse').value = '';
  document.getElementById('f-casier').value = 'Vierge';
  document.getElementById('f-casier-detail').value = '';
  document.getElementById('f-casier-detail-wrap').style.display = 'none';
  document.getElementById('f-date').value = todayISO();
  document.getElementById('f-notes').value = '';
  document.getElementById('save-status').textContent = '';
  renderItemRows();
  renderPreview();
});

document.getElementById('btn-save').addEventListener('click', saveInvoice);

async function saveInvoice() {
  const statusEl = document.getElementById('save-status');
  const state = getFormState();

  if (!state.acheteur_nom) {
    statusEl.textContent = 'Le nom de l\'acheteur est requis.';
    statusEl.style.color = 'var(--red-dark)';
    return;
  }
  if (state.items.length === 0) {
    statusEl.textContent = 'Ajoute au moins une arme avec un prix.';
    statusEl.style.color = 'var(--red-dark)';
    return;
  }

  const total = computeTotal(state.items);
  statusEl.style.color = 'var(--muted)';
  statusEl.textContent = 'Enregistrement...';

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
    total: total,
    notes: state.notes,
  };

  const { data, error } = await supabase.from('invoices').insert(payload).select().single();

  if (error) {
    console.error(error);
    statusEl.textContent = "Erreur d'enregistrement — vérifie config.js et la table Supabase.";
    statusEl.style.color = 'var(--red-dark)';
    return;
  }

  currentInvoiceNumber = data.id;
  renderPreview(state, data.id);
  statusEl.textContent = `Facture N° ${String(data.id).padStart(5, '0')} enregistrée.`;
  statusEl.style.color = 'var(--brown-soft)';
  loadHistory();
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ---------- History ----------
async function loadHistory() {
  const body = document.getElementById('history-body');
  const sub = document.getElementById('history-sub');
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error(error);
    sub.textContent = "Impossible de charger l'historique — vérifie config.js et la table Supabase.";
    body.innerHTML = '';
    return;
  }

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
    items: row.items || [],
  };
  currentInvoiceNumber = row.id;
  renderPreview(data, row.id);
  document.getElementById('invoice').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- Export as image ----------
async function captureInvoice() {
  const node = document.getElementById('invoice');
  return html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });
}

document.getElementById('btn-download').addEventListener('click', async () => {
  const canvas = await captureInvoice();
  const link = document.createElement('a');
  const numLabel = currentInvoiceNumber ? String(currentInvoiceNumber).padStart(5, '0') : 'brouillon';
  link.download = `facture-shrewsbury-${numLabel}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.getElementById('btn-copy').addEventListener('click', async () => {
  const statusEl = document.getElementById('copy-status');
  try {
    const canvas = await captureInvoice();
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        statusEl.textContent = 'Image copiée dans le presse-papiers.';
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Copie impossible sur ce navigateur — utilise plutôt Télécharger.";
      }
    }, 'image/png');
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Erreur lors de la génération de l\'image.';
  }
});

// ---------- Init ----------
document.getElementById('f-date').value = todayISO();
items = [newItem()];
renderItemRows();
renderPreview();
loadHistory();
