# 02 — Los Archivos de Contexto

Estos archivos son la memoria persistente del proyecto. Claude los lee para entender las reglas, el estado y los aprendizajes — sin explorar el código desde cero en cada sesión. **Mantenerlos actualizados es tan importante como mantener el código.**

---

## CONSTITUTION.md — Las reglas inmutables

**Ruta**: `.claude/CONSTITUTION.md`
**Versión actual**: v1.0.0

### Qué contiene

14 artículos que cubren absolutamente todo lo que no puede cambiar sin consenso explícito:

| Art. | Contenido                                                      |
| ---- | -------------------------------------------------------------- |
| 1    | Identidad: nombre del proyecto, repo, plan maestro             |
| 2    | Stack tecnológico y restricciones                              |
| 3    | Arquitectura Clean Architecture — la regla de capas            |
| 4    | Las 7 reglas de negocio (citas, cancelación, puntos, sesiones) |
| 5    | Modelo de datos: tablas PostgreSQL y RLS                       |
| 6    | Rutas y flujo de autenticación                                 |
| 7    | Convenciones de código (idioma, exports, imports)              |
| 8    | Convención de commits (Conventional Commits)                   |
| 9    | Estrategia de ramas (main/develop/feature/hotfix)              |
| 10   | Paleta de colores y tipografía                                 |
| 11   | Objetivos de rendimiento (Lighthouse 95+)                      |
| 12   | SEO: robots.txt, llms.txt, sitemap                             |
| 13   | Variables de entorno (VITE\_\*)                                |
| 14   | Quality gates obligatorios                                     |

### Cómo lo lee Claude

**Nunca lo lee completo** (250+ líneas). El flujo correcto es:

```bash
# 1. Lee el índice (15 líneas) para saber qué artículo cargar
bash .claude/scripts/constitution-index.sh

# 2. Carga solo los artículos relevantes
bash .claude/scripts/art.sh 3   # Arquitectura
bash .claude/scripts/art.sh 4   # Reglas de negocio
```

### Cuándo y cómo actualizarlo

**Con Claude** (lo normal):

- Claude detecta que algo ha cambiado durante `/done → sync-context`.
- Te avisa: _"Art. 4 posiblemente desactualizado. Propongo añadir regla 8 sobre X. ¿Apruebas?"_
- Tú confirmas. Claude aplica el cambio y hace bump de versión.
- **Nunca toca el Constitution sin tu confirmación explícita.**

**Tú directamente**:

1. Edita el artículo correspondiente.
2. Actualiza la versión en la cabecera:
   - `1.0.0 → 1.1.0` para cambios que amplían sin romper.
   - `1.0.0 → 2.0.0` para cambios que contradicen algo anterior.
3. Actualiza `CONSTITUTION-INDEX.md` si cambiaste el título o añadiste un artículo.
4. Añade entrada en `DECISIONS.md` explicando por qué.

### Regla de oro

Nunca hagas algo en el código que contradiga el Constitution sin actualizar el Constitution primero. Si el código y el Constitution no dicen lo mismo, Claude trabajará con información falsa.

---

## CONSTITUTION-INDEX.md — El mapa de artículos

**Ruta**: `.claude/CONSTITUTION-INDEX.md`

### Qué es

Una tabla de 15 líneas que dice qué cubre cada artículo y cuándo cargarlo. Claude la lee en lugar del Constitution completo para saber qué artículo necesita.

```
| Art. | Tema | Cuándo cargarlo |
| 3    | Arquitectura: regla de capas | Siempre en /analyze de features |
| 4    | Reglas de negocio: las 7 reglas | Cuando la tarea toca domain/ |
...
```

### Cuándo actualizarlo

Cada vez que el Constitution cambie: nuevo artículo, artículo renombrado, artículo reorganizado. Es un paso obligatorio del protocolo de modificación del Constitution.

---

## KNOWLEDGE.md — Los aprendizajes vivos

**Ruta**: `.claude/KNOWLEDGE.md`

### Qué es

Un diario técnico de lo que se ha aprendido durante el desarrollo: cosas que no funcionan como esperabas, comandos útiles que no son obvios, errores conocidos que aún no se corrigen, workarounds que funcionan.

