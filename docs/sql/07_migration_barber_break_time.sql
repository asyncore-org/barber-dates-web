-- =============================================================================
-- 07_migration_barber_break_time.sql
-- Añade columnas break_start y break_end a la tabla barbers.
-- Ejecutar en el SQL Editor de InsForge.
-- =============================================================================

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS break_start TIME,
  ADD COLUMN IF NOT EXISTS break_end   TIME;

COMMENT ON COLUMN public.barbers.break_start IS 'Inicio del descanso diario (HH:MM). NULL = sin descanso.';
COMMENT ON COLUMN public.barbers.break_end   IS 'Fin del descanso diario (HH:MM). NULL = sin descanso.';
