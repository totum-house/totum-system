-- Patch de produção para supa.grupototum.com (schema totum_system) — B-039 (grupo Financeiro).
-- Bug: criar lançamento falha em prod. src/components/financial/FinancialFormDialog.tsx
-- envia entry_class/nature/installment_number/total_installments/created_by;
-- src/hooks/useReports.ts, src/hooks/useExecutiveDashboard.ts e src/pages/Financial.tsx
-- leem entry_class/nature/parcelas; src/hooks/useImportData.ts importa com
-- entry_class/nature. A baseline do self-hosted só tem type (pagar/receber).
-- O PostgREST rejeita com 42703 ("column financial_entries.entry_class does not exist").
--
-- Puramente aditivo (colunas nullable, CHECKs só aceitam valores que o front
-- envia): reversível com DROP COLUMN. created_by sem FK (auth.users fica fora
-- do schema totum_system e o front tolera null).
--
-- Aplicar manualmente (psql/SQL editor).

BEGIN;

ALTER TABLE totum_system.financial_entries
  ADD COLUMN IF NOT EXISTS entry_class text
    CHECK (entry_class IS NULL OR entry_class IN ('receita', 'custo', 'despesa')),
  ADD COLUMN IF NOT EXISTS nature text
    CHECK (nature IS NULL OR nature IN ('fixo', 'variavel')),
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS created_by uuid;

NOTIFY pgrst, 'reload schema';

COMMIT;
