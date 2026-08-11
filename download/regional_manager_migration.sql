-- =============================================================
-- Migration: Adicionar regional_manager ao enum app_role
-- Plataforma: bateu.online
-- Data: 2026-08-11
-- =============================================================
-- 
-- NOTA: PostgreSQL nao permite adicionar valores a um enum existente
-- dentro de uma transaccao. Executar esta migration fora de uma transaccao.
--
-- Antes de executar, verificar se 'regional_manager' ja existe:
--   SELECT unnest(enum_range(NULL::app_role));
--
-- Se o tipo app_role ainda nao existe, criar:
--   CREATE TYPE app_role AS ENUM ('user', 'business', 'admin', 'superadmin');
--   ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'regional_manager';
--
-- Se o tipo ja existe (caso mais provavel), apenas adicionar o valor:
-- =============================================================

-- Adicionar regional_manager ao enum app_role
-- (requer PostgreSQL 9.6+ para IF NOT EXISTS)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'regional_manager';

-- =============================================================
-- Verificacao: Confirmar que o valor foi adicionado
-- =============================================================
-- SELECT unnest(enum_range(NULL::app_role));
-- Resultado esperado: user | business | admin | superadmin | regional_manager

-- =============================================================
-- Tabelas auxiliares para regional_manager (se nao existirem)
-- =============================================================

-- Tabela de regioes suportadas pela plataforma
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,          -- ex: 'MZ', 'AO', 'BR'
    name TEXT NOT NULL,                 -- ex: 'Mocambique', 'Angola', 'Brasil'
    currency_code TEXT DEFAULT 'MZN',
    currency_symbol TEXT DEFAULT 'MT',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de gestores regionais
CREATE TABLE IF NOT EXISTS region_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, region_id)
);

-- Branding regional
CREATE TABLE IF NOT EXISTS region_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    primary_color TEXT DEFAULT '#9b87f5',
    secondary_color TEXT DEFAULT '#7E69AB',
    accent_color TEXT DEFAULT '#F2FCE2',
    theme_name TEXT DEFAULT 'default',
    logo_url TEXT,
    banner_url TEXT,
    custom_css TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(region_id)
);

-- Definicoes regionais
CREATE TABLE IF NOT EXISTS region_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    spin_wheel_enabled BOOLEAN DEFAULT true,
    millionaire_enabled BOOLEAN DEFAULT true,
    challenge_games_enabled BOOLEAN DEFAULT true,
    live_games_enabled BOOLEAN DEFAULT true,
    maintenance_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(region_id)
);

-- Anuncios regionais
CREATE TABLE IF NOT EXISTS region_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    text TEXT,
    cta_label TEXT,
    cta_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Jogos nativos por regiao
CREATE TABLE IF NOT EXISTS region_native_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(region_id, game_id)
);

-- =============================================================
-- RLS (Row Level Security) - Politicas de seguranca
-- =============================================================

-- Apenas superadmins e admins podem gerir regioes
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all regions" ON regions
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

ALTER TABLE region_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and self can view region managers" ON region_managers
    FOR SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

ALTER TABLE region_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view regional branding" ON region_branding
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Regional managers and admins can edit branding" ON region_branding
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'regional_manager'))
    );

ALTER TABLE region_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view regional settings" ON region_settings
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Regional managers and admins can edit settings" ON region_settings
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'regional_manager'))
    );

-- =============================================================
-- Dados iniciais (opcional)
-- =============================================================

INSERT INTO regions (code, name, currency_code, currency_symbol) VALUES
    ('MZ', 'Mocambique', 'MZN', 'MT'),
    ('AO', 'Angola', 'AOA', 'Kz'),
    ('BR', 'Brasil', 'BRL', 'R$'),
    ('PT', 'Portugal', 'EUR', 'E')
ON CONFLICT (code) DO NOTHING;
