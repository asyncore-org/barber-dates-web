# Comando: /new-hook

Crea un hook de TanStack Query que orquesta domain + infrastructure.

## Uso

```
/new-hook <nombreHook> [entidad]
```

Ejemplos:

- `/new-hook useAppointments appointments`
- `/new-hook useLoyalty loyalty`
- `/new-hook useServices services`
- `/new-hook useAuth auth`

## Lo que debes hacer

1. **Crear el archivo** `src/hooks/[nombreHook].ts` con esta estructura base:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { [Tipo] } from '@/domain/[entidad]/[entidad].types';
import { fetch[Entidades], create[Entidad], update[Entidad], delete[Entidad] } from '@/infrastructure/insforge/[entidad]';

// Queries (lectura)
export function use[Entidades](/* params */) {
  return useQuery({
    queryKey: ['[entidad]s', /* params */],
    queryFn: () => fetch[Entidades](/* params */),
    staleTime: 60_000, // 1 minuto por defecto
  });
}

// Mutations (escritura)
export function useCreate[Entidad]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: create[Entidad],
    onSuccess: () => {
      // Invalidar queries relacionadas para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['[entidad]s'] });
    },
  });
}
```

2. **Convención de queryKeys** (seguir siempre este patrón):

```ts
;['appointments'][('appointments', userId)][('appointments', userId, date)][('rewards', 'public')][ // todas las citas // citas de un usuario // citas de un usuario en una fecha // datos públicos (sin auth)
  ('loyalty', userId)
] // loyalty de un usuario específico
```

3. **Reglas que siempre debes aplicar**:
   - Los hooks importan de `infrastructure/` y `domain/`, nunca al revés
   - `staleTime` siempre explícito (no dejar el default de 0)
   - `onSuccess`: siempre invalidar las queryKeys afectadas
   - Para mutaciones optimistas, añadir `onMutate` + `onError` con rollback
   - Sin `any` en tipos de TanStack Query (usar genéricos: `useQuery<Tipo>`)
   - Named exports (no default export en hooks)

4. **Si la entidad tiene reglas de dominio** (ej. `canCancelAppointment`), importarlas de `src/domain/` y usarlas en la capa de UI a través del hook:

```ts
import { canCancelAppointment } from '@/domain/appointment/appointment.rules'

export function useAppointmentActions(appointment: Appointment) {
  const canCancel = canCancelAppointment(appointment, new Date())
  // ...
}
```

5. **Mostrar** el path del archivo creado y preguntar si se necesita el adaptador de infrastructure asociado (`/new-infra`)
