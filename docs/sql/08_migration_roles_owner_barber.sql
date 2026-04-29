-- ============================================================
-- Migración 08: ampliar roles de usuarios
-- Añade los roles 'owner' (propietario de barbería) y 'barber'
-- (empleado) a la tabla profiles.
--
-- Roles resultantes:
--   client  → cliente estándar
--   owner   → propietario de la barbería (antes: admin)
--   barber  → empleado/barbero
--   admin   → desarrollador, acceso total (no se toca)
--
-- Instrucciones de ejecución:
-- 1. Pega este SQL en el SQL Editor de InsForge y ejecuta.
-- 2. Actualiza el rol de los propietarios actuales (ver abajo).
-- 3. El rol 'admin' ya existe; no se modifica.
-- ============================================================

-- 1. Ampliar el CHECK constraint de profiles.role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'admin', 'owner', 'barber'));

-- ============================================================
-- 2. Promover propietarios actuales de 'admin' → 'owner'
--    Sustituye el email real del dueño de la barbería.
--    Repite el UPDATE para cada propietario si hay varios.
-- ============================================================
-- UPDATE profiles SET role = 'owner' WHERE email = 'EMAIL_DEL_PROPIETARIO';

-- ============================================================
-- 3. Asegurarse de que el desarrollador tiene rol 'admin'
--    (ya debería tenerlo; este UPDATE es idempotente)
-- ============================================================
-- UPDATE profiles SET role = 'admin' WHERE email = 'cromeroballester@gmail.com';

-- ============================================================
-- Notas de seguridad:
-- · El rol 'admin' solo puede quitarse desde la base de datos.
--   El panel de administración frontend no permite degradar admins.
-- · Si un usuario tiene rol 'owner' actualmente registrado como
--   'admin' en DB, actualizar su fila antes de que acceda a la app
--   para evitar que sea redirigido al panel de desarrollador.
-- ============================================================
