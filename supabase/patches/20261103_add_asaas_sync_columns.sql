-- Patch de produção para supa.grupototum.com (schema totum_system) — B-039 (grupo Asaas).
-- Bug: a integração Asaas (src/services/asaasService.ts, src/hooks/useAsaas.ts,
-- painéis em src/components/asaas e src/components/financial/AsaasFinancialPanel.tsx,
-- edge function supabase/functions/asaas-webhook) nasceu no Supabase cloud com
-- um schema próprio. A baseline do self-hosted tem outra modelagem:
--   asaas_customers.asaas_id (texto, id no Asaas)        — o front usava asaas_customer_id
--   asaas_payments.asaas_id / asaas_customer_id (uuid → asaas_customers.id)
--                                                        — o front usava asaas_payment_id e gravava
--                                                          o id textual do Asaas no uuid
--   asaas_subscriptions.asaas_id                         — o front usava asaas_subscription_id
-- e faltam client_id/contract_id (e a FK → clients que o embed clients(name) exige),
-- financial_entry_id (webhook), campos Pix/parcela/desconto e as flags de asaas_config.
--
-- Estratégia (aprovada em 2026-11-03):
--   * asaas_id continua sendo a chave natural (NOT NULL na baseline). O front passa a
--     gravar asaas_id em vez de asaas_customer_id/asaas_payment_id/asaas_subscription_id.
--   * asaas_payment_id e asaas_subscription_id viram colunas GERADAS a partir de asaas_id,
--     para a edge function asaas-webhook (já publicada, lê/filtra por asaas_payment_id) e os
--     .eq("asaas_payment_id") do front continuarem funcionando sem duplicar escrita.
--   * asaas_payments.asaas_customer_id continua uuid → asaas_customers.id; o front
--     resolve o uuid pelo asaas_id antes de inserir.
--
-- Puramente aditivo (colunas nullable/geradas; FKs ON DELETE SET NULL; índice único
-- parcial em asaas_customers.client_id, exigido pelo upsert onConflict do front):
-- reversível com DROP COLUMN / DROP INDEX. Se o índice único falhar por client_id
-- duplicado, limpar as duplicatas antes — hoje a tabela está vazia.
--
-- Aplicar manualmente (psql/SQL editor).

BEGIN;

-- asaas_config: flags do painel Admin > Integrações
ALTER TABLE totum_system.asaas_config
  ADD COLUMN IF NOT EXISTS sync_clients boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sync_payments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_create_financial boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_billing_type text NOT NULL DEFAULT 'BOLETO';

-- asaas_customers: estado da sincronização cliente → Asaas
ALTER TABLE totum_system.asaas_customers
  ADD COLUMN IF NOT EXISTS sync_status text,
  ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE UNIQUE INDEX IF NOT EXISTS asaas_customers_client_id_key
  ON totum_system.asaas_customers (client_id)
  WHERE client_id IS NOT NULL;

-- asaas_payments
ALTER TABLE totum_system.asaas_payments
  ADD COLUMN IF NOT EXISTS asaas_payment_id text GENERATED ALWAYS AS (asaas_id) STORED,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES totum_system.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES totum_system.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS financial_entry_id uuid REFERENCES totum_system.financial_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS pix_qr_code text,
  ADD COLUMN IF NOT EXISTS pix_qr_code_url text,
  ADD COLUMN IF NOT EXISTS installment_count integer,
  ADD COLUMN IF NOT EXISTS installment_value numeric,
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS interest_value numeric,
  ADD COLUMN IF NOT EXISTS fine_value numeric;

CREATE INDEX IF NOT EXISTS asaas_payments_asaas_payment_id_idx
  ON totum_system.asaas_payments (asaas_payment_id);
CREATE INDEX IF NOT EXISTS asaas_payments_client_id_idx
  ON totum_system.asaas_payments (client_id);

-- asaas_subscriptions
ALTER TABLE totum_system.asaas_subscriptions
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text GENERATED ALWAYS AS (asaas_id) STORED,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES totum_system.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS max_payments integer,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS interest_value numeric,
  ADD COLUMN IF NOT EXISTS fine_value numeric;

CREATE INDEX IF NOT EXISTS asaas_subscriptions_client_id_idx
  ON totum_system.asaas_subscriptions (client_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
