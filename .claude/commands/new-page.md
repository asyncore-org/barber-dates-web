# Comando: /new-page

Crea una nueva página con routing, SEO y AuthGuard correctamente configurados.

## Uso
```
/new-page <NombrePagina> <ruta> [rol]
```

Ejemplos:
- `/new-page CalendarPage /calendar client`
- `/new-page DashboardPage /admin/dashboard admin`
- `/new-page LandingPage / public`

## Lo que debes hacer

1. **Determinar la ubicación** según el rol:
   - `public` → `src/pages/public/`
   - `auth` → `src/pages/auth/`
   - `client` → `src/pages/client/`
   - `admin` → `src/pages/admin/`

2. **Crear el archivo** `src/pages/[rol]/[NombrePagina].tsx` con esta estructura:

**Página pública** (ej. LandingPage):
```tsx
import { SeoHead } from '@/components/seo/SeoHead';

export default function [NombrePagina]() {
  return (
    <>
      <SeoHead
        title="Gio Barber Shop — [descripción]"
        description="[descripción para Google]"
      />
      <main>
        {/* contenido */}
      </main>
    </>
  );
}
```

**Página protegida** (client o admin):
```tsx
import { SeoHead } from '@/components/seo/SeoHead';

export default function [NombrePagina]() {
  return (
    <>
      <SeoHead noIndex /> {/* Las páginas con auth NO se indexan */}
      <main>
        {/* contenido */}
      </main>
    </>
  );
}
```

3. **Añadir la ruta en `src/App.tsx`** usando `lazy()` + `AuthGuard`:

```tsx
// En los imports lazy al inicio de App.tsx:
const [NombrePagina] = lazy(() => import('@/pages/[rol]/[NombrePagina]'));

// En las Routes:
<Route
  path="[ruta]"
  element={
    <AuthGuard role="[rol]">  {/* Omitir si es pública */}
      <[NombrePagina] />
    </AuthGuard>
  }
/>
```

## Reglas que siempre debes aplicar
- **`export default`** en páginas (única excepción a la regla de named exports)
- **`<SeoHead noIndex />`** en TODAS las páginas protegidas (calendar, appointments, admin)
- **`lazy()`** siempre para code splitting
- **`AuthGuard`** obligatorio en rutas de client y admin
- Idioma de código: inglés; idioma de UI: español
- Sin llamadas directas a `infrastructure/`; usar hooks

4. **Confirmar** qué hooks necesita la página y ofrecerte a crearlos con `/new-hook`
