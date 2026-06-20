/* =====================================================
   SHREWSBURY ARMURERIE — APP.JS
   Logique frontend + intégration Supabase
===================================================== */

/* ---------- 1. CONFIGURATION SUPABASE ---------- */
// ⚠️ Remplacez ces valeurs par celles de votre projet Supabase
// (Project Settings > API)
const SUPABASE_URL  = 'https://VOTRE-PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON_PUBLIC';

let supabase = null;
let SUPABASE_READY = false;
try{
  if(window.supabase && SUPABASE_URL.includes('supabase.co') && !SUPABASE_URL.includes('VOTRE-PROJET')){
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    SUPABASE_READY = true;
  }
}catch(e){ console.warn('Supabase non initialisé', e); }

/* ---------- 2. ÉTAT GLOBAL ---------- */
const state = {
  user: null,            // { id, email, name, role, balance, loyalty_points }
  categories: [
    {key:'armes_feu', name:'Armes à feu', icon:'🔫'},
    {key:'armes_blanches', name:'Armes blanches', icon:'🗡️'},
    {key:'equipement', name:'Équipement', icon:'🦺'},
    {key:'munitions', name:'Munitions', icon:'💣'},
    {key:'reparation', name:'Kits de réparation', icon:'🧰'},
    {key:'divers', name:'Matériel divers', icon:'📦'},
  ],
  products: [],
  orders: [],
  employees: [],
  treasury: [],
  vehicles: [],
  suppliers: [],
  clients: [],
  logs: [],
  cart: JSON.parse(localStorage.getItem('shrewsbury_cart') || '[]'),
  promo: null,
  activeCategory: 'all',
  roleLevels: {
    'pdg': 100, 'co_pdg': 90, 'directeur': 70, 'responsable_logistique': 50, 'employe': 20
  }
};

/* ---------- 3. DONNÉES DÉMO (utilisées si Supabase n'est pas configuré) ---------- */
function seedDemoData(){
  state.products = [
    {id:1, name:'NobelSport J&G 12ga 2-3/4" 1-1/4oz #7.5', description:'Cartouches de chasse haute laiton, 250rd flat.', category:'munitions', price:119.99, old_price:null, stock:42, level_required:0, image:'https://placehold.co/300x300/17171b/e0202c?text=12GA'},
    {id:2, name:'NobelSport J&G 12ga 1oz #7.5', description:'25 cartouches cible, 1250fps.', category:'munitions', price:99.99, old_price:129.99, stock:8, level_required:0, image:'https://placehold.co/300x300/17171b/e0202c?text=12GA'},
    {id:3, name:'NobelSport J&G 12ga 1oz #8', description:'25 cartouches cible, 1250fps.', category:'munitions', price:99.99, old_price:null, stock:60, level_required:0, image:'https://placehold.co/300x300/17171b/e0202c?text=12GA'},
    {id:4, name:'Chargeur Hellcat 9mm 15rd', description:'Chargeur compatible, capacité étendue.', category:'equipement', price:29.99, old_price:null, stock:15, level_required:2, image:'https://placehold.co/300x300/17171b/e0202c?text=MAG'},
    {id:5, name:'Couteau de combat Shrewsbury', description:'Lame acier trempé, manche antidérapant.', category:'armes_blanches', price:45.00, old_price:60.00, stock:3, level_required:1, image:'https://placehold.co/300x300/17171b/e0202c?text=KNIFE'},
    {id:6, name:'Gilet pare-balles niveau IIIA', description:'Protection torse complète.', category:'equipement', price:350.00, old_price:null, stock:5, level_required:5, image:'https://placehold.co/300x300/17171b/e0202c?text=VEST'},
    {id:7, name:'Kit de réparation véhicule', description:'Trousse complète, répare 40% de la carrosserie.', category:'reparation', price:75.00, old_price:null, stock:20, level_required:0, image:'https://placehold.co/300x300/17171b/e0202c?text=REPAIR'},
    {id:8, name:'Pistolet semi-auto standard', description:'Arme de poing fiable, calibre 9mm.', category:'armes_feu', price:850.00, old_price:999.00, stock:6, level_required:3, image:'https://placehold.co/300x300/17171b/e0202c?text=PISTOL'},
  ];
  state.orders = [
    {id:1001, client:'John_Doe', total:219.98, status:'pending', date:'2026-06-18', items:[{name:'NobelSport 12ga',qty:2}]},
    {id:1002, client:'Maria_Lopez', total:850.00, status:'accepted', date:'2026-06-17', items:[{name:'Pistolet semi-auto',qty:1}]},
    {id:1003, client:'Tony_K', total:75.00, status:'delivered', date:'2026-06-15', items:[{name:'Kit de réparation',qty:1}]},
  ];
  state.employees = [
    {id:1, name:'Alex Morgan', email:'alex@shrewsbury.rp', role:'pdg', status:'active'},
    {id:2, name:'Sam Carter', email:'sam@shrewsbury.rp', role:'directeur', status:'active'},
    {id:3, name:'Lou Reed', email:'lou@shrewsbury.rp', role:'employe', status:'suspended'},
  ];
  state.treasury = [
    {date:'2026-06-19', type:'entrée', label:'Vente catalogue', amount:1240.50},
    {date:'2026-06-18', type:'sortie', label:'Salaires', amount:-800.00},
    {date:'2026-06-17', type:'sortie', label:'Réapprovisionnement', amount:-450.00},
  ];
  state.vehicles = [
    {name:'Mule', plate:'SHR-001', status:'En livraison', driver:'Sam Carter'},
    {name:'Pounder', plate:'SHR-002', status:'Disponible', driver:'-'},
  ];
  state.suppliers = [
    {name:'NobelSport J&G', contact:'contact@nobelsport.rp', products:'Munitions'},
    {name:'Springfield Armory', contact:'contact@springfield.rp', products:'Armes à feu, chargeurs'},
  ];
  state.clients = [
    {name:'John_Doe', email:'john@doe.rp', spent:1820.00, loyalty:120},
    {name:'Maria_Lopez', email:'maria@lopez.rp', spent:5400.00, loyalty:480},
  ];
  state.logs = [
    {time:'19/06 14:02', text:'Connexion de <b>Sam Carter</b>'},
    {time:'19/06 13:40', text:'Stock modifié : <b>Pistolet semi-auto</b> (-1)'},
    {time:'18/06 22:10', text:'Commande #1001 validée'},
  ];
}
seedDemoData();

