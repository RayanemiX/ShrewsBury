-- =====================================================
-- SHREWSBURY ARMURERIE — SCHEMA SQL SUPABASE
-- À exécuter dans : Supabase > SQL Editor > New Query
-- =====================================================

-- Extension nécessaire pour UUID
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. RÔLES
-- =====================================================
create table if not exists roles (
  id serial primary key,
  code text unique not null,         -- pdg, co_pdg, directeur, responsable_logistique, employe, client
  label text not null,
  level int not null default 0,      -- niveau hiérarchique (plus haut = plus de droits)
  permissions jsonb default '{}'::jsonb
);

insert into roles (code, label, level, permissions) values
  ('pdg', 'PDG', 100, '{"all": true}'),
  ('co_pdg', 'Co-PDG', 90, '{"all": true}'),
  ('directeur', 'Directeur', 70, '{"catalogue": true, "commandes": true, "employes": true, "treso": true}'),
  ('responsable_logistique', 'Responsable Logistique', 50, '{"logistique": true, "stock": true}'),
  ('employe', 'Employé', 20, '{"commandes": true}'),
  ('client', 'Client', 0, '{}')
on conflict (code) do nothing;

-- =====================================================
-- 2. UTILISATEURS (lié à auth.users de Supabase)
-- =====================================================
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text references roles(code) default 'client',
  balance numeric(12,2) default 0,
  loyalty_points int default 0,
  status text default 'active',       -- active / suspended
  created_at timestamptz default now()
);

-- =====================================================
-- 3. CATÉGORIES
-- =====================================================
create table if not exists categories (
  id serial primary key,
  key text unique not null,           -- armes_feu, armes_blanches, equipement, munitions, reparation, divers
  name text not null,
  icon text
);

insert into categories (key, name, icon) values
  ('armes_feu', 'Armes à feu', '🔫'),
  ('armes_blanches', 'Armes blanches', '🗡️'),
  ('equipement', 'Équipement', '🦺'),
  ('munitions', 'Munitions', '💣'),
  ('reparation', 'Kits de réparation', '🧰'),
  ('divers', 'Matériel divers', '📦')
on conflict (key) do nothing;

-- =====================================================
-- 4. PRODUITS
-- =====================================================
create table if not exists products (
  id bigserial primary key,
  name text not null,
  description text,
  category text references categories(key),
  price numeric(12,2) not null,
  old_price numeric(12,2),
  stock int not null default 0,
  level_required int default 0,
  image text,
  images jsonb default '[]'::jsonb,    -- images supplémentaires
  active boolean default true,
  created_at timestamptz default now()
);

-- =====================================================
-- 5. COMMANDES & ITEMS
-- =====================================================
create table if not exists orders (
  id bigserial primary key,
  user_id uuid references users(id),
  total numeric(12,2) not null,
  status text default 'pending',       -- pending / accepted / refused / delivered
  comment text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  product_id bigint references products(id),
  quantity int not null,
  unit_price numeric(12,2) not null
);

