-- =============================================================================
-- 04_seed.sql — Gio Barber Shop — Datos iniciales
-- =============================================================================
-- Ejecutar después de 03_rls.sql.
-- Usa UUIDs explícitos para poder referenciarlos entre tablas en el mismo script.
-- ON CONFLICT DO NOTHING: idempotente, se puede re-ejecutar sin duplicar datos.
-- =============================================================================


-- ─── SERVICIOS ────────────────────────────────────────────────────────────────
INSERT INTO public.services (id, name, description, duration_minutes, price, loyalty_points, sort_order, is_active)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Corte Clásico',
    'Corte de cabello con tijera y máquina al gusto del cliente.',
    30, 15.00, 10, 1, true
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Corte + Barba',
    'Corte completo más arreglo y definición de barba con navaja.',
    45, 22.00, 15, 2, true
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Afeitado Tradicional',
    'Afeitado con toalla caliente, crema y navaja clásica.',
    30, 14.00, 10, 3, true
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    'Corte Premium',
    'Corte exclusivo con diseño personalizado, masaje de cuero cabelludo incluido.',
    60, 30.00, 20, 4, true
  ),
  (
    'a0000000-0000-4000-8000-000000000005',
    'Tinte + Corte',
    'Coloración completa más corte a medida.',
    75, 38.00, 25, 5, true
  ),
  (
    'a0000000-0000-4000-8000-000000000006',
    'Niños (-12 años)',
    'Corte infantil en ambiente relajado.',
    25, 12.00, 8, 6, true
  )
ON CONFLICT (id) DO NOTHING;


-- ─── BARBEROS ─────────────────────────────────────────────────────────────────
-- specialty_ids: array JSON de UUIDs de services que este barbero ofrece.
-- Gio ofrece todos los servicios; Marcos ofrece un subconjunto.
INSERT INTO public.barbers (id, full_name, role, phone, email, bio, specialty_ids, is_active)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'Gio Valentino',
    'Maestro barbero',
    '641 36 13 52',
    'gio@giobarber.es',
    'Fundador y maestro barbero. Más de 15 años de experiencia en cortes clásicos y modernos.',
    '["a0000000-0000-4000-8000-000000000001","a0000000-0000-4000-8000-000000000002","a0000000-0000-4000-8000-000000000003","a0000000-0000-4000-8000-000000000004","a0000000-0000-4000-8000-000000000005","a0000000-0000-4000-8000-000000000006"]'::jsonb,
    true
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'Marcos Castaño',
    'Barbero',
    '612 44 78 91',
    'marcos@giobarber.es',
    'Especialista en cortes modernos y degradados. 8 años de experiencia.',
    '["a0000000-0000-4000-8000-000000000001","a0000000-0000-4000-8000-000000000002","a0000000-0000-4000-8000-000000000003","a0000000-0000-4000-8000-000000000006"]'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;


-- ─── CONFIGURACIÓN DEL NEGOCIO ────────────────────────────────────────────────

-- Información del negocio
-- ⚠️ Actualizar con los datos reales de la barbería antes de ejecutar en PRO.
INSERT INTO public.shop_config (key, value)
VALUES (
  'shop_info',
  '{
    "name":        "Gio Barber Shop",
    "phone":       "641 36 13 52",
    "email":       "hola@giobarber.es",
    "instagram":   "@gio_barber_19",
    "address":     "Calle Mayor 42, 28013 Madrid",
    "description": "Barbería moderna con ambiente masculino y atención personalizada."
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- Horario semanal base
-- barberIds: UUIDs de los barberos que trabajan ese día.
-- ⚠️ Ajustar según el horario real de la barbería.
INSERT INTO public.shop_config (key, value)
VALUES (
  'schedule',
  '{
    "mon": { "open": false, "from": "",      "to": "",      "barberIds": [] },
    "tue": { "open": true,  "from": "10:00", "to": "20:00", "barberIds": ["b0000000-0000-4000-8000-000000000001","b0000000-0000-4000-8000-000000000002"] },
    "wed": { "open": true,  "from": "10:00", "to": "20:00", "barberIds": ["b0000000-0000-4000-8000-000000000001","b0000000-0000-4000-8000-000000000002"] },
    "thu": { "open": true,  "from": "10:00", "to": "20:00", "barberIds": ["b0000000-0000-4000-8000-000000000001","b0000000-0000-4000-8000-000000000002"] },
    "fri": { "open": true,  "from": "10:00", "to": "21:00", "barberIds": ["b0000000-0000-4000-8000-000000000001","b0000000-0000-4000-8000-000000000002"] },
    "sat": { "open": true,  "from": "09:00", "to": "15:00", "barberIds": ["b0000000-0000-4000-8000-000000000001"] },
    "sun": { "open": false, "from": "",      "to": "",      "barberIds": [] }
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- Configuración de reservas
INSERT INTO public.shop_config (key, value)
VALUES (
  'booking',
  '{
    "maxAdvanceDays":     14,
    "allowBarberChoice":  true,
    "slotIntervalMinutes": 15,
    "bufferMinutes":       0
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- Configuración de fidelización
INSERT INTO public.shop_config (key, value)
VALUES (
  'loyalty',
  '{
    "pointsPerEuro": 1,
    "stampGoal":     10,
    "enabled":       true
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- ─── RECOMPENSAS ──────────────────────────────────────────────────────────────
INSERT INTO public.rewards (id, label, cost, is_active, sort_order)
VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Corte gratis',          100, true, 1),
  ('c0000000-0000-4000-8000-000000000002', '20% descuento en tinte', 50, true, 2),
  ('c0000000-0000-4000-8000-000000000003', 'Barba gratis con corte', 75, true, 3),
  ('c0000000-0000-4000-8000-000000000004', 'Cerveza de la casa',     25, true, 4)
ON CONFLICT (id) DO NOTHING;
