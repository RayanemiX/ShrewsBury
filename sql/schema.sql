-- =========================================================================
-- SHREWSBURY ARMORY — ERP
-- Schéma Supabase (PostgreSQL) — à coller dans SQL Editor de votre projet
-- =========================================================================
-- Ordre d'exécution : ce fichier est déjà dans l'ordre, exécutez-le en une fois.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. PROFILS UTILISATEURS (rôles)
-- -------------------------------------------------------------------------
-- Un compte Supabase Auth = une ligne ici. Le rôle définit les permissions.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  role text not null check (role in ('pdg','gestionnaire','gouvernement')),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Fonction utilitaire : rôle de l'utilisateur connecté
create or replace function current_user_role()
returns text
language sql stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_pdg() returns boolean language sql stable
as $$ select current_user_role() = 'pdg'; $$;

create or replace function is_operateur() returns boolean language sql stable
as $$ select current_user_role() in ('pdg','gestionnaire'); $$;

create or replace function is_connecte() returns boolean language sql stable
as $$ select current_user_role() is not null; $$;

alter table profiles enable row level security;

create policy "profiles: lecture par tous les connectés" on profiles
  for select using (is_connecte());
create policy "profiles: seul le PDG gère les comptes" on profiles
  for all using (is_pdg()) with check (is_pdg());
