-- Patch de produção para supa.grupototum.com (schema totum_system) — B-043 (grupo Entregas,
-- vizinho de B-039 encontrado na mesma verificação).
-- Bug: ao ativar contrato (src/hooks/useContracts.ts) ou gerar checklist
-- (src/services/checklistService.ts) o front insere delivery_checklist_items com
-- responsible_id, e a tela Entregas (src/hooks/useDeliveryChecklists.ts,
-- src/hooks/useClientDeliveries.ts, src/pages/Fulfillment.tsx) grava
-- justification/completed_at. A baseline do self-hosted só tem
-- title/status/notes/sort_order — o PostgREST rejeita com 42703.
--
-- O que NÃO entra aqui e foi resolvido no código: o front usava `name` para o
-- item e não enviava `title` em delivery_checklists (NOT NULL na baseline).
-- Agora envia `title` nos dois casos.
--
-- Puramente aditivo (colunas nullable): reversível com DROP COLUMN.
-- responsible_id sem FK pelo mesmo motivo de suggested_responsible_id
-- (auth.users fora do schema; o front usa profiles.user_id).
--
-- Aplicar manualmente (psql/SQL editor).

BEGIN;

ALTER TABLE totum_system.delivery_checklist_items
  ADD COLUMN IF NOT EXISTS responsible_id uuid,
  ADD COLUMN IF NOT EXISTS justification text,
  ADD COLUMN IF NOT EXISTS observation text,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

NOTIFY pgrst, 'reload schema';

COMMIT;