### Cómo se actualiza

La forma correcta es con el comando `/learn`:

```
/learn InsForge no soporta .rpc() con array args — usar .sql() directo
/learn pnpm run dev no hot-reloada en iCloud Drive — reiniciar Vite
```

Claude añade la entrada con el formato correcto y la fecha.

### Formato de cada entrada

```markdown
### YYYY-MM-DD — Título corto

**Contexto**: en qué situación aparece esto
**Qué**: descripción clara del problema o aprendizaje
**Por qué importa**: consecuencia práctica si no lo sabes
**Workaround/solución**: (si aplica) pasos concretos
```

### Cuándo usarlo (vs DECISIONS.md)

- **KNOWLEDGE.md** → aprendizajes prácticos, workarounds, gotchas. Cosas que te ahorran tiempo la próxima vez.
- **DECISIONS.md** → decisiones de arquitectura con impacto duradero sobre el diseño del sistema.

---

## DECISIONS.md — Las decisiones arquitectónicas (ADRs)

**Ruta**: `.claude/DECISIONS.md`

### Qué es

Un registro inmutable de decisiones técnicas importantes: por qué se eligió Vite en lugar de Next.js, por qué la arquitectura Clean, por qué InsForge, etc. Cuando alguien pregunte en el futuro _"¿por qué se hizo así?"_, la respuesta está aquí.

### Formato de cada ADR

```markdown
## ADR-NNN — Título · YYYY-MM-DD

- **Estado**: proposed | accepted | deprecated | superseded-by ADR-XXX
- **Contexto**: por qué surgió la pregunta / necesidad
- **Decisión**: qué se eligió exactamente
- **Alternativas consideradas**: qué más se evaluó y por qué no
- **Consecuencias**: qué implica esta decisión para el futuro
```

### Cuándo añadir un ADR

- Cuando eliges entre dos o más enfoques técnicos no triviales.
- Cuando descubres que la arquitectura actual no escala para un caso y decides adaptarla.
- Cuando cambias algo que estaba en el Constitution (el cambio va también en DECISIONS).
- Cuando rechazas una propuesta de Claude (para que quede documentado).

### ADRs existentes

| ADR     | Decisión                                       |
| ------- | ---------------------------------------------- |
| ADR-001 | Vite + React en lugar de Next.js               |
| ADR-002 | Clean Architecture estricta con `domain/` puro |
| ADR-003 | InsForge como BaaS                             |
| ADR-004 | Carpetas de tarea no commiteadas               |

---

## CLAUDE.md — El orquestador

**Ruta**: `CLAUDE.md` (raíz del repo)

### Qué es

El primer archivo que Claude lee en cada sesión. No contiene las reglas — apunta a donde están. Es intencionalmente ligero para que Claude lo cargue rápido y sepa dónde buscar cada cosa.

### Qué contiene

- La regla fundamental (no código sin /implement).
- Instrucciones de uso de scripts de fetch parcial.
- Mapa completo del sistema agéntico.
- Tabla de todos los comandos.
- Fase actual del proyecto.

### Cuándo actualizarlo

- Cuando avanza la fase del proyecto (de Fase 0 a Fase 1, etc.).
- Cuando se añade algo nuevo al sistema agéntico (nuevo comando, nuevo script).
- Cuando cambia algo fundamental en el flujo de trabajo.

---

## Tabla resumen: quién actualiza qué

| Archivo               | Lo actualiza Claude           | Lo actualizas tú | Cuándo                                           |
| --------------------- | ----------------------------- | ---------------- | ------------------------------------------------ |
| CONSTITUTION.md       | Sí, con tu confirmación       | Sí, directamente | Cuando el código introduce algo nuevo permanente |
| CONSTITUTION-INDEX.md | Sí, junto con la Constitution | Sí               | Cuando cambia un artículo                        |
| KNOWLEDGE.md          | Sí, vía `/learn`              | Sí, directamente | Al descubrir un gotcha o workaround              |
| DECISIONS.md          | Sí, cuando propone un ADR     | Sí               | Al tomar una decisión de arquitectura            |
| CLAUDE.md             | Sí, con tu confirmación       | Sí               | Al cambiar de fase o añadir algo al sistema      |
