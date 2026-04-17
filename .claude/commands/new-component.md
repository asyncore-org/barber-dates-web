# Comando: /new-component

Crea un nuevo componente React siguiendo la arquitectura y convenciones del proyecto.

## Uso
```
/new-component <NombreComponente> [carpeta]
```

Ejemplos:
- `/new-component AppointmentCard appointments`
- `/new-component MonthCalendar calendar`
- `/new-component PointsDisplay loyalty`

## Lo que debes hacer

1. **Determinar la ubicación** según el argumento `[carpeta]`:
   - Si es UI genérico o shadcn wrapper → `src/components/ui/`
   - Si es layout → `src/components/layout/`
   - Si es `auth` → `src/components/auth/`
   - Si es `calendar` → `src/components/calendar/`
   - Si es `loyalty` → `src/components/loyalty/`
   - Si es `appointments` → `src/components/appointments/`
   - Si no se especifica, pregunta antes de crear

2. **Crear el archivo** `src/components/[carpeta]/[NombreComponente].tsx` con esta estructura:

```tsx
import type { FC } from 'react';

interface [NombreComponente]Props {
  // props aquí
}

export const [NombreComponente]: FC<[NombreComponente]Props> = ({ /* props */ }) => {
  return (
    <div>
      {/* contenido */}
    </div>
  );
};
```

## Reglas que siempre debes aplicar
- **Named export** (nunca `export default` en componentes, solo en páginas)
- **Idioma del código**: inglés (nombres de props, variables, funciones internas)
- **Idioma de la UI**: español (textos visibles en JSX)
- **Sin `any`**: todos los tipos explícitos
- **TailwindCSS**: utility classes, sin `style={{}}` salvo valores imposibles en Tailwind
- **Colores del proyecto**: usar `#C8A44E` para dorado, no inventar colores
- **Sin llamadas a `infrastructure/`**: los componentes usan hooks o reciben datos como props
- **Sin comentarios obvios**: solo si el WHY no es evidente

3. **Preguntar** si el componente necesita un hook asociado y ofrecerte a crearlo con `/new-hook`

4. **Mostrar** el path exacto del archivo creado al finalizar
