# Workflow: /optimize — guía de análisis por scope

> Esta guía es la referencia interna del comando `/optimize`.
> Claude la lee durante la fase de análisis para saber qué revisar en cada scope.

---

## Scope: `bundle`

**Objetivo**: identificar oportunidades de reducir el tamaño del bundle JS/CSS entregado al navegador.

**Herramientas**:
```bash
pnpm run analyze   # abre Vite bundle visualizer en el browser
```

**Qué buscar**:
1. Chunks principales > 200 KB sin gzip → candidatos a splitting con `import()`.
2. Dependencias pesadas incluidas en el chunk `vendor` que solo se usan en una ruta → moverlas a import dinámico.
3. `import` estáticos en `pages/` de librerías que podrían ser dinámicos (`react-pdf`, `chart.js`, etc.).
4. Duplicados de paquetes en el bundle (dos versiones de la misma lib).
5. Assets de imágenes sin optimizar incluidos en el bundle.

**Cómo reportarlo**: `[BUN-N] <descripción> → <acción concreta> → estimado <X KB ahorro>`

---

## Scope: `queries`

**Objetivo**: identificar ineficiencias en las llamadas a InsForge (Supabase).

**Dónde mirar**: `src/infrastructure/` — todos los archivos `*.adapter.ts` o `*.repository.ts`.

**Qué buscar**:
1. **Sin paginación**: llamadas que traen todos los registros (`.select()` sin `.range()` o `.limit()`).
2. **N+1**: bucle que hace una llamada por iteración en lugar de un join o `.in()`.
3. **Campos innecesarios**: `.select('*')` cuando solo se usan 2-3 columnas.
4. **Sin índices obvios**: filtros por columnas que probablemente no tienen índice (fecha, foreign key, status).
5. **Llamadas duplicadas**: dos adapters distintos que hacen la misma query.

**Herramientas**:
- Usar `insforge-pre` MCP (herramienta `execute_sql`) para `EXPLAIN ANALYZE` de queries sospechosas.
- Grep en `src/infrastructure/` para `.select(` y `.eq(` para encontrar todos los puntos de acceso.

**Cómo reportarlo**: `[QRY-N] <adapter>:<línea> — <problema> → <solución>` 

---

## Scope: `accessibility`

**Objetivo**: identificar barreras de accesibilidad en los componentes UI.

**Dónde mirar**: `src/components/` y `src/pages/`.

**Qué buscar**:
1. **Botones sin etiqueta**: `<button>` con solo un icono y sin `aria-label`.
2. **Imágenes sin alt**: `<img>` sin `alt` o con `alt=""` incorrectos.
3. **Foco no gestionado**: modales/dialogs que no atrapan el foco ni lo devuelven al cerrar.
4. **Contraste de color**: elementos de texto con ratio < 4.5:1 (revisar en Tailwind config y paleta Art. 10).
5. **Navegación por teclado**: componentes interactivos no accesibles con Tab/Enter/Escape.
6. **Landmarks**: ausencia de `<main>`, `<nav>`, `<header>` semánticos.
7. **Form labels**: inputs sin `<label>` asociado o sin `aria-label`.

**Cómo reportarlo**: `[A11Y-N] <componente>:<línea> — <problema> → <solución>`

---

## Scope: `seo`

**Objetivo**: verificar que las páginas son indexables correctamente y bien descritas para buscadores.

**Dónde mirar**: `src/pages/`, `public/robots.txt`, `public/llms.txt`, uso de `<SeoHead>`.

**Qué buscar**:
1. **Páginas sin SeoHead**: rutas públicas (landing, barber profile, etc.) sin meta title/description.
2. **Títulos genéricos**: SeoHead con `title="Gio Barber Shop"` igual en todas las páginas.
3. **robots.txt**: rutas de admin/dashboard bloqueadas correctamente con `Disallow`.
4. **llms.txt**: existe y describe el propósito del sitio para LLMs.
5. **Prerenderizado**: páginas con contenido estático que podrían prebuildarse (Art. 12).
6. **Open Graph**: ausencia de `og:image`, `og:title`, `og:description` en páginas compartibles.
7. **Canonical URL**: duplicados de ruta sin canonical.

**Cómo reportarlo**: `[SEO-N] <página/archivo> — <problema> → <solución>`

---

## Scope: `renders`

**Objetivo**: identificar re-renders innecesarios que degradan la experiencia de usuario.

**Dónde mirar**: `src/components/`, `src/hooks/`, `src/pages/`.

**Qué buscar**:
1. **Objetos/arrays inline en JSX**: `<Comp style={{ ... }}>` — nuevo objeto en cada render.
2. **Funciones inline en JSX**: `<Comp onClick={() => fn(id)}>` sin `useCallback`.
3. **Contextos de valor amplio**: un Context que incluye datos que cambian frecuentemente y tiene muchos consumidores.
4. **Componentes de lista sin memo**: items de lista que re-renderizan aunque su prop no cambie.
5. **useMemo/useCallback mal usado**: dependencias que siempre cambian, haciendo el memo inútil.
6. **Selectors de TanStack Query demasiado amplios**: query que devuelve un objeto grande cuando solo se necesita un campo.

**Herramientas**:
- Revisión estática de código (no requiere profiler).
- En `/test` posterior: verificar con React DevTools Profiler si aplica.

**Cómo reportarlo**: `[RND-N] <componente>:<línea> — <problema> → <solución>`

---

## Scope: `all` (sin argumentos)

Ejecutar los 5 scopes anteriores en secuencia. El reporte agrupa todos los hallazgos con sus prefijos.

**Orden recomendado**: `bundle` → `queries` → `renders` → `seo` → `accessibility`  
(de mayor a menor impacto típico en apps SPA con backend InsForge)

---

## Priorización para el reporte final

| Severidad | Criterio |
|---|---|
| 🔴 Crítico | Impacto alto (> 20% mejora) Y esfuerzo bajo (< 2h) |
| 🟡 Mejora | Impacto medio O esfuerzo medio (2-8h) |
| 🟢 Nice-to-have | Impacto bajo O esfuerzo alto (> 8h) |

Cada hallazgo debe tener: código (`BUN-01`), descripción, archivo:línea si aplica, y acción concreta.
