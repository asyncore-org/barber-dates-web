# Constitution — Índice de artículos

> Lee este archivo (15 líneas) para saber qué artículo cargar con `bash .claude/scripts/art.sh <N>`.
> Nunca leas el CONSTITUTION.md completo si solo necesitas uno o dos artículos.

| Art. | Tema | Cuándo cargarlo |
|------|------|----------------|
| 1 | Identidad del proyecto: nombre, repo, plan maestro | Rara vez |
| 2 | Stack tecnológico y restricciones (React, Vite, InsForge...) | Cuando decides una nueva tecnología |
| 3 | Arquitectura: regla de capas, qué puede importar qué | **Siempre en /analyze de features** |
| 4 | Reglas de negocio: las 7 reglas (citas, cancelación, puntos, sesiones) | Cuando la tarea toca domain/ |
| 5 | Modelo de datos: tablas PostgreSQL y RLS | Cuando la tarea toca DB o InsForge |
| 6 | Rutas de la app y flujo de autenticación | Cuando la tarea toca routing o auth |
| 7 | Convenciones de código: idioma, exports, imports, comentarios | En /review o cuando hay duda de estilo |
| 8 | Convención de commits: formato, tipos y scopes | Antes de hacer un commit |
| 9 | Estrategia de ramas: base de cada tipo de rama | Al crear una rama |
| 10 | Paleta de colores y tipografía | Cuando la tarea toca estilos |
| 11 | Rendimiento: lazy(), memo, virtual... | Cuando la tarea toca componentes de lista o páginas |
| 12 | SEO: robots.txt, llms.txt, prerenderizado | Cuando la tarea toca la landing o SEO |
| 13 | Variables de entorno: lista de VITE_* | Al configurar entornos o añadir servicios |
| 14 | Quality gates: comandos de verificación | Antes de /done |
