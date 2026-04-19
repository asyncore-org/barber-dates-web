-- Trigger: crea automáticamente un perfil en public.profiles
-- cuando se registra un nuevo usuario en InsForge Auth.
--
-- Cómo aplicar: InsForge PRE → SQL editor → ejecutar este script.
-- El rol se lee de user_metadata.role (si existe) o se asigna 'client' por defecto.
-- Los admins se crean manualmente desde el dashboard de InsForge con role = 'admin'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