/* ---------- 4. UTILITAIRES ---------- */
function money(v){ return '$' + Number(v).toFixed(2); }
function toast(msg, type=''){
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(()=> el.remove(), 3500);
}
function saveCart(){ localStorage.setItem('shrewsbury_cart', JSON.stringify(state.cart)); }
function logActivity(text){
  state.logs.unshift({time: new Date().toLocaleString('fr-FR'), text});
  renderLogs();
}

/* ---------- 5. NAVIGATION ---------- */
document.querySelectorAll('.nav-link').forEach(link=>{
  link.addEventListener('click', e=>{
    e.preventDefault();
    const view = link.dataset.view;
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+view).classList.add('active');
    document.getElementById('heroSection').style.display = view==='catalog' ? 'flex' : 'none';
    document.getElementById('mainNav').classList.remove('open');
    if(view==='orders') renderOrders();
    if(view==='profile') renderProfile();
    if(view==='direction') renderDirection();
  });
});
document.getElementById('burgerBtn').addEventListener('click', ()=>{
  document.getElementById('mainNav').classList.toggle('open');
});

/* ---------- 6. HERO CATEGORIES ---------- */
function renderHeroCategories(){
  const wrap = document.getElementById('heroCategories');
  wrap.innerHTML = state.categories.slice(0,3).map(c=>{
    const count = state.products.filter(p=>p.category===c.key).length;
    return `<div class="cat-card" data-cat="${c.key}">
      <div class="cat-arrow">→</div>
      <div class="cat-icon">${c.icon}</div>
      <div>
        <div class="cat-name">${c.name}</div>
        <div class="cat-count">${count}+ Items</div>
      </div>
    </div>`;
  }).join('');
  wrap.querySelectorAll('.cat-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      state.activeCategory = card.dataset.cat;
      renderFilters();
      renderProducts();
    });
  });
}

/* ---------- 7. FILTRES + CATALOGUE ---------- */
function renderFilters(){
  const wrap = document.getElementById('categoryFilters');
  const chips = [{key:'all', name:'Tout'}].concat(state.categories);
  wrap.innerHTML = chips.map(c=>`<button class="filter-chip ${state.activeCategory===c.key?'active':''}" data-cat="${c.key}">${c.icon||''} ${c.name}</button>`).join('');
  wrap.querySelectorAll('.filter-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.activeCategory = btn.dataset.cat;
      renderFilters();
      renderProducts();
    });
  });
}

