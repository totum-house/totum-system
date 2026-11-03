-- Patch de produção para supa.grupototum.com (schema totum_system) — B-039 (grupo Contratos).
-- Bug: criar contrato falha em prod. O front (src/components/contracts/ContractFormDialog.tsx,
-- src/hooks/useContracts.ts, src/pages/Contracts.tsx, src/hooks/useProjectFormData.ts,
-- src/services/checklistService.ts) nasceu no Supabase cloud, onde contracts tinha
-- title/billing_frequency/package_id. A baseline do self-hosted só tem client_id,
-- plan_id, value, billing_day... O PostgREST rejeita com 42703
-- ("column contracts.title does not exist").
--
-- Puramente aditivo (colunas nullable): reversível com DROP COLUMN.
-- package_id guarda o id de um "pacote" (linha de plans, ver src/hooks/usePackages.ts)
-- mas fica SEM FK de propósito: uma segunda FK contracts → plans deixaria o embed
-- `contracts.select("*, plans(name)")` ambíguo no PostgREST (PGRST201) em
-- src/hooks/useContracts.ts, src/hooks/useClients.ts e src/hooks/useClientContracts.ts.
--
-- Aplicar manualmente (psql/SQL editor). Depois de aplicar, src/integrations/supabase/types.ts
-- já reflete estas colunas (atualizado no mesmo commit).

BEGIN;

ALTER TABLE totum_system.contracts
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS billing_frequency totum_system.checklist_frequency DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS package_id uuid;

NOTIFY pgrst, 'reload schema';

COMMIT;
