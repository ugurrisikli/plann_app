-- Kullanıcı tablosuna eksik sütunlar ekleniyor
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS work_address TEXT,
  ADD COLUMN IF NOT EXISTS planning_day INTEGER DEFAULT 0,   -- 0=Pzt, 6=Paz
  ADD COLUMN IF NOT EXISTS work_start_hour INTEGER DEFAULT 9,
  ADD COLUMN IF NOT EXISTS work_end_hour INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'google'; -- 'google' | 'email'

-- Plan görevlerinin start/end tipini güvenli parse için TEXT'te bırak,
-- ancak calendar_event_id varsa sütun eksik kalmasın
ALTER TABLE plan_tasks
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Me Time profili home_address sütunu (me_time_profiles tablosuna da gerekli)
ALTER TABLE me_time_profiles
  ADD COLUMN IF NOT EXISTS home_address TEXT;
