# Guía de migración — Gio Barber Shop

> Sigue este documento cuando necesites migrar la aplicación a una nueva cuenta de InsForge y/o Vercel.  
> Todos los SQL referenciados están en `docs/sql/` y son idempotentes (seguros de re-ejecutar).

---

## Índice

1. [Cuándo usar esta guía](#cuándo-usar-esta-guía)
2. [Prerequisitos](#prerequisitos)
3. [Migración de InsForge (base de datos + auth)](#migración-de-insforge)
4. [Migración de Vercel (hosting)](#migración-de-vercel)
5. [Verificación post-migración](#verificación-post-migración)
6. [Rollback](#rollback)

---

## Cuándo usar esta guía

- Cambio de cuenta de InsForge (PRE o PRO o ambas)
- Clonado del entorno (crear un PRE nuevo desde cero)
- Recuperación ante desastre (BD corrupta o eliminada)
- Setup inicial en una cuenta limpia

---

## Prerequisitos

- Acceso al dashboard de InsForge de la cuenta destino
- Acceso al dashboard de Vercel (solo para la parte de Vercel)
- Los secrets de GitHub Actions actualizados (si aplica)
- `psql` o acceso al SQL editor del dashboard de InsForge

---

## Migración de InsForge

### Paso 1 — Crear el proyecto InsForge

1. Ve a [app.insforge.dev](https://app.insforge.dev) y crea un nuevo proyecto.
2. Anota:
   - **Base URL**: `https://XXXXXXXX.eu-central.insforge.app`
   - **Anon Key**: la clave pública del proyecto
3. Guarda estos valores — los necesitas en los pasos siguientes.

### Paso 2 — Ejecutar el schema

Abre el **SQL editor** del nuevo proyecto InsForge y ejecuta los scripts en orden:

```
docs/sql/02_schema.sql    ← tablas, índices, triggers, funciones auxiliares
docs/sql/03_rls.sql       ← políticas RLS (Row Level Security)
docs/sql/04_seed.sql      ← datos iniciales (servicios, barberos, shop_config, rewards)
```

> ⚠️ `01_handle_new_user_trigger.sql` está **obsoleto** — usa columnas de Supabase.
> El trigger corregido está incluido al final de `02_schema.sql`.

**Verificación rápida:**
```sql
SELECT COUNT(*) FROM public.services;    -- debe ser 6
SELECT COUNT(*) FROM public.barbers;     -- debe ser 2
SELECT COUNT(*) FROM public.shop_config; -- debe ser 4 (shop_info, schedule, booking, loyalty)
SELECT COUNT(*) FROM public.rewards;     -- debe ser 4
```

### Paso 3 — Actualizar datos reales (si aplica)

Los datos de seed son los valores por defecto. Si la barbería tiene datos reales diferentes:

**Actualizar info del negocio:**
```sql
UPDATE public.shop_config
SET value = '{
  "name":        "Nombre real de la barbería",
  "phone":       "6XX XXX XXX",
  "email":       "email@real.es",
  "instagram":   "@cuenta_real",
  "address":     "Dirección real",
  "description": "Descripción real."
}'::jsonb,
updated_at = now()
WHERE key = 'shop_info';
```

**Actualizar horario real:**
```sql
UPDATE public.shop_config
SET value = '{ ...horario real... }'::jsonb,
updated_at = now()
WHERE key = 'schedule';
```

**Actualizar servicios:**
```sql
UPDATE public.services
SET name = 'Nombre real', price = XX.00, duration_minutes = XX
WHERE id = 'a0000000-0000-4000-8000-000000000001'; -- ajustar por cada servicio
```

### Paso 4 — Configurar Google OAuth (si está activo)

1. InsForge dashboard → **Authentication** → **Providers** → **Google**
2. Introducir el **Client ID** y **Client Secret** de Google Cloud Console
3. Añadir las **Redirect URLs** autorizadas:
   - `https://tu-dominio-pre.vercel.app/auth`
   - `https://tu-dominio-prod.vercel.app/auth`
   - `http://localhost:5173/auth` (para desarrollo local)

### Paso 5 — Crear el primer administrador

1. Registra el usuario admin en la app (UI normal de registro)
2. Confirma el email si InsForge lo requiere
3. Ejecuta `docs/sql/05_admin.sql` con el email real:
   ```sql
   -- En el SQL editor de InsForge:
   UPDATE auth.users
   SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"role": "admin"}'::jsonb
   WHERE email = 'email-del-admin@example.com';

   UPDATE public.profiles
   SET role = 'admin', updated_at = now()
   WHERE id = (SELECT id FROM auth.users WHERE email = 'email-del-admin@example.com');
   ```
4. Verifica:
   ```sql
   SELECT u.email, u.metadata->>'role' AS meta_role, p.role AS profile_role
   FROM auth.users u JOIN public.profiles p ON p.id = u.id
   WHERE u.email = 'email-del-admin@example.com';
   ```
   Resultado esperado: ambas columnas muestran `admin`.

### Paso 6 — Actualizar variables de entorno

#### En desarrollo local (`.env.local`):
```bash
VITE_INSFORGE_URL=https://XXXXXXXX.eu-central.insforge.app
VITE_INSFORGE_ANON_KEY=eyJ...nueva-clave-anon...
```

#### En GitHub Actions secrets:
Ir a **GitHub → repo → Settings → Secrets and variables → Actions** y actualizar:

| Secret | Entorno |
|--------|---------|
| `INSFORGE_URL_PRE`       | Base URL del proyecto PRE  |
| `INSFORGE_ANON_KEY_PRE`  | Anon Key del proyecto PRE  |
| `INSFORGE_URL_PROD`      | Base URL del proyecto PROD |
| `INSFORGE_ANON_KEY_PROD` | Anon Key del proyecto PROD |

> Los secrets de Vercel (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_*`) solo cambian si también se migra Vercel.

---

## Migración de Vercel

La migración de Vercel es más sencilla porque el código es el mismo. Solo cambian variables de entorno.

### Paso 1 — Crear proyectos en Vercel

1. **Vercel dashboard** → **New Project** → importar el repo de GitHub
2. Crear **dos proyectos**: uno para PRE y otro para PRO
3. En cada proyecto → **Settings** → **Git** → **Ignored Build Step** → poner `exit 1`
   (evita despliegues duplicados con el CI manual)

### Paso 2 — Configurar variables de entorno en Vercel

Para el proyecto **PRE**:

| Variable | Valor |
|----------|-------|
| `VITE_INSFORGE_URL`       | URL del proyecto InsForge PRE |
| `VITE_INSFORGE_ANON_KEY`  | Anon Key InsForge PRE         |
| `VITE_APP_ENV`            | `preview`                     |
| `VITE_APP_NAME`           | `Gio Barber Shop`             |
| `VITE_GOOGLE_OAUTH_ENABLED` | `true`                      |

Para el proyecto **PRO**: misma estructura con valores de PRO.

### Paso 3 — Actualizar secrets de GitHub Actions

| Secret | Descripción |
|--------|-------------|
| `VERCEL_TOKEN`            | Token de la nueva cuenta Vercel |
| `VERCEL_ORG_ID`           | Team/Org ID de Vercel           |
| `VERCEL_PROJECT_ID_PRE`   | ID del proyecto PRE en Vercel   |
| `VERCEL_PROJECT_ID_PROD`  | ID del proyecto PRO en Vercel   |

Obtener IDs: Vercel dashboard → proyecto → **Settings** → **General** → Project ID.

---

## Verificación post-migración

Después de migrar, ejecuta este checklist:

### Base de datos
- [ ] `SELECT * FROM public.services LIMIT 1` devuelve datos
- [ ] `SELECT * FROM public.barbers LIMIT 1` devuelve datos
- [ ] `SELECT * FROM public.shop_config WHERE key = 'schedule'` devuelve el horario
- [ ] El trigger está activo: `SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
- [ ] RLS activo en todas las tablas: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`

### Aplicación
- [ ] La página de booking muestra los servicios reales
- [ ] Los barberos aparecen en el calendario
- [ ] El login con email funciona en PRE
- [ ] El login con Google funciona en PRE (si está configurado)
- [ ] El admin puede acceder al dashboard tras login
- [ ] El flujo completo de reserva funciona (servicio → barbero → fecha → confirmar)

---

## Rollback

Si algo sale mal durante la migración:

1. **Si las tablas están a medio crear**: ejecutar `02_schema.sql` de nuevo (es idempotente con `CREATE TABLE IF NOT EXISTS`)
2. **Si los datos están mal**: ejecutar `04_seed.sql` de nuevo (`ON CONFLICT DO NOTHING` protege los existentes; usar `DO UPDATE` si quieres sobreescribir)
3. **Si el RLS bloquea algo inesperado**: temporalmente `ALTER TABLE <tabla> DISABLE ROW LEVEL SECURITY;` para diagnosticar, luego re-habilitar
4. **Si el trigger no crea perfiles**: ejecutar solo la sección del trigger de `02_schema.sql`

---

## Archivos de referencia

| Archivo | Descripción |
|---------|-------------|
| `docs/sql/02_schema.sql` | Tablas, índices, funciones, trigger de perfiles |
| `docs/sql/03_rls.sql`    | Políticas RLS de todas las tablas |
| `docs/sql/04_seed.sql`   | Datos iniciales (servicios, barberos, config) |
| `docs/sql/05_admin.sql`  | Plantilla para promover usuario a admin |
| `.env` / `.env.local`    | Variables de entorno locales |
| `.github/workflows/`     | CI/CD — ver Art. 9 del CONSTITUTION.md |
