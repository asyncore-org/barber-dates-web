-- =============================================================================
-- 05_admin.sql — Gio Barber Shop — Plantilla para crear administradores
-- =============================================================================
-- Flujo para crear un admin:
--
--   1. El usuario se registra en la app (UI) con email y contraseña.
--   2. El usuario confirma su email si InsForge lo requiere.
--   3. Ejecutar este script reemplazando 'admin@example.com' con el email real.
--
-- Este script es idempotente: si el usuario ya es admin, no cambia nada.
-- =============================================================================


-- PASO 1 — Actualizar metadata en auth.users para que el JWT lleve el rol
-- Esto es lo que usa is_admin() vía profiles.role (sincronizado por el trigger).
UPDATE auth.users
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'REEMPLAZAR_CON_EMAIL_REAL@example.com';


-- PASO 2 — Actualizar directamente la tabla profiles (por si el trigger ya corrió
-- con role='client' antes de este script)
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'REEMPLAZAR_CON_EMAIL_REAL@example.com'
);


-- ─── VERIFICACIÓN ─────────────────────────────────────────────────────────────
-- Ejecutar esto para confirmar que el admin se creó correctamente:
--
-- SELECT
--   u.email,
--   u.metadata->>'role'   AS metadata_role,
--   p.role                AS profile_role
-- FROM auth.users u
-- JOIN public.profiles p ON p.id = u.id
-- WHERE u.email = 'REEMPLAZAR_CON_EMAIL_REAL@example.com';
--
-- Resultado esperado:
--   email                        | metadata_role | profile_role
--   admin@example.com            | admin         | admin
-- =============================================================================