-- =====================================================
-- 6. PROMOTIONS
-- =====================================================
create table if not exists promotions (
  id serial primary key,
  code text unique not null,
  percent numeric(5,2) not null,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- =====================================================
-- 7. INVENTAIRE (mouvements de stock)
-- =====================================================
create table if not exists inventory (
  id bigserial primary key,
  product_id bigint references products(id),
  change_qty int not null,            -- positif = entrée, négatif = sortie
  reason text,
  created_at timestamptz default now()
);

-- =====================================================
-- 8. CERTIFICATS
-- =====================================================
create table if not exists certificates (
  id bigserial primary key,
  order_id bigint references orders(id),
  serial_number text unique not null,
  user_id uuid references users(id),
  product_summary text,
  pdf_url text,
  created_at timestamptz default now()
);

-- =====================================================
-- 9. VÉHICULES (logistique)
-- =====================================================
create table if not exists vehicles (
  id serial primary key,
  name text not null,
  plate text unique,
  status text default 'disponible',     -- disponible / en_livraison / maintenance
  driver_id uuid references users(id),
  created_at timestamptz default now()
);

-- =====================================================
-- 10. FOURNISSEURS
-- =====================================================
create table if not exists suppliers (
  id serial primary key,
  name text not null,
  contact text,
  products_supplied text,
  created_at timestamptz default now()
);

create table if not exists supply_history (
  id bigserial primary key,
  supplier_id int references suppliers(id),
  product_id bigint references products(id),
  quantity int,
  cost numeric(12,2),
  received_at timestamptz default now()
);

-- =====================================================
-- 11. TRÉSORERIE
-- =====================================================
create table if not exists treasury (
  id bigserial primary key,
  type text not null,                 -- entrée / sortie / salaire / depense
  label text,
  amount numeric(12,2) not null,       -- positif ou négatif
  related_order bigint references orders(id),
  related_user uuid references users(id),
  created_at timestamptz default now()
);

-- =====================================================
-- 12. JOURNAL D'ACTIVITÉ
-- =====================================================
create table if not exists activity_logs (
  id bigserial primary key,
  user_id uuid references users(id),
  action text not null,               -- connexion, stock_update, order_validated, deletion, promo
  description text,
  created_at timestamptz default now()
);

-- =====================================================
-- 13. NOTIFICATIONS
-- =====================================================
create table if not exists notifications (
  id bigserial primary key,
  user_id uuid references users(id),   -- destinataire (null = direction/broadcast)
  type text not null,                  -- new_order / low_stock / new_client / new_promo
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =====================================================
-- 14. CLIENTS (vue dérivée pratique)
-- =====================================================
create or replace view clients_overview as
select
  u.id, u.name, u.email,
  coalesce(sum(o.total),0) as total_spent,
  u.loyalty_points,
  count(o.id) as orders_count
from users u
left join orders o on o.user_id = u.id and o.status = 'delivered'
where u.role = 'client'
group by u.id, u.name, u.email, u.loyalty_points;

-- =====================================================
-- 15. FONCTIONS & TRIGGERS
-- =====================================================

-- Décrémente le stock automatiquement à la création d'un order_item
create or replace function fn_decrement_stock()
returns trigger as $$
begin
  update products set stock = stock - NEW.quantity where id = NEW.product_id;
  insert into inventory (product_id, change_qty, reason) values (NEW.product_id, -NEW.quantity, 'Vente commande #' || NEW.order_id);
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_decrement_stock on order_items;
create trigger trg_decrement_stock
after insert on order_items
for each row execute function fn_decrement_stock();

-- Notification automatique de stock faible
create or replace function fn_notify_low_stock()
returns trigger as $$
begin
  if NEW.stock <= 5 then
    insert into notifications (type, message) values ('low_stock', 'Stock faible : ' || NEW.name || ' (' || NEW.stock || ' restants)');
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_low_stock on products;
create trigger trg_low_stock
after update of stock on products
for each row execute function fn_notify_low_stock();

-- Notification automatique de nouvelle commande
create or replace function fn_notify_new_order()
returns trigger as $$
begin
  insert into notifications (type, message) values ('new_order', 'Nouvelle commande #' || NEW.id || ' — ' || NEW.total || '$');
  insert into activity_logs (user_id, action, description) values (NEW.user_id, 'order_validated', 'Commande #' || NEW.id || ' créée');
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_new_order on orders;
create trigger trg_new_order
after insert on orders
for each row execute function fn_notify_new_order();

-- =====================================================
-- 16. SÉCURITÉ : ROW LEVEL SECURITY (RLS)
-- =====================================================
alter table users enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table promotions enable row level security;
alter table treasury enable row level security;
alter table activity_logs enable row level security;
alter table notifications enable row level security;

-- Lecture publique du catalogue
create policy "Produits visibles par tous" on products
  for select using (true);

-- Utilisateurs : chacun voit / modifie son propre profil
create policy "Voir son propre profil" on users
  for select using (auth.uid() = id);
create policy "Modifier son propre profil" on users
  for update using (auth.uid() = id);

-- Commandes : chacun voit ses propres commandes
create policy "Voir ses commandes" on orders
  for select using (auth.uid() = user_id);
create policy "Créer une commande" on orders
  for insert with check (auth.uid() = user_id);

create policy "Voir ses items de commande" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  );
create policy "Créer items de commande" on order_items
  for insert with check (true);

-- Promotions visibles par tous
create policy "Promotions visibles" on promotions
  for select using (true);

-- Direction : accès complet (à restreindre via une fonction is_direction() si besoin)
create or replace function is_direction()
returns boolean as $$
  select exists (
    select 1 from users where id = auth.uid()
    and role in ('pdg','co_pdg','directeur','responsable_logistique','employe')
  );
$$ language sql security definer;

create policy "Direction gere produits" on products
  for all using (is_direction()) with check (is_direction());
create policy "Direction gere commandes" on orders
  for all using (is_direction()) with check (is_direction());
create policy "Direction voit treso" on treasury
  for select using (is_direction());
create policy "Direction gere treso" on treasury
  for all using (is_direction()) with check (is_direction());
create policy "Direction voit logs" on activity_logs
  for select using (is_direction());
create policy "Direction voit notifs" on notifications
  for select using (is_direction());

-- =====================================================
-- 17. COMPTE ADMINISTRATEUR PAR DÉFAUT
-- =====================================================
-- ⚠️ Étape manuelle requise :
-- 1. Créez d'abord un utilisateur via Supabase Auth (Dashboard > Authentication > Add User)
--    avec l'email admin@shrewsbury.rp et un mot de passe sécurisé.
-- 2. Récupérez son UUID puis exécutez la requête suivante en remplaçant 'UUID_ICI' :
--
-- insert into users (id, name, email, role, balance)
-- values ('UUID_ICI', 'Administrateur', 'admin@shrewsbury.rp', 'pdg', 0);
--
-- Le mot de passe et l'email pourront ensuite être modifiés depuis
-- l'interface Direction > Paramètres.

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