-- Exception : un utilisateur peut toujours lire sa propre ligne (avant d'être répertorié ailleurs)
create policy "profiles: soi-même" on profiles
  for select using (auth.uid() = id);


-- -------------------------------------------------------------------------
-- 2. RESSOURCES (matières premières / peintures) + STOCK
-- -------------------------------------------------------------------------
create table if not exists resources (
  id uuid primary key default uuid_generate_v4(),
  nom text not null unique,
  quantite_stock numeric not null default 0,
  categorie text default 'materiau',       -- materiau / peinture / autre
  created_at timestamptz not null default now()
);

alter table resources enable row level security;
create policy "resources: lecture tous connectés" on resources for select using (is_connecte());
create policy "resources: écriture opérateurs" on resources for all using (is_operateur()) with check (is_operateur());


-- -------------------------------------------------------------------------
-- 3. ARTICLES (armes, munitions, équipements) + RECETTE (calculateur)
-- -------------------------------------------------------------------------
create table if not exists articles (
  id uuid primary key default uuid_generate_v4(),
  nom text not null unique,
  categorie text default 'arme',           -- arme / munition / equipement
  est_serialise boolean not null default false,   -- true = suivi par n° de série (armes)
  quantite_stock numeric not null default 0,      -- utilisé seulement si est_serialise = false
  prix numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Recette : quelles ressources et en quelle quantité pour fabriquer 1 unité
create table if not exists article_ressources (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references articles(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  quantite_requise numeric not null default 0,
  unique(article_id, resource_id)
);

alter table articles enable row level security;
alter table article_ressources enable row level security;
create policy "articles: lecture tous connectés" on articles for select using (is_connecte());
create policy "articles: écriture opérateurs" on articles for all using (is_operateur()) with check (is_operateur());
create policy "article_ressources: lecture tous connectés" on article_ressources for select using (is_connecte());
create policy "article_ressources: écriture opérateurs" on article_ressources for all using (is_operateur()) with check (is_operateur());


-- -------------------------------------------------------------------------
-- 4. STOCK D'ARMES SÉRIALISÉES
-- -------------------------------------------------------------------------
create table if not exists armes_stock (
  id uuid primary key default uuid_generate_v4(),
  article_id uuid not null references articles(id) on delete restrict,
  numero_serie text not null unique,
  statut text not null default 'en_stock' check (statut in ('en_stock','vendu','reserve','retire')),
  date_entree date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table armes_stock enable row level security;
create policy "armes_stock: lecture tous connectés" on armes_stock for select using (is_connecte());
create policy "armes_stock: écriture opérateurs" on armes_stock for all using (is_operateur()) with check (is_operateur());


-- -------------------------------------------------------------------------
-- 5. EMPLOYÉS + PAIEMENTS (salaire / prime / augmentation / commission)
-- -------------------------------------------------------------------------
create table if not exists employes (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  prenom text not null,
  poste text,
  date_entree date not null default current_date,
  statut text not null default 'actif' check (statut in ('actif','suspendu','licencie')),
  salaire_fixe numeric not null default 0,
  contrat_url text,             -- lien fichier (image/pdf) du contrat
  carte_identite_url text,      -- lien image carte d'identité
  created_at timestamptz not null default now()
);

create table if not exists employe_paiements (
  id uuid primary key default uuid_generate_v4(),
  employe_id uuid not null references employes(id) on delete cascade,
  type text not null check (type in ('salaire','prime','augmentation','commission')),
  montant numeric not null,
  description text,
  date_paiement date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table employes enable row level security;
alter table employe_paiements enable row level security;
create policy "employes: lecture tous connectés" on employes for select using (is_connecte());
create policy "employes: écriture opérateurs" on employes for all using (is_operateur()) with check (is_operateur());
create policy "employe_paiements: lecture tous connectés" on employe_paiements for select using (is_connecte());
create policy "employe_paiements: écriture opérateurs" on employe_paiements for all using (is_operateur()) with check (is_operateur());


-- -------------------------------------------------------------------------
-- 6. CLIENTS & FOURNISSEURS
-- -------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  prenom text not null,
  numero_ville text,
  carte_identite_url text,   -- URL uniquement (pas d'image stockée)
  permis_url text,
  created_at timestamptz not null default now()
);

create table if not exists fournisseurs (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  prenom text,
  numero_ville text,
  carte_identite_url text,
  permis_url text,
  created_at timestamptz not null default now()
);

alter table clients enable row level security;
alter table fournisseurs enable row level security;
create policy "clients: lecture tous connectés" on clients for select using (is_connecte());
create policy "clients: écriture opérateurs" on clients for all using (is_operateur()) with check (is_operateur());
create policy "fournisseurs: lecture tous connectés" on fournisseurs for select using (is_connecte());
create policy "fournisseurs: écriture opérateurs" on fournisseurs for all using (is_operateur()) with check (is_operateur());


-- -------------------------------------------------------------------------
-- 7. COMPTABILITÉ (= le grand livre ET l'historique consultable par le gouv)
-- -------------------------------------------------------------------------
create table if not exists comptabilite (
  id uuid primary key default uuid_generate_v4(),
  date_operation date not null default current_date,
  employe_id uuid references employes(id),
  type_operation text not null check (type_operation in ('Farming','Vente','Achat','Craft','Autre')),
  depense numeric not null default 0,
  recette numeric not null default 0,
  quantite_articles numeric not null default 0,
  quantite_ressources numeric not null default 0,
  depense_bois numeric not null default 0,
  depense_metal numeric not null default 0,
  depense_poudre numeric not null default 0,
  article_id uuid references articles(id),
  resource_id uuid references resources(id),
  client_fournisseur_nom text,
  facture_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table comptabilite enable row level security;
create policy "comptabilite: lecture tous connectés" on comptabilite for select using (is_connecte());
-- Le grand livre est un historique : uniquement INSERT pour les opérateurs, pas de modif/suppression
-- (garantit l'intégrité de l'historique consulté par le gouvernement)
create policy "comptabilite: insertion opérateurs" on comptabilite for insert with check (is_operateur());
create policy "comptabilite: update PDG seulement (corrections)" on comptabilite for update using (is_pdg()) with check (is_pdg());
create policy "comptabilite: delete PDG seulement" on comptabilite for delete using (is_pdg());


-- -------------------------------------------------------------------------
-- 8. FACTURES (caisse)
-- -------------------------------------------------------------------------
create table if not exists factures (
  id uuid primary key default uuid_generate_v4(),
  numero text not null unique,
  date_facture date not null default current_date,
  acheteur_nom text,
  acheteur_carte_identite text,
  ppa text,
  permis_chasse text,
  casier_judiciaire text,
  sous_total numeric not null default 0,
  remise numeric not null default 0,
  total numeric not null default 0,
  vendeur_id uuid references employes(id),
  client_id uuid references clients(id),
  statut text not null default 'brouillon' check (statut in ('brouillon','validee','annulee')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists facture_lignes (
  id uuid primary key default uuid_generate_v4(),
  facture_id uuid not null references factures(id) on delete cascade,
  article_id uuid not null references articles(id),
  numero_serie text,               -- rempli seulement si l'article est sérialisé
  quantite numeric not null default 1,
  prix_unitaire numeric not null default 0,
  remise_ligne numeric not null default 0,
  total_ligne numeric not null default 0
);

alter table factures enable row level security;
alter table facture_lignes enable row level security;
create policy "factures: lecture tous connectés" on factures for select using (is_connecte());
create policy "factures: écriture opérateurs" on factures for all using (is_operateur()) with check (is_operateur());
create policy "facture_lignes: lecture tous connectés" on facture_lignes for select using (is_connecte());
create policy "facture_lignes: écriture opérateurs" on facture_lignes for all using (is_operateur()) with check (is_operateur());

-- numéro de facture séquentiel type SA-000001
create sequence if not exists facture_seq start 1;
create or replace function generer_numero_facture()
returns text language sql as $$
  select 'SA-' || lpad(nextval('facture_seq')::text, 6, '0');
$$;


-- -------------------------------------------------------------------------
-- 9. FONCTIONS MÉTIER (RPC) — appelées depuis le site pour garantir la
--    cohérence stock <-> comptabilité en une seule transaction
-- -------------------------------------------------------------------------

-- 9.1 Enregistrer une opération de FARMING (ressource) : +stock ressource + ligne comptabilité
create or replace function fn_enregistrer_farming(
  p_resource_id uuid,
  p_quantite numeric,
  p_employe_id uuid,
  p_date date default current_date
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not is_operateur() then raise exception 'Non autorisé'; end if;

  update resources set quantite_stock = quantite_stock + p_quantite where id = p_resource_id;

  insert into comptabilite(date_operation, employe_id, type_operation, quantite_ressources,
                            resource_id, created_by)
  values (p_date, p_employe_id, 'Farming', p_quantite, p_resource_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- 9.2 Ajouter une nouvelle ressource (ex: mise à jour du jeu)
create or replace function fn_ajouter_ressource(p_nom text, p_categorie text default 'materiau')
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not is_operateur() then raise exception 'Non autorisé'; end if;
  insert into resources(nom, categorie) values (p_nom, p_categorie) returning id into v_id;
  return v_id;
end;
$$;

-- 9.2b Achat de ressource (fournisseur) : +stock ressource + dépense en comptabilité
create or replace function fn_enregistrer_achat(
  p_resource_id uuid,
  p_quantite numeric,
  p_depense numeric,
  p_employe_id uuid,
  p_fournisseur_nom text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not is_operateur() then raise exception 'Non autorisé'; end if;

  update resources set quantite_stock = quantite_stock + p_quantite where id = p_resource_id;

  insert into comptabilite(employe_id, type_operation, depense, quantite_ressources,
                            resource_id, client_fournisseur_nom, created_by)
  values (p_employe_id, 'Achat', p_depense, p_quantite, p_resource_id, p_fournisseur_nom, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- 9.3 Craft : consomme des ressources selon la recette d'un article, incrémente le stock
--     (pour armes sérialisées, fournir un numéro de série réel obligatoire)
create or replace function fn_crafter_article(
  p_article_id uuid,
  p_quantite numeric,
  p_employe_id uuid,
  p_numero_serie text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_rec record;
  v_id uuid;
  v_serialise boolean;
begin
  if not is_operateur() then raise exception 'Non autorisé'; end if;

  select est_serialise into v_serialise from articles where id = p_article_id;

  -- consomme chaque ressource de la recette, x quantité
  for v_rec in select resource_id, quantite_requise from article_ressources where article_id = p_article_id loop
    update resources set quantite_stock = quantite_stock - (v_rec.quantite_requise * p_quantite)
      where id = v_rec.resource_id;
  end loop;

  if v_serialise then
    if p_numero_serie is null or p_numero_serie = '' then
      raise exception 'Numéro de série obligatoire pour un article sérialisé';
    end if;
    insert into armes_stock(article_id, numero_serie) values (p_article_id, p_numero_serie);
  else
    update articles set quantite_stock = quantite_stock + p_quantite where id = p_article_id;
  end if;

  insert into comptabilite(employe_id, type_operation, quantite_articles, article_id, created_by)
  values (p_employe_id, 'Craft', p_quantite, p_article_id, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- 9.4 Valider une facture : décrémente les stocks vendus, verrouille la facture,
--     enregistre la vente en comptabilité + la commission de 5000$ au vendeur
create or replace function fn_valider_facture(p_facture_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_ligne record;
  v_facture record;
begin
  if not is_operateur() then raise exception 'Non autorisé'; end if;

  select * into v_facture from factures where id = p_facture_id;
  if v_facture.statut = 'validee' then
    raise exception 'Facture déjà validée';
  end if;

  for v_ligne in select * from facture_lignes where facture_id = p_facture_id loop
    if v_ligne.numero_serie is not null then
      update armes_stock set statut = 'vendu'
        where numero_serie = v_ligne.numero_serie and article_id = v_ligne.article_id;
    else
      update articles set quantite_stock = quantite_stock - v_ligne.quantite
        where id = v_ligne.article_id;
    end if;
  end loop;

  update factures set statut = 'validee' where id = p_facture_id;

  insert into comptabilite(employe_id, type_operation, recette, quantite_articles,
                            client_fournisseur_nom, facture_id, created_by)
  values (v_facture.vendeur_id, 'Vente', v_facture.total,
          (select coalesce(sum(quantite),0) from facture_lignes where facture_id = p_facture_id),
          v_facture.acheteur_nom, p_facture_id, auth.uid());

  if v_facture.vendeur_id is not null then
    insert into employe_paiements(employe_id, type, montant, description, created_by)
    values (v_facture.vendeur_id, 'commission', 5000, 'Commission vente facture ' || v_facture.numero, auth.uid());
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- 10. REALTIME : activer la publication sur les tables consultées en direct
-- -------------------------------------------------------------------------
alter publication supabase_realtime add table comptabilite;
alter publication supabase_realtime add table resources;
alter publication supabase_realtime add table articles;
alter publication supabase_realtime add table armes_stock;
alter publication supabase_realtime add table factures;
alter publication supabase_realtime add table facture_lignes;
alter publication supabase_realtime add table employes;
alter publication supabase_realtime add table employe_paiements;
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table fournisseurs;

-- =========================================================================
-- FIN DU SCHÉMA
-- Étape suivante : créez vos 3 comptes dans Authentication > Users, puis
-- ajoutez la ligne correspondante dans "profiles" (id, nom, role).
-- =========================================================================
