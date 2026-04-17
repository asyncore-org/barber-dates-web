# Comando: /new-domain

Crea los tipos y reglas de negocio en la capa domain. Esta es la capa más importante: CERO dependencias externas.

## Uso

```
/new-domain <entidad>
```

Ejemplos:

- `/new-domain appointment`
- `/new-domain loyalty`
- `/new-domain service`
- `/new-domain user`

## Lo que debes hacer

1. **Crear** `src/domain/[entidad]/[entidad].types.ts`:

```ts
// Tipos puros: solo TypeScript, sin imports de librerías externas

export type [Entidad]Status = 'confirmed' | 'completed' | 'cancelled' | 'no_show'; // ejemplo

export interface [Entidad] {
  id: string;
  // ... campos de la tabla correspondiente en la DB
  createdAt: Date;
  updatedAt: Date;
}

// DTOs para crear/actualizar (sin id ni timestamps)
export interface Create[Entidad]Input {
  // ...
}

export interface Update[Entidad]Input {
  id: string;
  // solo los campos actualizables
}
```

2. **Crear** `src/domain/[entidad]/[entidad].rules.ts`:

```ts
// Funciones puras: sin efectos secundarios, sin llamadas a API, sin estado de React
// Deben ser 100% testeables sin mocks

import type { [Entidad] } from './[entidad].types';

// Constantes de negocio (exportar para que los tests las usen)
export const SOME_BUSINESS_CONSTANT = 42;

export function canDo[Algo](entity: [Entidad], now: Date): boolean {
  // lógica pura aquí
  return true;
}

export function calculate[Algo](/* parámetros con tipos explícitos */): number {
  // cálculo puro aquí
  return 0;
}
```

3. **Reglas CRÍTICAS de la capa domain** (nunca romper estas):
   - **CERO imports externos**: ni `react`, ni `@tanstack/react-query`, ni `date-fns`, ni InsForge
   - Las únicas importaciones permitidas son de otros archivos dentro de `src/domain/`
   - Todas las funciones deben ser **puras** (mismo input → mismo output, sin efectos secundarios)
   - Los tipos deben mapear 1:1 con el modelo de datos de la DB (con camelCase en TS, snake_case en DB)
   - Las **constantes de negocio** siempre exportadas como `const` con nombre descriptivo
   - Sin comentarios que expliquen qué hace el código; solo si el WHY no es obvio

4. **Crear el test** `src/domain/[entidad]/[entidad].rules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canDo[Algo], SOME_BUSINESS_CONSTANT } from './[entidad].rules';

describe('canDo[Algo]', () => {
  it('returns true when [condición]', () => {
    const entity = { /* datos de prueba */ };
    expect(canDo[Algo](entity, new Date())).toBe(true);
  });

  it('returns false when [condición]', () => {
    const entity = { /* datos de prueba */ };
    expect(canDo[Algo](entity, new Date())).toBe(false);
  });
});
```

Los tests de domain son los más valiosos: funciones puras, sin mocks, sin setup complejo.

5. **Mostrar** los paths creados y sugerir crear el adaptador de infrastructure con `/new-infra [entidad]`
