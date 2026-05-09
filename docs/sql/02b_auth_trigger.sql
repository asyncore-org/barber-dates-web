-- =============================================================================
-- 02b_auth_trigger.sql — Gio Barber Shop — Trigger de creación de perfil
-- =============================================================================
-- Ejecutar DESPUÉS de 02_schema.sql, EN UNA EJECUCIÓN SEPARADA.
-- InsForge bloquea DDL sobre auth.* si se mezcla con otros statements.
-- Si el SQL Editor sigue bloqueándolo, contactar soporte de InsForge para
-- configurar el hook de "on user created" desde su dashboard.
-- =============================================================================

-- Crea automáticamente un perfil en public.profiles al registrar un usuario.
-- NOTA: InsForge usa columnas 'profile' y 'metadata' en auth.users,
-- NO 'raw_user_meta_data' (que es la convención de Supabase).
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
