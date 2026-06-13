-- =============================================================================
-- 10_migration_loyalty_fixes.sql — Gio Barber Shop
-- Correcciones al sistema de fidelización:
--
--   1. Añade política DELETE en loyalty_transactions para admin/owner.
--      Sin ella, las operaciones de ajuste manual y limpieza de historial
--      fallan silenciosamente o con error de permisos.
--
--   2. Añade política DELETE en redeemed_rewards para admin/owner.
--      Necesaria para el reset automático de ciclos (cuando el cliente
--      canjea todas las recompensas, se limpian para reiniciar).
--
--   3. Añade 'manual' al CHECK de loyalty_transactions.type para
--      compatibilidad retroactiva (el código nuevo ya usa 'adjustment',
--      pero puede haber datos históricos con 'manual').
--
-- Ejecutar en el SQL Editor de InsForge / Supabase.
-- Es idempotente (usa IF NOT EXISTS / OR REPLACE).
-- =============================================================================


-- ─── 1. DELETE en loyalty_transactions ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'loyalty_transactions'
    AND policyname  = 'loyalty_tx_delete_admin'
  ) THEN
    CREATE POLICY "loyalty_tx_delete_admin"
      ON public.loyalty_transactions FOR DELETE
      USING (public.is_admin());
  END IF;
END
$$;


-- ─── 2. DELETE en redeemed_rewards ────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'redeemed_rewards'
    AND policyname  = 'redeemed_rewards_delete_admin'
  ) THEN
    CREATE POLICY "redeemed_rewards_delete_admin"
      ON public.redeemed_rewards FOR DELETE
      USING (public.is_admin());
  END IF;
END
$$;


-- ─── 3. Ampliar CHECK de loyalty_transactions.type ────────────────────────────
-- El código anterior usaba 'manual'; el nuevo usa 'adjustment'.
-- Esta migración amplía el CHECK para aceptar ambos sin romper datos existentes.
ALTER TABLE public.loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_type_check;

ALTER TABLE public.loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_type_check
    CHECK (type IN ('earned', 'redeemed', 'bonus', 'adjustment', 'manual'));


-- ─── VERIFICACIÓN ─────────────────────────────────────────────────────────────
-- Ejecutar para confirmar que las políticas se crearon correctamente:
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('loyalty_transactions', 'redeemed_rewards')
-- ORDER BY tablename, cmd;
--
-- Resultado esperado: DELETE policies presentes en ambas tablas.
-- =============================================================================
