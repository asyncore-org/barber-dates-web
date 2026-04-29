-- =============================================================================
-- 02_schema.sql — Gio Barber Shop — Schema completo (tablas + funciones public)
-- =============================================================================
-- Ejecutar PRIMERO este archivo, luego 02b_auth_trigger.sql en ejecución separada.
-- InsForge bloquea DDL sobre auth.* en el SQL Editor; el trigger de auth va aparte.
-- Prerrequisito: la extensión pgcrypto debe estar disponible (InsForge la incluye).
-- =============================================================================


-- ─── BARBEROS ─────────────────────────────────────────────────────────────────
-- Entidad independiente: los barberos no necesitan cuenta de auth para el MVP.
-- Si en el futuro un barbero necesita login, se añade user_id → auth.users.
CREATE TABLE IF NOT EXISTS public.barbers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT        NOT NULL,
  role          TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  email         TEXT,
  -- Array de IDs de servicios que el barbero ofrece (JSONB para compatibilidad con SDK)
  specialty_ids JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  -- Descanso diario del barbero (mismo horario todos los días; NULL = sin descanso)
  break_start   TIME,
  break_end     TIME,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.barbers IS 'Barberos de la barbería. Independiente de auth.users.';
COMMENT ON COLUMN public.barbers.specialty_ids IS 'Array JSON de UUIDs de services que este barbero realiza.';
COMMENT ON COLUMN public.barbers.break_start IS 'Inicio del descanso diario (HH:MM). NULL = sin descanso.';
COMMENT ON COLUMN public.barbers.break_end IS 'Fin del descanso diario (HH:MM). NULL = sin descanso.';


-- ─── PERFILES DE USUARIO ──────────────────────────────────────────────────────
-- Extiende auth.users. Se crea automáticamente al registrar un usuario (ver trigger).
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL DEFAULT '',
  email      TEXT,
  phone      TEXT,
  avatar_url TEXT,
  role       TEXT        NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfil público de clientes y admins. Se crea via trigger on_auth_user_created.';
COMMENT ON COLUMN public.profiles.role IS 'client | admin. Admin se asigna con 05_admin.sql.';
COMMENT ON COLUMN public.profiles.email IS 'Espejo del email de auth.users. Poblado por el trigger on_auth_user_created. Permite buscar perfiles por email sin acceder a auth.users.';


-- ─── SERVICIOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT           NOT NULL,
  description      TEXT,
  duration_minutes INTEGER        NOT NULL CHECK (duration_minutes > 0),
  price            NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  loyalty_points   INTEGER        NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  is_active        BOOLEAN        NOT NULL DEFAULT true,
  sort_order       INTEGER        NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.services IS 'Catálogo de servicios ofrecidos por la barbería.';


-- ─── CITAS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE RESTRICT,
  barber_id  UUID        NOT NULL REFERENCES public.barbers(id)   ON DELETE RESTRICT,
  service_id UUID        NOT NULL REFERENCES public.services(id)  ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'confirmed'
               CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT appointments_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_client    ON public.appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber    ON public.appointments (barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start     ON public.appointments (start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON public.appointments (status);

COMMENT ON TABLE public.appointments IS 'Citas de clientes. barber_id referencia barbers (no profiles).';


-- ─── BLOQUEOS DE HORARIO ──────────────────────────────────────────────────────
-- Clausuras especiales y bloqueos puntuales de horas.
-- El horario semanal base vive en shop_config key='schedule'.
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = afecta a todos los barberos; UUID = bloqueo para un barbero específico
  barber_id    UUID        REFERENCES public.barbers(id) ON DELETE CASCADE,
  -- Para bloqueos de día completo: solo block_date, start_time y end_time NULL
  block_date   DATE,
  start_time   TIME,
  end_time     TIME,
  -- Para bloqueos recurrentes semanales: day_of_week (0=lunes … 6=domingo, ISO)
  day_of_week  SMALLINT    CHECK (day_of_week BETWEEN 0 AND 6),
  reason       TEXT,
  is_recurring BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT schedule_blocks_date_or_recurring
    CHECK (
      (NOT is_recurring AND block_date IS NOT NULL) OR
      (is_recurring AND day_of_week IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date    ON public.schedule_blocks (block_date);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_barber  ON public.schedule_blocks (barber_id);

COMMENT ON TABLE public.schedule_blocks IS 'Clausuras especiales y bloqueos de horas. Horario base semanal → shop_config key=schedule.';


-- ─── CONFIGURACIÓN DEL NEGOCIO ────────────────────────────────────────────────
-- Key-value JSONB flexible. Keys definidas: shop_info, schedule, booking, loyalty.
CREATE TABLE IF NOT EXISTS public.shop_config (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        UNIQUE NOT NULL,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shop_config IS 'Configuración del negocio. Keys: shop_info, schedule, booking, loyalty.';


-- ─── TARJETAS DE FIDELIZACIÓN ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_cards (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_points INTEGER     NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  total_visits INTEGER     NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_client ON public.loyalty_cards (client_id);


-- ─── TRANSACCIONES DE FIDELIZACIÓN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        UUID        NOT NULL REFERENCES public.loyalty_cards(id) ON DELETE CASCADE,
  appointment_id UUID        REFERENCES public.appointments(id) ON DELETE SET NULL,
  points         INTEGER     NOT NULL,
  type           TEXT        NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'adjustment')),
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_card ON public.loyalty_transactions (card_id);


-- ─── RECOMPENSAS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rewards (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT        NOT NULL,
  cost       INTEGER     NOT NULL CHECK (cost > 0),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── RECOMPENSAS CANJEADAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.redeemed_rewards (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID        NOT NULL REFERENCES public.loyalty_cards(id)  ON DELETE CASCADE,
  reward_id   UUID        NOT NULL REFERENCES public.rewards(id)         ON DELETE RESTRICT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redeemed_rewards_card ON public.redeemed_rewards (card_id);


-- =============================================================================
-- FUNCIONES AUXILIARES
-- =============================================================================

-- Devuelve true si el usuario autenticado actual tiene role='admin' en profiles.
-- SECURITY DEFINER: omite RLS para poder leer profiles sin restricción.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- Actualiza updated_at automáticamente.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_shop_config_updated_at
  BEFORE UPDATE ON public.shop_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- La función handle_new_user() y el trigger sobre auth.users
-- están en 02b_auth_trigger.sql (ejecutar por separado).
