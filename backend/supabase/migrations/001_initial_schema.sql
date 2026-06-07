-- ============================================================
-- Planlama App — İlk Şema
-- ============================================================

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    google_access_token  TEXT,
    google_refresh_token TEXT,
    token_expiry         TIMESTAMPTZ,
    sheets_file_id       TEXT,       -- Yapılacaklar dosyasının Drive ID'si
    planning_day         SMALLINT DEFAULT 0,  -- 0=Pazar, 1=Pazartesi, ...
    home_address         TEXT,       -- Trafik hesabı için ev adresi
    work_address         TEXT,       -- Trafik hesabı için iş adresi
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Haftalık planlar
CREATE TABLE IF NOT EXISTS weekly_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'approved', 'partial')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, week_start_date)
);

-- Plan görevleri
CREATE TABLE IF NOT EXISTS plan_tasks (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id           UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    description       TEXT,
    start_time        TIMESTAMPTZ,
    end_time          TIMESTAMPTZ,
    location          TEXT,          -- varsa görev konumu
    travel_time_min   INTEGER,       -- trafik dahil tahmini sürüş süresi (dk)
    source            TEXT NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('sheets', 'gmail', 'manual')),
    priority          SMALLINT DEFAULT 2  -- 1=yüksek, 2=orta, 3=düşük
                      CHECK (priority BETWEEN 1 AND 3),
    calendar_event_id TEXT,          -- Google Calendar event ID (onay sonrası)
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'postponed')),
    sort_order        INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Me Time profili
CREATE TABLE IF NOT EXISTS me_time_profiles (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Kişilik & Sosyal
    introvert_score       SMALLINT CHECK (introvert_score BETWEEN 1 AND 10), -- 1=tam ekstravert, 10=tam introvert
    social_preference     TEXT CHECK (social_preference IN ('alone', 'friend', 'family', 'mixed')),
    crowd_tolerance       SMALLINT CHECK (crowd_tolerance BETWEEN 1 AND 5),
    -- İlgi Alanları (ağırlıklı liste)
    interests             JSONB DEFAULT '[]',  -- [{"name": "müzik", "weight": 0.8}, ...]
    -- Aktivite Amacı
    activity_goals        TEXT[] DEFAULT '{}', -- ['rest', 'adventure', 'learn', 'socialize', 'create']
    -- Fiziksel
    fitness_level         SMALLINT CHECK (fitness_level BETWEEN 1 AND 5),
    intensity_preference  TEXT CHECK (intensity_preference IN ('low', 'medium', 'high')),
    physical_constraints  TEXT,
    -- Pratik
    duration_preference   TEXT CHECK (duration_preference IN ('1-2h', '2-4h', 'half-day', 'full-day')),
    budget_range          TEXT CHECK (budget_range IN ('free', '0-200', '200-500', '500+')),
    preferred_time        TEXT CHECK (preferred_time IN ('morning', 'afternoon', 'evening')),
    -- Konum & Ulaşım
    city                  TEXT,
    district              TEXT,
    has_car               BOOLEAN DEFAULT false,
    max_distance_km       INTEGER DEFAULT 20,
    indoor_outdoor        TEXT CHECK (indoor_outdoor IN ('indoor', 'outdoor', 'both')),
    weather_sensitivity   SMALLINT CHECK (weather_sensitivity BETWEEN 1 AND 5),
    -- Kaçınılacaklar
    avoidances            TEXT,
    updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Me Time önerileri
CREATE TABLE IF NOT EXISTS me_time_suggestions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood_input          TEXT,         -- "Bu sefer nasıl hissetmek istiyorsun?" cevabı
    activities          JSONB NOT NULL DEFAULT '[]',
    -- [{title, description, venue_name, venue_address, maps_url,
    --   price_range, duration_min, travel_time_min, image_url,
    --   source: 'ai'|'maps'|'eventbrite'|'meetup'}]
    selected_activity   JSONB,
    calendar_event_id   TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Agent işlem logları
CREATE TABLE IF NOT EXISTS agent_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id  TEXT,
    agent_name  TEXT NOT NULL,
    instruction TEXT,
    result      JSONB,
    duration_ms INTEGER,
    status      TEXT CHECK (status IN ('success', 'partial', 'failed')),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE me_time_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE me_time_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Service role her şeyi yapabilir (backend bu role ile çalışır)
CREATE POLICY "service_role_all" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON weekly_plans FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON plan_tasks FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON me_time_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON me_time_suggestions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON agent_logs FOR ALL TO service_role USING (true);

-- ============================================================
-- İndeksler
-- ============================================================

CREATE INDEX ON weekly_plans (user_id, week_start_date DESC);
CREATE INDEX ON plan_tasks (plan_id, status);
CREATE INDEX ON me_time_suggestions (user_id, created_at DESC);
CREATE INDEX ON agent_logs (user_id, created_at DESC);
