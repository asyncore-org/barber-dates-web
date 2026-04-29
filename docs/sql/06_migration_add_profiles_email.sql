-- =============================================================================
-- 06_migration_add_profiles_email.sql — Gio Barber Shop
-- =============================================================================
-- Migración para instancias existentes. Ejecutar en InsForge SQL Editor.
-- Idempotente: seguro de ejecutar varias veces.
--
-- Cuándo ejecutar:
--   - Una vez sobre la DB de PRE o producción que ya tenga el schema base.
--   - NO hace falta para instancias creadas desde cero con 02_schema.sql
--     (ya incluye la columna email).
-- =============================================================================


-- ─── BLOQUE 1: Añadir columna email a profiles ────────────────────────────────

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Poblar email desde auth.users para perfiles ya existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;


-- ─── BLOQUE 2: Actualizar trigger para nuevos usuarios ───────────────────────
-- El trigger original no incluía email. Esta versión sí lo hace.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.profile->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.metadata->>'role', 'client'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ─── BLOQUE 3: Dar rol admin a theasyncore@gmail.com ─────────────────────────
-- Necesario para que is_admin() devuelva true y las políticas RLS permitan
-- las operaciones de escritura en la sección de administración.

UPDATE auth.users
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'theasyncore@gmail.com';

UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'theasyncore@gmail.com'
);


-- ─── VERIFICACIÓN ─────────────────────────────────────────────────────────────
-- Ejecutar esto para confirmar que todo quedó correcto:
--
-- SELECT
--   u.email,
--   p.role           AS profile_role,
--   p.email          AS profile_email
-- FROM auth.users u
-- JOIN public.profiles p ON p.id = u.id
-- WHERE u.email = 'theasyncore@gmail.com';
--
-- Resultado esperado:
--   email                    | profile_role | profile_email
--   theasyncore@gmail.com    | admin        | theasyncore@gmail.com
-- =============================================================================
