-- ============================================================
-- Migration 003: me_time_profiles ve me_time_suggestions şemasını
-- Python API'siyle eşleştir.
-- ============================================================

-- 1. Bağımlı tabloyu önce düşür
DROP TABLE IF EXISTS me_time_suggestions CASCADE;
DROP TABLE IF EXISTS me_time_profiles  CASCADE;

-- 2. me_time_profiles — kolon adları api/me_time.py ile birebir eşleşiyor
CREATE TABLE me_time_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Kişilik & Sosyal
    personality_score    SMALLINT,        -- 1-10
    social_preference    TEXT,            -- Yalnız|Arkadaşla|Aileyle|Karma
    crowd_tolerance      SMALLINT,        -- 1-5
    -- İlgi Alanları
    interests            TEXT[]  DEFAULT '{}',
    -- Aktivite Amacı
    activity_goal        TEXT,
    -- Fiziksel
    fitness_level        SMALLINT,        -- 1-5
    intensity_preference TEXT,            -- Hafif|Orta|Yüksek
    constraints          TEXT,
    -- Pratik
    duration_preference  TEXT,            -- 1-2 saat|2-4 saat|Yarım gün|Tam gün
    budget_range         TEXT,            -- Ücretsiz|0-200₺|200-500₺|500₺+
    preferred_time       TEXT,            -- Sabah|Öğleden sonra|Akşam
    -- Konum & Ulaşım
    city                 TEXT,
    district             TEXT,
    home_address         TEXT,
    has_car              BOOLEAN DEFAULT false,
    max_distance_km      INTEGER DEFAULT 20,
    indoor_outdoor       TEXT,            -- İç|Dış|Her ikisi
    weather_sensitivity  SMALLINT,        -- 1-5
    -- Kaçınılacaklar
    avoidances           TEXT,
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- 3. me_time_suggestions — selected_activity_id TEXT (JSONB değil)
CREATE TABLE me_time_suggestions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood_input           TEXT,
    activities           JSONB NOT NULL DEFAULT '[]',
    selected_activity_id TEXT,
    calendar_event_id    TEXT,
    created_at           TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS
ALTER TABLE me_time_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE me_time_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON me_time_profiles  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON me_time_suggestions FOR ALL TO service_role USING (true);

-- 5. İndeks
CREATE INDEX ON me_time_suggestions (user_id, created_at DESC);

-- 6. users tablosunda eksik sütunlar (migration 002'yi de kapsar)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS work_start_hour INTEGER DEFAULT 9,
    ADD COLUMN IF NOT EXISTS work_end_hour   INTEGER DEFAULT 20,
    ADD COLUMN IF NOT EXISTS auth_provider   TEXT    DEFAULT 'google';
