-- ============================================================
-- BATEU — Sistema de Alienação de Bens
-- Empresas colocam bens para venda direta, leasing, rent-to-own
-- ou leilão. Utilizadores enviam propostas e simulam contratos.
-- ============================================================

-- Funções auxiliares (idempotentes)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tabela principal de bens para alienação
create table if not exists public.alienacao_assets (
  id uuid primary key default gen_random_uuid(),
  business_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('viaturas','imoveis','equipamentos','frotas','maquinario','outros')),
  modality text not null default 'venda_direta' check (modality in ('venda_direta','leasing','rent_to_own','leilao')),
  description text,
  asset_value numeric(14,2) not null check (asset_value > 0),
  min_down_payment numeric(14,2) not null default 0,
  max_months integer not null default 36 check (max_months between 1 and 240),
  annual_rate numeric(6,4) not null default 0.1500,
  residual_pct numeric(5,4) not null default 0.2000,
  auction_deadline timestamptz,
  min_bid numeric(14,2),
  images text[] default '{}',
  province text,
  city text,
  condition text not null default 'usado' check (condition in ('novo','seminovo','usado')),
  brand text,
  model text,
  year integer,
  mileage integer,
  registration text,
  documents_ready boolean not null default false,
  warranty_months integer not null default 0,
  whatsapp text not null,
  status text not null default 'disponivel' check (status in ('disponivel','reservado','em_contrato','concluido','cancelado')),
  featured boolean not null default false,
  views_count integer not null default 0,
  offers_count integer not null default 0,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alienacao_assets_status on public.alienacao_assets(status);
create index if not exists idx_alienacao_assets_category on public.alienacao_assets(category);
create index if not exists idx_alienacao_assets_modality on public.alienacao_assets(modality);
create index if not exists idx_alienacao_assets_business on public.alienacao_assets(business_user_id);
create index if not exists idx_alienacao_assets_created on public.alienacao_assets(created_at desc);

-- Propostas dos utilizadores
create table if not exists public.alienacao_offers (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.alienacao_assets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  offer_type text not null check (offer_type in ('compra','leasing','rent_to_own','leilao')),
  amount numeric(14,2) not null check (amount > 0),
  down_payment numeric(14,2) not null default 0,
  months integer not null default 12,
  monthly_estimate numeric(14,2),
  name text not null,
  phone text not null,
  message text,
  status text not null default 'pendente' check (status in ('pendente','aceite','recusada','contraproposta')),
  created_at timestamptz not null default now()
);

create index if not exists idx_alienacao_offers_asset on public.alienacao_offers(asset_id);
create index if not exists idx_alienacao_offers_user on public.alienacao_offers(user_id);

-- Contratos de alienação (criados quando proposta aceite)
create table if not exists public.alienacao_leases (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.alienacao_assets(id) on delete cascade,
  offer_id uuid references public.alienacao_offers(id) on delete set null,
  tenant_user_id uuid references auth.users(id) on delete set null,
  contract_number text unique not null default ('AL-' || upper(substr(md5(random()::text), 1, 8))),
  modality text not null,
  asset_value numeric(14,2) not null,
  down_payment numeric(14,2) not null default 0,
  monthly_payment numeric(14,2) not null,
  months integer not null,
  annual_rate numeric(6,4) not null default 0,
  residual_value numeric(14,2) not null default 0,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'ativo' check (status in ('ativo','liquidado','rescindido')),
  created_at timestamptz not null default now()
);

create index if not exists idx_alienacao_leases_asset on public.alienacao_leases(asset_id);
create index if not exists idx_alienacao_leases_tenant on public.alienacao_leases(tenant_user_id);

