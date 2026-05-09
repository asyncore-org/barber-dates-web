-- =============================================================================
-- 09_migration_rls_owner_access.sql — Gio Barber Shop
-- Ampliar is_admin() para reconocer también el rol 'owner'.
--
-- Problema:
--   is_admin() solo devuelve true para role = 'admin'.
--   Tras la migración 08, los propietarios tienen role = 'owner'.
--   Las políticas RLS de barbers y services usan is_admin() para
--   INSERT y UPDATE → el propietario recibe 400 en esas operaciones.
--
-- Ejecutar en el SQL Editor de InsForge.
-- Es idempotente (CREATE OR REPLACE).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'owner') FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- ─── VERIFICACIÓN ─────────────────────────────────────────────────────────────
-- Ejecutar esto para confirmar que un usuario owner pasa el check:
--
-- SELECT
--   p.email,
--   p.role,
--   public.is_admin() AS is_admin_result
-- FROM public.profiles p
-- WHERE p.email = 'EMAIL_DEL_PROPIETARIO';
--
-- Resultado esperado: is_admin_result = true
-- =============================================================================
