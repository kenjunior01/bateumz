-- ============================================================
-- BATEU — Stories 2.0 (Rede Social)
-- Upgrade completo do sistema de stories: vídeo, stickers,
-- filtros, enquetes, quizzes com prémio, música, links CTA,
-- visualizações, reações, respostas e destaques permanentes.
-- ============================================================

-- ============================================================
-- 1. Extensão da tabela user_stories
-- ============================================================
alter table public.user_stories
  add column if not exists media_type text not null default 'image' check (media_type in ('image','video','text')),
  add column if not exists video_url text,
  add column if not exists caption_style jsonb not null default '{}'::jsonb,
  add column if not exists filter text,
  add column if not exists stickers jsonb not null default '[]'::jsonb,
  add column if not exists poll jsonb,
  add column if not exists quiz jsonb,
  add column if not exists flash_deal jsonb,
  add column if not exists link_url text,
  add column if not exists link_label text,
  add column if not exists music_track jsonb,
  add column if not exists duration_seconds integer not null default 5 check (duration_seconds between 3 and 30),
  add column if not exists font_family text,
  add column if not exists text_position jsonb not null default '{"x":50,"y":50}'::jsonb,
  add column if not exists views_count integer not null default 0,
  add column if not exists reactions_count integer not null default 0,
  add column if not exists replies_count integer not null default 0,
  add column if not exists highlight_id uuid,
  add column if not exists audience text not null default 'public' check (audience in ('public','followers')),
  add column if not exists raffle_id uuid,
  add column if not exists business_id uuid,
  add column if not exists allow_replies boolean not null default true,
  add column if not exists allow_share boolean not null default true;

create index if not exists idx_user_stories_expires on public.user_stories(expires_at desc);
create index if not exists idx_user_stories_user on public.user_stories(user_id);
create index if not exists idx_user_stories_highlight on public.user_stories(highlight_id);

-- ============================================================
-- 2. Visualizações de stories
-- ============================================================
create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.user_stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(story_id, viewer_id)
);

create index if not exists idx_story_views_story on public.story_views(story_id);
create index if not exists idx_story_views_viewer on public.story_views(viewer_id);

alter table public.story_views enable row level security;

drop policy if exists "story_views_insert" on public.story_views;
create policy "story_views_insert"
  on public.story_views for insert
  with check (auth.uid() = viewer_id);

drop policy if exists "story_views_read" on public.story_views;
create policy "story_views_read"
  on public.story_views for select
  using (
    auth.uid() = viewer_id
    or auth.uid() = (select user_id from public.user_stories s where s.id = story_id)
  );

-- ============================================================
-- 3. Reações (emojis flutuantes)
-- ============================================================
create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.user_stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(story_id, user_id, emoji)
);

create index if not exists idx_story_reactions_story on public.story_reactions(story_id);

alter table public.story_reactions enable row level security;

drop policy if exists "story_reactions_insert" on public.story_reactions;
create policy "story_reactions_insert"
  on public.story_reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "story_reactions_read" on public.story_reactions;
create policy "story_reactions_read"
  on public.story_reactions for select
  using (true);

drop policy if exists "story_reactions_delete" on public.story_reactions;
create policy "story_reactions_delete"
  on public.story_reactions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 4. Respostas (replies estilo DM)
-- ============================================================
create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.user_stories(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  emoji text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_replies_story on public.story_replies(story_id);
create index if not exists idx_story_replies_sender on public.story_replies(sender_id);

alter table public.story_replies enable row level security;

drop policy if exists "story_replies_insert" on public.story_replies;
create policy "story_replies_insert"
  on public.story_replies for insert
  with check (auth.uid() = sender_id);

drop policy if exists "story_replies_read" on public.story_replies;
create policy "story_replies_read"
  on public.story_replies for select
  using (
    auth.uid() = sender_id
    or auth.uid() = (select user_id from public.user_stories s where s.id = story_id)
  );

drop policy if exists "story_replies_update" on public.story_replies;
create policy "story_replies_update"
  on public.story_replies for update
  using (auth.uid() = (select user_id from public.user_stories s where s.id = story_id));

-- ============================================================
-- 5. Votos de enquetes e quizzes
-- ============================================================
create table if not exists public.story_interactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.user_stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('poll','quiz','deal')),
  option_index integer not null default 0,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  unique(story_id, user_id, interaction_type)
);

create index if not exists idx_story_interactions_story on public.story_interactions(story_id);

alter table public.story_interactions enable row level security;

drop policy if exists "story_interactions_insert" on public.story_interactions;
create policy "story_interactions_insert"
  on public.story_interactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "story_interactions_read" on public.story_interactions;
create policy "story_interactions_read"
  on public.story_interactions for select
  using (true);

