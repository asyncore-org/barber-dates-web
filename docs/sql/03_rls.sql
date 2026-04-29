-- =============================================================================
-- 03_rls.sql — Gio Barber Shop — Row Level Security
-- =============================================================================
-- Ejecutar después de 02_schema.sql.
-- Principio: mínimo privilegio. Anon puede leer el catálogo público.
-- El rol 'admin' tiene acceso completo a todo vía la función is_admin().
-- =============================================================================


-- ─── BARBEROS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- Lectura pública: cualquiera puede ver barberos activos (necesario para booking)
CREATE POLICY "barbers_select_public"
  ON public.barbers FOR SELECT
  USING (is_active = true OR public.is_admin());

-- Solo admin puede insertar / actualizar / eliminar barberos
CREATE POLICY "barbers_insert_admin"
  ON public.barbers FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "barbers_update_admin"
  ON public.barbers FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "barbers_delete_admin"
  ON public.barbers FOR DELETE
  USING (public.is_admin());


-- ─── PERFILES ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve su propio perfil; admin ve todos
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- Solo el propio usuario (o admin) puede actualizar su perfil
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

-- Inserción solo vía trigger handle_new_user (SECURITY DEFINER) o admin
CREATE POLICY "profiles_insert_trigger_or_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());


-- ─── SERVICIOS ────────────────────────────────────────────────────────────────
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Catálogo público: cualquiera puede leer servicios activos
CREATE POLICY "services_select_public"
  ON public.services FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "services_insert_admin"
  ON public.services FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "services_update_admin"
  ON public.services FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "services_delete_admin"
  ON public.services FOR DELETE
  USING (public.is_admin());


-- ─── CITAS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Cada cliente ve sus propias citas; admin ve todas
CREATE POLICY "appointments_select_own_or_admin"
  ON public.appointments FOR SELECT
  USING (client_id = auth.uid() OR public.is_admin());

-- Solo el cliente puede crear su propia cita (o admin crea para cualquiera)
CREATE POLICY "appointments_insert_own_or_admin"
  ON public.appointments FOR INSERT
  WITH CHECK (client_id = auth.uid() OR public.is_admin());

-- Solo el admin puede actualizar cualquier cita
-- (el cliente no puede cambiar estado directamente, va por función de dominio)
CREATE POLICY "appointments_update_admin"
  ON public.appointments FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "appointments_delete_admin"
  ON public.appointments FOR DELETE
  USING (public.is_admin());


-- ─── BLOQUEOS DE HORARIO ──────────────────────────────────────────────────────
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

-- Lectura pública: el calendario de booking necesita saber qué días están cerrados
CREATE POLICY "schedule_blocks_select_public"
  ON public.schedule_blocks FOR SELECT
  USING (true);

CREATE POLICY "schedule_blocks_insert_admin"
  ON public.schedule_blocks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "schedule_blocks_update_admin"
  ON public.schedule_blocks FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "schedule_blocks_delete_admin"
  ON public.schedule_blocks FOR DELETE
  USING (public.is_admin());


-- ─── CONFIGURACIÓN DEL NEGOCIO ────────────────────────────────────────────────
ALTER TABLE public.shop_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública: la app necesita shop_info y schedule para mostrar el booking
CREATE POLICY "shop_config_select_public"
  ON public.shop_config FOR SELECT
  USING (true);

CREATE POLICY "shop_config_insert_admin"
  ON public.shop_config FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "shop_config_update_admin"
  ON public.shop_config FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "shop_config_delete_admin"
  ON public.shop_config FOR DELETE
  USING (public.is_admin());


-- ─── TARJETAS DE FIDELIZACIÓN ─────────────────────────────────────────────────
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_cards_select_own_or_admin"
  ON public.loyalty_cards FOR SELECT
  USING (client_id = auth.uid() OR public.is_admin());

CREATE POLICY "loyalty_cards_insert_admin"
  ON public.loyalty_cards FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "loyalty_cards_update_admin"
  ON public.loyalty_cards FOR UPDATE
  USING (public.is_admin());


-- ─── TRANSACCIONES DE FIDELIZACIÓN ───────────────────────────────────────────
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- El cliente puede ver sus transacciones a través de su tarjeta
CREATE POLICY "loyalty_tx_select_own_or_admin"
  ON public.loyalty_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loyalty_cards
      WHERE id = card_id AND client_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "loyalty_tx_insert_admin"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (public.is_admin());


-- ─── RECOMPENSAS ──────────────────────────────────────────────────────────────
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Lectura pública de recompensas activas
CREATE POLICY "rewards_select_public"
  ON public.rewards FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "rewards_insert_admin"
  ON public.rewards FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "rewards_update_admin"
  ON public.rewards FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "rewards_delete_admin"
  ON public.rewards FOR DELETE
  USING (public.is_admin());


-- ─── RECOMPENSAS CANJEADAS ────────────────────────────────────────────────────
ALTER TABLE public.redeemed_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redeemed_rewards_select_own_or_admin"
  ON public.redeemed_rewards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loyalty_cards
      WHERE id = card_id AND client_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "redeemed_rewards_insert_admin"
  ON public.redeemed_rewards FOR INSERT
  WITH CHECK (public.is_admin());
