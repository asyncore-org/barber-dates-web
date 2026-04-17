# Comando: /new-infra

Crea el adaptador de infrastructure para una entidad (capa que habla con InsForge).

## Uso
```
/new-infra <entidad>
```

Ejemplos:
- `/new-infra appointments`
- `/new-infra loyalty`
- `/new-infra services`
- `/new-infra users`

## Lo que debes hacer

1. **Crear** `src/infrastructure/insforge/[entidad].ts`:

```ts
import { insforgeClient } from './client';
import type { [Entidad], Create[Entidad]Input, Update[Entidad]Input } from '@/domain/[entidad]/[entidad].types';

// Mapper: convierte snake_case de DB a camelCase de dominio
function mapTo[Entidad](row: Record<string, unknown>): [Entidad] {
  return {
    id: row.id as string,
    // ... mapear todos los campos
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function fetch[Entidad]s(/* filtros opcionales */): Promise<[Entidad][]> {
  const { data, error } = await insforgeClient
    .from('[tabla_db]')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapTo[Entidad]);
}

export async function fetch[Entidad]ById(id: string): Promise<[Entidad]> {
  const { data, error } = await insforgeClient
    .from('[tabla_db]')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapTo[Entidad](data);
}

export async function create[Entidad](input: Create[Entidad]Input): Promise<[Entidad]> {
  const { data, error } = await insforgeClient
    .from('[tabla_db]')
    .insert({
      // mapear camelCase → snake_case para la DB
    })
    .select()
    .single();

  if (error) throw error;
  return mapTo[Entidad](data);
}

export async function update[Entidad](input: Update[Entidad]Input): Promise<[Entidad]> {
  const { id, ...rest } = input;
  const { data, error } = await insforgeClient
    .from('[tabla_db]')
    .update({
      // mapear campos actualizados
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTo[Entidad](data);
}

export async function delete[Entidad](id: string): Promise<void> {
  const { error } = await insforgeClient
    .from('[tabla_db]')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

2. **Verificar que existe** `src/infrastructure/insforge/client.ts` con el singleton del cliente InsForge. Si no existe, crearlo:

```ts
import { createClient } from '@insforge/js'; // o '@supabase/supabase-js' según la API de InsForge

export const insforgeClient = createClient(
  import.meta.env.VITE_INSFORGE_URL,
  import.meta.env.VITE_INSFORGE_ANON_KEY,
);
```

3. **Reglas críticas de la capa infrastructure**:
   - SIEMPRE lanzar el error de InsForge (`if (error) throw error`)
   - SIEMPRE mapear snake_case (DB) ↔ camelCase (dominio): la capa domain no conoce la DB
   - SIEMPRE devolver tipos del dominio (nunca el Row raw de InsForge)
   - Sin lógica de negocio aquí: solo comunicación con la DB
   - Sin estado de React, sin hooks, sin imports de `domain/`'s rules (solo types)

4. **Mostrar** el path creado y sugerir crear el hook con `/new-hook`