-- ============================================================
-- 6. Destaques (highlights) — stories que não expiram
-- ============================================================
create table if not exists public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Destaques',
  cover_image text,
  cover_gradient text not null default 'from-primary to-emerald-400',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_highlights_user on public.story_highlights(user_id);

alter table public.story_highlights enable row level security;

drop policy if exists "story_highlights_read" on public.story_highlights;
create policy "story_highlights_read"
  on public.story_highlights for select
  using (true);

drop policy if exists "story_highlights_write" on public.story_highlights;
create policy "story_highlights_write"
  on public.story_highlights for insert
  with check (auth.uid() = user_id);

drop policy if exists "story_highlights_update" on public.story_highlights;
create policy "story_highlights_update"
  on public.story_highlights for update
  using (auth.uid() = user_id);

drop policy if exists "story_highlights_delete" on public.story_highlights;
create policy "story_highlights_delete"
  on public.story_highlights for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 7. Funções e triggers
-- ============================================================

-- Marcar visualização + contador atómico
create or replace function public.story_mark_viewed(p_story_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.story_views (story_id, viewer_id)
  values (p_story_id, auth.uid())
  on conflict (story_id, viewer_id) do nothing;

  update public.user_stories
  set views_count = (select count(*) from public.story_views where story_id = p_story_id)
  where id = p_story_id;
end;
$$;

-- Registar reação + contador atómico
create or replace function public.story_react(p_story_id uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.story_reactions
    where story_id = p_story_id and user_id = auth.uid() and emoji = p_emoji
  ) then
    delete from public.story_reactions
    where story_id = p_story_id and user_id = auth.uid() and emoji = p_emoji;
  else
    insert into public.story_reactions (story_id, user_id, emoji)
    values (p_story_id, auth.uid(), p_emoji);
  end if;

  update public.user_stories
  set reactions_count = (select count(*) from public.story_reactions where story_id = p_story_id)
  where id = p_story_id;
end;
$$;

-- Votar em enquete/quiz (com prémio em pontos se acertar o quiz)
create or replace function public.story_vote(
  p_story_id uuid,
  p_type text,
  p_option integer
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_quiz jsonb;
  v_correct boolean;
  v_points integer := 0;
begin
  insert into public.story_interactions (story_id, user_id, interaction_type, option_index)
  values (p_story_id, auth.uid(), p_type, p_option)
  on conflict (story_id, user_id, interaction_type) do nothing;

  if p_type = 'quiz' then
    select s.quiz into v_quiz from public.user_stories s where s.id = p_story_id;
    if v_quiz is not null and (v_quiz->>'correct')::int = p_option then
      v_points := coalesce((v_quiz->>'reward')::int, 25);
      update public.story_interactions
      set points_earned = v_points
      where story_id = p_story_id and user_id = auth.uid() and interaction_type = 'quiz';
    end if;
  end if;

  return v_points;
end;
$$;

-- Resultados agregados de enquete/quiz (para o dono e para quem votou ver %)
create or replace function public.story_results(p_story_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('option', t.option_index, 'votes', t.votes)), '[]'::jsonb)
  from (
    select option_index, count(*) as votes
    from public.story_interactions
    where story_id = p_story_id
    group by option_index
  ) t;
$$;

-- Contar respostas automaticamente
create or replace function public.story_count_replies()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.user_stories
  set replies_count = (select count(*) from public.story_replies where story_id = new.story_id)
  where id = new.story_id;
  return null;
end;
$$;

drop trigger if exists trg_story_count_replies on public.story_replies;
create trigger trg_story_count_replies
  after insert on public.story_replies
  for each row execute function public.story_count_replies();

-- Extender expiração de stories que estão em destaque (não expiram)
create or replace function public.story_highlight_keepalive()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.highlight_id is not null then
    new.expires_at := now() + interval '100 years';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_story_highlight_keepalive on public.user_stories;
create trigger trg_story_highlight_keepalive
  before update of highlight_id on public.user_stories
  for each row execute function public.story_highlight_keepalive();

-- ============================================================
-- 8. Storage bucket para vídeos de stories
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('user-stories-video', 'user-stories-video', true, 52428800)
on conflict (id) do nothing;

drop policy if exists "stories_video_public_read" on storage.objects;
create policy "stories_video_public_read"
  on storage.objects for select
  using (bucket_id = 'user-stories-video');

drop policy if exists "stories_video_upload" on storage.objects;
create policy "stories_video_upload"
  on storage.objects for insert
  with check (bucket_id = 'user-stories-video' and auth.role() = 'authenticated');

drop policy if exists "stories_video_delete" on storage.objects;
create policy "stories_video_delete"
  on storage.objects for delete
  using (bucket_id = 'user-stories-video' and auth.role() = 'authenticated');
