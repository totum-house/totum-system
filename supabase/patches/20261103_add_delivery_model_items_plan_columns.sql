-- Patch de produção para supa.grupototum.com (schema totum_system) — B-039 (grupo Pacotes).
-- Bug: a tela Pacotes (src/pages/Packages.tsx, src/hooks/usePackages.ts) e a geração
-- de entregas/tarefas (src/services/checklistService.ts, src/hooks/useContracts.ts,
-- src/components/tasks/GenerateTasksDialog.tsx) usam delivery_model_items como
-- "itens do pacote": plan_id, sort_order, task_type, suggested_priority,
-- suggested_responsible_id. A baseline do self-hosted só tem name/description/
-- frequency/is_active, sem vínculo com plans — o PostgREST rejeita o embed
-- plans → delivery_model_items (PGRST200) e o .eq("plan_id") (42703).
--
-- plans NÃO recebe coluna nova: o código passou a usar price/billing_cycle,
-- que já existem na baseline, no lugar de value/frequency.
--
-- Puramente aditivo (colunas nullable ou com default; FK ON DELETE CASCADE em
-- plan_id para itens órfãos sumirem com o pacote): reversível com DROP COLUMN.
-- suggested_responsible_id fica sem FK de propósito — no cloud apontava para
-- auth.users; aqui o front usa profiles.user_id e nem toda org tem usuário.
--
-- Aplicar manualmente (psql/SQL editor).

BEGIN;

ALTER TABLE totum_system.delivery_model_items
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES totum_system.plans(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_type totum_system.task_type NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS suggested_priority totum_system.task_priority NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS suggested_responsible_id uuid;

CREATE INDEX IF NOT EXISTS delivery_model_items_plan_id_idx
  ON totum_system.delivery_model_items (plan_id, sort_order);

NOTIFY pgrst, 'reload schema';

COMMIT;