-- Pagamentos mensais do contrato
create table if not exists public.alienacao_payments (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.alienacao_leases(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  amount numeric(14,2) not null,
  paid_at timestamptz,
  status text not null default 'pendente' check (status in ('pendente','pago','atrasado')),
  created_at timestamptz not null default now(),
  unique(lease_id, installment_no)
);

create index if not exists idx_alienacao_payments_lease on public.alienacao_payments(lease_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.alienacao_assets enable row level security;
alter table public.alienacao_offers enable row level security;
alter table public.alienacao_leases enable row level security;
alter table public.alienacao_payments enable row level security;

-- Assets: leitura pública de bens ativos; dono gere os seus
drop policy if exists "alienacao_assets_public_read" on public.alienacao_assets;
create policy "alienacao_assets_public_read"
  on public.alienacao_assets for select
  using (true);

drop policy if exists "alienacao_assets_owner_insert" on public.alienacao_assets;
create policy "alienacao_assets_owner_insert"
  on public.alienacao_assets for insert
  with check (auth.uid() = business_user_id);

drop policy if exists "alienacao_assets_owner_update" on public.alienacao_assets;
create policy "alienacao_assets_owner_update"
  on public.alienacao_assets for update
  using (auth.uid() = business_user_id or is_admin());

drop policy if exists "alienacao_assets_owner_delete" on public.alienacao_assets;
create policy "alienacao_assets_owner_delete"
  on public.alienacao_assets for delete
  using (auth.uid() = business_user_id or is_admin());

-- Offers: qualquer um autenticado propõe; dono do bem vê e atualiza
drop policy if exists "alienacao_offers_insert" on public.alienacao_offers;
create policy "alienacao_offers_insert"
  on public.alienacao_offers for insert
  with check (auth.uid() = user_id);

drop policy if exists "alienacao_offers_read" on public.alienacao_offers;
create policy "alienacao_offers_read"
  on public.alienacao_offers for select
  using (
    auth.uid() = user_id
    or auth.uid() = (select business_user_id from public.alienacao_assets a where a.id = asset_id)
    or is_admin()
  );

drop policy if exists "alienacao_offers_owner_update" on public.alienacao_offers;
create policy "alienacao_offers_owner_update"
  on public.alienacao_offers for update
  using (
    auth.uid() = (select business_user_id from public.alienacao_assets a where a.id = asset_id)
    or is_admin()
  );

-- Leases: participante e dono do bem
drop policy if exists "alienacao_leases_read" on public.alienacao_leases;
create policy "alienacao_leases_read"
  on public.alienacao_leases for select
  using (
    auth.uid() = tenant_user_id
    or auth.uid() = (select business_user_id from public.alienacao_assets a where a.id = asset_id)
    or is_admin()
  );

drop policy if exists "alienacao_leases_insert" on public.alienacao_leases;
create policy "alienacao_leases_insert"
  on public.alienacao_leases for insert
  with check (
    auth.uid() = (select business_user_id from public.alienacao_assets a where a.id = asset_id)
    or is_admin()
  );

-- Payments: seguem o lease
drop policy if exists "alienacao_payments_read" on public.alienacao_payments;
create policy "alienacao_payments_read"
  on public.alienacao_payments for select
  using (
    exists (
      select 1 from public.alienacao_leases l
      join public.alienacao_assets a on a.id = l.asset_id
      where l.id = lease_id
        and (auth.uid() = l.tenant_user_id or auth.uid() = a.business_user_id or is_admin())
    )
  );

-- ============================================================
-- Funções auxiliares
-- ============================================================

-- Incrementar contadores de views (público, sem autenticação necessária)
create or replace function public.alienacao_increment_view(asset_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.alienacao_assets
  set views_count = views_count + 1
  where id = asset_id;
end;
$$;

-- Slug automático
create or replace function public.alienacao_set_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(
      regexp_replace(
        substr(new.title, 1, 60) || '-' || substr(md5(random()::text), 1, 6),
        '[^a-zA-Z0-9]+', '-', 'g'
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_alienacao_slug on public.alienacao_assets;
create trigger trg_alienacao_slug
  before insert on public.alienacao_assets
  for each row execute function public.alienacao_set_slug();

-- Atualizar updated_at
drop trigger if exists trg_alienacao_updated on public.alienacao_assets;
create trigger trg_alienacao_updated
  before update on public.alienacao_assets
  for each row execute function public.set_updated_at();

-- Contar propostas automaticamente
create or replace function public.alienacao_count_offers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.alienacao_assets
  set offers_count = (select count(*) from public.alienacao_offers where asset_id = new.asset_id)
  where id = new.asset_id;
  return null;
end;
$$;

drop trigger if exists trg_alienacao_offer_count on public.alienacao_offers;
create trigger trg_alienacao_offer_count
  after insert or delete on public.alienacao_offers
  for each row execute function public.alienacao_count_offers();

-- Gerar cronograma de pagamentos ao aceitar proposta
create or replace function public.alienacao_create_lease(
  p_asset_id uuid,
  p_offer_id uuid,
  p_modality text,
  p_asset_value numeric,
  p_down_payment numeric,
  p_monthly numeric,
  p_months integer,
  p_annual_rate numeric,
  p_residual numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_lease_id uuid;
  v_start date := current_date;
  i integer;
begin
  insert into public.alienacao_leases (
    asset_id, offer_id, tenant_user_id, modality, asset_value,
    down_payment, monthly_payment, months, annual_rate, residual_value,
    start_date, end_date
  ) values (
    p_asset_id, p_offer_id, (select user_id from public.alienacao_offers where id = p_offer_id),
    p_modality, p_asset_value, p_down_payment, p_monthly, p_months,
    p_annual_rate, p_residual,
    v_start, v_start + (p_months || ' months')::interval
  ) returning id into v_lease_id;

  for i in 1..p_months loop
    insert into public.alienacao_payments (lease_id, installment_no, due_date, amount)
    values (v_lease_id, i, v_start + (i || ' months')::interval, p_monthly);
  end loop;

  update public.alienacao_assets set status = 'em_contrato' where id = p_asset_id;
  update public.alienacao_offers set status = 'aceite' where id = p_offer_id;

  return v_lease_id;
end;
$$;

-- ============================================================
-- Storage bucket para imagens de alienação
-- ============================================================
insert into storage.buckets (id, name, public)
values ('alienacao-assets', 'alienacao-assets', true)
on conflict (id) do nothing;

drop policy if exists "alienacao_public_read_storage" on storage.objects;
create policy "alienacao_public_read_storage"
  on storage.objects for select
  using (bucket_id = 'alienacao-assets');

drop policy if exists "alienacao_upload_storage" on storage.objects;
create policy "alienacao_upload_storage"
  on storage.objects for insert
  with check (bucket_id = 'alienacao-assets' and auth.role() = 'authenticated');

drop policy if exists "alienacao_delete_storage" on storage.objects;
create policy "alienacao_delete_storage"
  on storage.objects for delete
  using (bucket_id = 'alienacao-assets' and auth.role() = 'authenticated');