function renderProducts(){
  const grid = document.getElementById('productsGrid');
  const query = (document.getElementById('searchInput').value||'').toLowerCase();
  let list = state.products.filter(p=>{
    const matchCat = state.activeCategory==='all' || p.category===state.activeCategory;
    const matchSearch = !query || p.name.toLowerCase().includes(query);
    return matchCat && matchSearch;
  });
  if(list.length===0){
    grid.innerHTML = `<p style="color:var(--grey-dim); grid-column:1/-1; text-align:center;">Aucun produit trouvé.</p>`;
    return;
  }
  grid.innerHTML = list.map(p=>{
    const catObj = state.categories.find(c=>c.key===p.category);
    const stockClass = p.stock===0 ? 'out' : (p.stock<=5 ? 'low' : '');
    const stockText = p.stock===0 ? 'Rupture de stock' : `Stock : ${p.stock}`;
    return `<div class="product-card">
      <div class="product-img">
        ${p.old_price ? '<span class="product-badge">PROMO</span>' : ''}
        ${p.level_required>0 ? `<span class="product-level">Niv. ${p.level_required}+</span>`:''}
        <img src="${p.image}" alt="${p.name}">
      </div>
      <div class="product-info">
        <span class="product-cat">${catObj?catObj.name:''}</span>
        <span class="product-name">${p.name}</span>
        <span class="product-desc">${p.description||''}</span>
        <span class="product-stock ${stockClass}">${stockText}</span>
        <div class="price-row">
          <span class="price-now">${money(p.price)}</span>
          ${p.old_price ? `<span class="price-old">${money(p.old_price)}</span>`:''}
        </div>
      </div>
      <button class="btn btn-primary" ${p.stock===0?'disabled':''} data-add="${p.id}">${p.stock===0?'Indisponible':'Ajouter au panier'}</button>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-add]').forEach(btn=>{
    btn.addEventListener('click', ()=> addToCart(Number(btn.dataset.add)));
  });
}

document.getElementById('searchInput').addEventListener('input', renderProducts);
document.getElementById('searchBtn').addEventListener('click', ()=>{
  document.getElementById('searchBar').classList.toggle('hidden');
});

/* ---------- 8. PANIER ---------- */
function addToCart(productId){
  const product = state.products.find(p=>p.id===productId);
  if(!product || product.stock===0) return;
  const existing = state.cart.find(i=>i.id===productId);
  if(existing){
    if(existing.qty < product.stock) existing.qty++;
    else toast('Stock maximum atteint', 'error');
  }else{
    state.cart.push({id:productId, qty:1});
  }
  saveCart();
  renderCart();
  toast(`${product.name} ajouté au panier`, 'success');
}

function renderCart(){
  const itemsWrap = document.getElementById('cartItems');
  const count = state.cart.reduce((s,i)=>s+i.qty,0);
  document.getElementById('cartCount').textContent = count;

  if(state.cart.length===0){
    itemsWrap.innerHTML = `<p style="color:var(--grey-dim); text-align:center; margin-top:2rem;">Votre panier est vide.</p>`;
  }else{
    itemsWrap.innerHTML = state.cart.map(item=>{
      const p = state.products.find(pr=>pr.id===item.id);
      if(!p) return '';
      return `<div class="cart-item">
        <img src="${p.image}" alt="${p.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${money(p.price)} x ${item.qty}</div>
        </div>
        <div class="qty-control">
          <button data-dec="${p.id}">−</button>
          <span>${item.qty}</span>
          <button data-inc="${p.id}">+</button>
        </div>
        <button class="remove-item" data-remove="${p.id}">✕</button>
      </div>`;
    }).join('');
  }

  itemsWrap.querySelectorAll('[data-inc]').forEach(b=>b.addEventListener('click',()=>changeQty(Number(b.dataset.inc),1)));
  itemsWrap.querySelectorAll('[data-dec]').forEach(b=>b.addEventListener('click',()=>changeQty(Number(b.dataset.dec),-1)));
  itemsWrap.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeFromCart(Number(b.dataset.remove))));

  updateCartTotal();
}

function changeQty(id, delta){
  const item = state.cart.find(i=>i.id===id);
  const product = state.products.find(p=>p.id===id);
  if(!item) return;
  item.qty += delta;
  if(item.qty<=0) return removeFromCart(id);
  if(item.qty > product.stock){ item.qty = product.stock; toast('Stock maximum atteint','error'); }
  saveCart(); renderCart();
}
function removeFromCart(id){
  state.cart = state.cart.filter(i=>i.id!==id);
  saveCart(); renderCart();
}
function updateCartTotal(){
  let total = state.cart.reduce((sum,item)=>{
    const p = state.products.find(pr=>pr.id===item.id);
    return p ? sum + p.price*item.qty : sum;
  },0);
  if(state.promo) total = total * (1 - state.promo.percent/100);
  document.getElementById('cartTotal').textContent = money(total);
}

document.getElementById('cartBtn').addEventListener('click', ()=>{
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('show');
});
document.getElementById('closeCartBtn').addEventListener('click', closeCart);
document.getElementById('overlay').addEventListener('click', ()=>{
  closeCart();
  closeAllModals();
});
function closeCart(){
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

document.getElementById('applyPromoBtn').addEventListener('click', ()=>{
  const code = document.getElementById('promoInput').value.trim().toUpperCase();
  const knownCodes = {'WELCOME10':10, 'VIP20':20, 'SHREW5':5};
  if(knownCodes[code]){
    state.promo = {code, percent: knownCodes[code]};
    toast(`Code "${code}" appliqué : -${knownCodes[code]}%`, 'success');
  }else{
    toast('Code promo invalide', 'error');
  }
  updateCartTotal();
});

document.getElementById('checkoutBtn').addEventListener('click', async ()=>{
  if(!state.user){ toast('Connectez-vous pour valider une commande', 'error'); openModal('authModal'); return; }
  if(state.cart.length===0){ toast('Votre panier est vide', 'error'); return; }

  const orderItems = state.cart.map(item=>{
    const p = state.products.find(pr=>pr.id===item.id);
    return {name:p.name, qty:item.qty, price:p.price};
  });
  let total = orderItems.reduce((s,i)=>s+i.price*i.qty,0);
  if(state.promo) total *= (1-state.promo.percent/100);

  const newOrder = {
    id: Date.now(),
    client: state.user.name,
    total: Number(total.toFixed(2)),
    status:'pending',
    date: new Date().toISOString().slice(0,10),
    items: orderItems
  };

  if(SUPABASE_READY){
    // Insertion réelle dans Supabase
    const { data, error } = await supabase.from('orders').insert([{
      user_id: state.user.id, total: newOrder.total, status:'pending'
    }]).select();
    if(error){ toast('Erreur lors de la commande', 'error'); return; }
  }

  state.orders.unshift(newOrder);
  state.cart = [];
  state.promo = null;
  saveCart();
  renderCart();
  closeCart();
  toast('Commande validée ! En attente de traitement.', 'success');
  logActivity(`Nouvelle commande de <b>${state.user.name}</b> — ${money(newOrder.total)}`);
  generateCertificate(newOrder);
});

/* ---------- 9. CERTIFICAT PDF ---------- */
function generateCertificate(order){
  if(!window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const serial = 'SHR-' + order.id;
  doc.setFillColor(10,10,12);
  doc.rect(0,0,210,297,'F');
  doc.setTextColor(224,32,44);
  doc.setFontSize(22);
  doc.text('SHREWSBURY ARMURERIE', 20, 30);
  doc.setTextColor(245,245,247);
  doc.setFontSize(14);
  doc.text('CERTIFICAT DE VENTE OFFICIEL', 20, 42);
  doc.setFontSize(11);
  doc.text(`Numéro de série : ${serial}`, 20, 60);
  doc.text(`Client : ${order.client}`, 20, 70);
  doc.text(`Date : ${order.date}`, 20, 80);
  doc.text('Produits achetés :', 20, 95);
  let y = 103;
  order.items.forEach(it=>{
    doc.text(`- ${it.name} x${it.qty}`, 25, y);
    y += 8;
  });
  doc.text(`Total : ${money(order.total)}`, 20, y+8);
  doc.setFontSize(9);
  doc.text('Conditions : la revente de cet équipement est strictement interdite sans accord écrit', 20, y+25);
  doc.text("de Shrewsbury Armurerie. Toute utilisation illégale dégage l'entreprise de toute responsabilité.", 20, y+31);
  doc.text('Signature électronique : Shrewsbury Armurerie ✦', 20, y+45);
  doc.save(`certificat_${serial}.pdf`);
}

/* ---------- 10. AUTHENTIFICATION ---------- */
function openModal(id){
  document.getElementById(id).classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function closeAllModals(){
  document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'));
  document.getElementById('overlay').classList.remove('show');
}
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById(btn.dataset.close).classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  });
});

document.getElementById('authBtn').addEventListener('click', ()=>{
  if(state.user){
    // déconnexion rapide via menu profil
    document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-profile').classList.add('active');
    document.getElementById('heroSection').style.display='none';
    renderProfile();
  }else{
    openModal('authModal');
  }
});

document.querySelectorAll('.auth-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.auth+'Form').classList.add('active');
  });
});

document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;

  if(SUPABASE_READY){
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if(error){ toast(error.message, 'error'); return; }
    await loadUserProfile(data.user);
  }else{
    // Mode démo sans Supabase
    state.user = { id:'demo', email, name: email.split('@')[0], role: email.includes('admin') ? 'pdg' : 'client', balance: 1500, loyalty_points: 80 };
  }
  applyUserSession();
  closeAllModals();
  toast('Connexion réussie', 'success');
});

document.getElementById('registerForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const pass = document.getElementById('registerPass').value;

  if(SUPABASE_READY){
    const { data, error } = await supabase.auth.signUp({ email, password: pass, options:{ data:{ name } } });
    if(error){ toast(error.message, 'error'); return; }
    toast('Compte créé ! Vérifiez votre email.', 'success');
  }else{
    state.user = { id:'demo', email, name, role:'client', balance:500, loyalty_points:0 };
    applyUserSession();
    toast('Compte créé (mode démo)', 'success');
  }
  closeAllModals();
});

document.getElementById('resetForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('resetEmail').value;
  if(SUPABASE_READY){
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if(error){ toast(error.message,'error'); return; }
  }
  toast('Lien de réinitialisation envoyé', 'success');
  closeAllModals();
});

async function loadUserProfile(authUser){
  const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
  state.user = data || { id:authUser.id, email:authUser.email, name:authUser.email.split('@')[0], role:'client', balance:0, loyalty_points:0 };
}

function applyUserSession(){
  const isDirection = state.user && ['pdg','co_pdg','directeur','responsable_logistique','employe'].includes(state.user.role);
  document.getElementById('navDirection').classList.toggle('hidden', !isDirection);
  document.getElementById('authBtn').title = state.user ? state.user.name : 'Compte';
}

/* ---------- 11. COMMANDES (CLIENT) ---------- */
function renderOrders(){
  const wrap = document.getElementById('ordersList');
  const myOrders = state.user ? state.orders.filter(o=>o.client===state.user.name) : [];
  if(myOrders.length===0){
    wrap.innerHTML = `<p style="color:var(--grey-dim); text-align:center;">Aucune commande pour le moment.</p>`;
    return;
  }
  const statusLabel = {pending:'En attente', accepted:'Acceptée', refused:'Refusée', delivered:'Livrée'};
  wrap.innerHTML = myOrders.map(o=>`
    <div class="order-card">
      <div><strong>Commande #${o.id}</strong><br><span style="color:var(--grey-dim); font-size:.85rem;">${o.date}</span></div>
      <div>${money(o.total)}</div>
      <span class="status-pill status-${o.status}">${statusLabel[o.status]}</span>
    </div>`).join('');
}

/* ---------- 12. PROFIL ---------- */
function renderProfile(){
  const wrap = document.getElementById('profileCard');
  if(!state.user){
    wrap.innerHTML = `<p style="text-align:center; color:var(--grey-dim);">Connectez-vous pour accéder à votre profil.</p>
      <button class="btn btn-primary" id="goLoginBtn" style="margin:1rem auto; display:block;">Se connecter</button>`;
    document.getElementById('goLoginBtn')?.addEventListener('click', ()=>openModal('authModal'));
    return;
  }
  const myOrders = state.orders.filter(o=>o.client===state.user.name);
  wrap.innerHTML = `
    <div class="profile-row"><span>Nom</span><span>${state.user.name}</span></div>
    <div class="profile-row"><span>Email</span><span>${state.user.email}</span></div>
    <div class="profile-row"><span>Rôle</span><span>${state.user.role}</span></div>
    <div class="profile-row"><span>Solde disponible</span><span>${money(state.user.balance||0)}</span></div>
    <div class="profile-row"><span>Points fidélité</span><span>${state.user.loyalty_points||0}</span></div>
    <div class="profile-row"><span>Commandes passées</span><span>${myOrders.length}</span></div>
    <button class="btn btn-outline" id="logoutBtn">Se déconnecter</button>
  `;
  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    if(SUPABASE_READY) await supabase.auth.signOut();
    state.user = null;
    applyUserSession();
    renderProfile();
    toast('Déconnecté');
  });
}

/* ---------- 13. DIRECTION : NAVIGATION INTERNE ---------- */
document.querySelectorAll('.dir-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.dir-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.dir-pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('pane-'+tab.dataset.tab).classList.add('active');
  });
});

function renderDirection(){
  renderDashboardKPI();
  renderCharts();
  renderLowStock();
  renderCatalogTable();
  renderOrdersTable();
  renderEmployeesTable();
  renderTreasury();
  renderVehiclesSuppliers();
  renderClientsTable();
  renderLogs();
}

/* ---------- 14. DASHBOARD KPI + CHARTS ---------- */
function renderDashboardKPI(){
  const revenue = state.orders.reduce((s,o)=>s+o.total,0);
  const kpis = [
    {label:"Chiffre d'affaires", value: money(revenue)},
    {label:'Commandes', value: state.orders.length},
    {label:'Employés connectés', value: state.employees.filter(e=>e.status==='active').length},
    {label:'Bénéfices journaliers', value: money(revenue*0.3)},
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k=>`
    <div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join('');
}

let revenueChart, topProductsChart, treasuryChart;
function renderCharts(){
  const ctx1 = document.getElementById('chartRevenue');
  const ctx2 = document.getElementById('chartTopProducts');
  if(revenueChart) revenueChart.destroy();
  if(topProductsChart) topProductsChart.destroy();

  revenueChart = new Chart(ctx1, {
    type:'line',
    data:{
      labels:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],
      datasets:[{label:'CA ($)', data:[320,480,290,610,540,720,890], borderColor:'#e0202c', backgroundColor:'rgba(224,32,44,.15)', fill:true, tension:.35}]
    },
    options:{plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9a9aa2'}, grid:{color:'#2a2a30'}}, y:{ticks:{color:'#9a9aa2'}, grid:{color:'#2a2a30'}}}}
  });

  const topProducts = [...state.products].slice(0,5);
  topProductsChart = new Chart(ctx2, {
    type:'doughnut',
    data:{
      labels: topProducts.map(p=>p.name.slice(0,18)),
      datasets:[{data: topProducts.map((p,i)=>20-i*2), backgroundColor:['#e0202c','#a3141d','#f1c40f','#9a9aa2','#2a2a30']}]
    },
    options:{plugins:{legend:{labels:{color:'#f5f5f7', font:{size:10}}}}}
  });
}

function renderTreasuryChart(){
  const ctx = document.getElementById('chartTreasury');
  if(treasuryChart) treasuryChart.destroy();
  treasuryChart = new Chart(ctx, {
    type:'bar',
    data:{
      labels: state.treasury.map(t=>t.date),
      datasets:[{label:'Montant', data: state.treasury.map(t=>t.amount), backgroundColor: state.treasury.map(t=>t.amount>0?'#2ecc71':'#e74c3c')}]
    },
    options:{plugins:{legend:{display:false}}, scales:{x:{ticks:{color:'#9a9aa2'}}, y:{ticks:{color:'#9a9aa2'}, grid:{color:'#2a2a30'}}}}
  });
}

function renderLowStock(){
  const low = state.products.filter(p=>p.stock<=5);
  const wrap = document.getElementById('lowStockList');
  wrap.innerHTML = low.length ? low.map(p=>`<div class="lowstock-item"><span>${p.name}</span><span style="color:var(--warning);">${p.stock} restants</span></div>`).join('')
    : '<p style="color:var(--grey-dim);">Aucun stock critique.</p>';
}

/* ---------- 15. GESTION CATALOGUE ---------- */
function renderCatalogTable(){
  const tbody = document.querySelector('#catalogTable tbody');
  tbody.innerHTML = state.products.map(p=>{
    const catObj = state.categories.find(c=>c.key===p.category);
    return `<tr>
      <td><img src="${p.image}"></td>
      <td>${p.name}</td>
      <td>${catObj?catObj.name:''}</td>
      <td>${money(p.price)}</td>
      <td>${p.old_price?money(p.old_price):'-'}</td>
      <td>${p.stock}</td>
      <td>${p.level_required}</td>
      <td>
        <button class="btn btn-small btn-outline" data-edit="${p.id}">Modifier</button>
        <button class="btn btn-small btn-danger" data-del="${p.id}">Suppr.</button>
      </td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click', ()=>openProductModal(Number(b.dataset.edit))));
  tbody.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>deleteProduct(Number(b.dataset.del))));
}

document.getElementById('addProductBtn').addEventListener('click', ()=>openProductModal(null));

function openProductModal(id){
  const isEdit = id !== null;
  document.getElementById('productModalTitle').textContent = isEdit ? 'Modifier le produit' : 'Ajouter un produit';
  if(isEdit){
    const p = state.products.find(pr=>pr.id===id);
    document.getElementById('productId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pDesc').value = p.description||'';
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pOldPrice').value = p.old_price||'';
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pLevel').value = p.level_required;
    document.getElementById('pImage').value = p.image;
  }else{
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
  }
  openModal('productModal');
}

document.getElementById('productForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const payload = {
    name: document.getElementById('pName').value,
    description: document.getElementById('pDesc').value,
    category: document.getElementById('pCategory').value,
    price: parseFloat(document.getElementById('pPrice').value),
    old_price: document.getElementById('pOldPrice').value ? parseFloat(document.getElementById('pOldPrice').value) : null,
    stock: parseInt(document.getElementById('pStock').value),
    level_required: parseInt(document.getElementById('pLevel').value)||0,
    image: document.getElementById('pImage').value || 'https://placehold.co/300x300/17171b/e0202c?text=ITEM'
  };

  if(SUPABASE_READY){
    if(id){ await supabase.from('products').update(payload).eq('id', id); }
    else{ await supabase.from('products').insert([payload]); }
    await loadProductsFromSupabase();
  }else{
    if(id){
      const idx = state.products.findIndex(p=>p.id===Number(id));
      state.products[idx] = {...state.products[idx], ...payload};
    }else{
      payload.id = Math.max(0,...state.products.map(p=>p.id))+1;
      state.products.push(payload);
    }
  }
  renderCatalogTable();
  renderProducts();
  renderHeroCategories();
  closeAllModals();
  toast('Produit enregistré', 'success');
  logActivity(`Produit <b>${payload.name}</b> ${id?'modifié':'ajouté'}`);
});

function deleteProduct(id){
  if(!confirm('Supprimer ce produit ?')) return;
  state.products = state.products.filter(p=>p.id!==id);
  if(SUPABASE_READY) supabase.from('products').delete().eq('id', id);
  renderCatalogTable();
  renderProducts();
  toast('Produit supprimé', 'success');
  logActivity('Produit supprimé');
}

/* ---------- 16. GESTION COMMANDES (DIRECTION) ---------- */
function renderOrdersTable(){
  const tbody = document.querySelector('#ordersTable tbody');
  const statusLabel = {pending:'En attente', accepted:'Acceptée', refused:'Refusée', delivered:'Livrée'};
  tbody.innerHTML = state.orders.map(o=>`
    <tr>
      <td>#${o.id}</td>
      <td>${o.client}</td>
      <td>${money(o.total)}</td>
      <td><span class="status-pill status-${o.status}">${statusLabel[o.status]}</span></td>
      <td>${o.date}</td>
      <td>
        <button class="btn btn-small btn-success" data-status="${o.id}|accepted">Accepter</button>
        <button class="btn btn-small btn-danger" data-status="${o.id}|refused">Refuser</button>
        <button class="btn btn-small btn-outline" data-status="${o.id}|delivered">Livrée</button>
        <button class="btn btn-small btn-outline" data-pdf="${o.id}">PDF</button>
      </td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-status]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const [id, status] = b.dataset.status.split('|');
      updateOrderStatus(Number(id), status);
    });
  });
  tbody.querySelectorAll('[data-pdf]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const order = state.orders.find(o=>o.id===Number(b.dataset.pdf));
      generateCertificate(order);
    });
  });
}

