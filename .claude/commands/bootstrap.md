# Comando: /bootstrap

Prepara el contexto inicial del proyecto usando el estado actual del repo y las instrucciones del usuario.
Se ejecuta una vez despues de `carlex init` o `carlex upgrade`.

## Uso

```
/bootstrap [nombre-proyecto] [nota opcional]
```

## Precondiciones

- Existe `.claude/` en la raiz del repo.
- Si hay una tarea activa, preguntar si se pausa o se cierra antes de continuar.

## Lo que debes hacer

### 1. Recoger instrucciones del usuario

Pide un brief minimo y concreto. Si falta algo critico, pregunta.
Usa este formato para acelerar:

```
Proyecto:
Objetivo:
Usuarios/roles:
Flujo principal:
No-objetivos:
Stack esperado:
Datos/DB:
Auth/roles:
Infra/deploy:
Quality gates:
```

### 2. Escanear el repo (agentico)

Objetivo: derivar hechos verificables del repo para completar el contexto.

- Ejecutar el escaneo rapido:
  `bash .claude/scripts/bootstrap-scan.sh`
- Listar raiz y carpetas clave (`src/`, `apps/`, `packages/`, `docs/`).
- Detectar manifiestos y configuracion:
  - JS/TS: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.*`, `next.config.*`.
  - Python: `pyproject.toml`, `requirements.txt`.
  - Go: `go.mod`.
  - Rust: `Cargo.toml`.
  - Ruby: `Gemfile`.
  - PHP: `composer.json`.
- Identificar build/test/lint desde scripts o configs.
- Detectar capa de datos: migrations, schema, orm, sql, `supabase/`, `prisma/`, etc.
- Localizar variables de entorno (`.env*`, `process.env`, `import.meta.env`).
- Si hace falta, usar subagente `Explore` para mapear areas grandes sin inflar contexto.

### 3. Armar borrador de contexto

Consolida en un resumen breve:

- Nombre del proyecto + descripcion en 2-3 frases.
- Stack real (lenguajes, framework, build, test, deploy).
- Arquitectura observada (monorepo, capas, modulos).
- Dominio y reglas de negocio conocidas.
- Modelo de datos (tablas, entidades, relaciones si existen).
- Variables de entorno detectadas.
- Riesgos o dudas pendientes.

### 4. Actualizar archivos de contexto (con confirmacion)

Archivos a revisar y ajustar:

- `CLAUDE.md`: nombre del proyecto, resumen, fase actual, mapa rapido.
- `.claude/CONSTITUTION.md`: stack, arquitectura, reglas, modelo de datos, rutas, env vars.
- `.claude/CONSTITUTION-INDEX.md`: si cambian titulos o estructura.
- `.claude/DECISIONS.md`: agregar ADR inicial si hay decisiones claras (framework, DB, arquitectura).
- `.claude/KNOWLEDGE.md`: gotchas descubiertos durante el escaneo.

**Regla**: nunca modificar el Constitution sin confirmacion explicita del usuario.

### 5. Reportar y cerrar

Entregar un resumen y pedir confirmacion de cambios pendientes:

```
Context bootstrap listo:
  - CLAUDE.md: <cambios>
  - CONSTITUTION.md: <cambios>
  - DECISIONS.md: <cambios>
  - KNOWLEDGE.md: <cambios>

Siguiente paso recomendado: /feature <slug> o /fix <slug>
```

**No tocar `src/`. Este comando solo modifica archivos de contexto.**
