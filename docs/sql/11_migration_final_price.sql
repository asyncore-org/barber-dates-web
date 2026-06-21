-- =============================================================================
-- 11_migration_final_price.sql — Gio Barber Shop
-- Añade final_price a appointments para guardar el precio real pagado
-- tras aplicar un descuento de recompensa de fidelización.
--
-- NULL = sin descuento aplicado (usar services.price para estadísticas).
-- 0    = servicio gratuito (descuento >= precio del servicio).
--
-- Ejecutar en el SQL Editor de InsForge / Supabase.
-- Es idempotente (ADD COLUMN IF NOT EXISTS).
-- =============================================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS final_price NUMERIC(10, 2) NULL;

COMMENT ON COLUMN public.appointments.final_price IS
  'Precio real cobrado tras aplicar descuento de fidelización. NULL = sin descuento.';