function updateOrderStatus(id, status){
  const order = state.orders.find(o=>o.id===id);
  order.status = status;
  if(SUPABASE_READY) supabase.from('orders').update({status}).eq('id', id);
  renderOrdersTable();
  renderOrders();
  toast(`Commande #${id} → ${status}`, 'success');
  logActivity(`Commande #${id} marquée <b>${status}</b>`);
}

/* ---------- 17. GESTION EMPLOYÉS ---------- */
function renderEmployeesTable(){
  const tbody = document.querySelector('#employeesTable tbody');
  tbody.innerHTML = state.employees.map(emp=>`
    <tr>
      <td>${emp.name}</td>
      <td>${emp.email}</td>
      <td>
        <select data-role="${emp.id}">
          ${Object.keys(state.roleLevels).map(r=>`<option value="${r}" ${emp.role===r?'selected':''}>${r}</option>`).join('')}
        </select>
      </td>
      <td><span class="status-pill ${emp.status==='active'?'status-accepted':'status-refused'}">${emp.status}</span></td>
      <td><button class="btn btn-small btn-outline" data-suspend="${emp.id}">${emp.status==='active'?'Suspendre':'Réactiver'}</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-role]').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const emp = state.employees.find(e=>e.id===Number(sel.dataset.role));
      emp.role = sel.value;
      toast(`Grade de ${emp.name} mis à jour`, 'success');
      logActivity(`Grade de <b>${emp.name}</b> changé en ${sel.value}`);
    });
  });
  tbody.querySelectorAll('[data-suspend]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const emp = state.employees.find(e=>e.id===Number(b.dataset.suspend));
      emp.status = emp.status==='active' ? 'suspended' : 'active';
      renderEmployeesTable();
      logActivity(`Accès de <b>${emp.name}</b> ${emp.status==='active'?'réactivé':'suspendu'}`);
    });
  });
}

document.getElementById('addEmployeeBtn').addEventListener('click', ()=>{
  const name = prompt('Nom de l\'employé :');
  if(!name) return;
  const email = prompt('Email :') || '';
  state.employees.push({id: Date.now(), name, email, role:'employe', status:'active'});
  renderEmployeesTable();
  toast('Employé ajouté', 'success');
  logActivity(`Nouvel employé : <b>${name}</b>`);
});

/* ---------- 18. TRÉSORERIE ---------- */
function renderTreasury(){
  const tbody = document.querySelector('#treasuryTable tbody');
  tbody.innerHTML = state.treasury.map(t=>`
    <tr><td>${t.date}</td><td>${t.type}</td><td>${t.label}</td>
    <td style="color:${t.amount>0?'var(--success)':'var(--danger)'}">${t.amount>0?'+':''}${money(t.amount)}</td></tr>`).join('');

  const totalIn = state.treasury.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  const totalOut = state.treasury.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0);
  document.getElementById('treasuryKpi').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Entrées</div><div class="kpi-value" style="color:var(--success)">${money(totalIn)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Sorties</div><div class="kpi-value" style="color:var(--danger)">${money(totalOut)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Solde net</div><div class="kpi-value">${money(totalIn+totalOut)}</div></div>
  `;
  renderTreasuryChart();
}

/* ---------- 19. LOGISTIQUE ---------- */
function renderVehiclesSuppliers(){
  document.querySelector('#vehiclesTable tbody').innerHTML = state.vehicles.map(v=>`
    <tr><td>${v.name}</td><td>${v.plate}</td><td>${v.status}</td><td>${v.driver}</td></tr>`).join('');
  document.querySelector('#suppliersTable tbody').innerHTML = state.suppliers.map(s=>`
    <tr><td>${s.name}</td><td>${s.contact}</td><td>${s.products}</td></tr>`).join('');
}

/* ---------- 20. CLIENTS ---------- */
function renderClientsTable(){
  document.querySelector('#clientsTable tbody').innerHTML = [...state.clients]
    .sort((a,b)=>b.spent-a.spent)
    .map(c=>`<tr><td>${c.name}</td><td>${c.email}</td><td>${money(c.spent)}</td><td>${c.loyalty} pts</td></tr>`).join('');
}

/* ---------- 21. LOGS ---------- */
function renderLogs(){
  const wrap = document.getElementById('logsList');
  if(!wrap) return;
  wrap.innerHTML = state.logs.map(l=>`<div class="log-item"><span>${l.text}</span><span>${l.time}</span></div>`).join('');
}

/* ---------- 22. PARAMÈTRES ADMIN ---------- */
document.getElementById('adminSettingsForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const companyName = document.getElementById('settingCompanyName').value;
  const adminEmail = document.getElementById('settingAdminEmail').value;
  const adminPass = document.getElementById('settingAdminPass').value;

  if(SUPABASE_READY && adminPass){
    const { error } = await supabase.auth.updateUser({ password: adminPass });
    if(error){ toast(error.message, 'error'); return; }
  }
  toast('Paramètres enregistrés', 'success');
  logActivity('Paramètres administrateur mis à jour');
});

/* ---------- 23. CHARGEMENT SUPABASE (si configuré) ---------- */
async function loadProductsFromSupabase(){
  const { data, error } = await supabase.from('products').select('*');
  if(!error && data && data.length) state.products = data;
}

async function initSupabaseData(){
  if(!SUPABASE_READY) return;
  await loadProductsFromSupabase();
  const { data: ordersData } = await supabase.from('orders').select('*');
  if(ordersData) state.orders = ordersData;

  const { data: session } = await supabase.auth.getSession();
  if(session?.session?.user){
    await loadUserProfile(session.session.user);
    applyUserSession();
  }
  renderAll();
}

/* ---------- 24. INITIALISATION GÉNÉRALE ---------- */
function renderAll(){
  renderHeroCategories();
  renderFilters();
  renderProducts();
  renderCart();
}

renderAll();
applyUserSession();
if(SUPABASE_READY) initSupabaseData();
