-- ============================================================================
-- APLICAR TUDO — B-038 + B-039 + B-043 (gerado em 2026-11-04 a partir dos patches
-- individuais já mesclados em main pelos PRs #19 e #20). Cada bloco é o conteúdo
-- literal do patch correspondente, na ordem de dependência. Todos são aditivos e
-- idempotentes (IF NOT EXISTS): rodar duas vezes não faz mal.
--
-- Onde rodar: Supabase Studio self-hosted (supa.grupototum.com) > SQL Editor,
-- ou psql na VPS conectado ao banco do Supabase, como superuser/postgres.
-- Depois: a tela de cadastro de cliente volta a funcionar sem redeploy, porque
-- o código em produção já envia name/document (PR #19).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- >>> 20261103_add_clients_briefing_columns.sql
-- ---------------------------------------------------------------------------
-- Hotfix de produção para supa.grupototum.com (schema totum_system) — B-038.
-- Bug: ninguém consegue cadastrar/editar/importar cliente. O front
-- (src/pages/NewClient.tsx, src/pages/EditClient.tsx, src/hooks/useImportData.ts)
-- nasceu no Supabase cloud com um schema mais rico; o banco self-hosted veio da
-- baseline, que só tem name/document/segment/notes... O PostgREST rejeita o
-- insert com "column clients.company_name does not exist" (42703).
--
-- Este patch é puramente aditivo (colunas nullable, sem default, sem FK):
-- reversível com DROP COLUMN. Inclui additional_info, que o patch
-- 20260804 criou em public.clients do cloud antigo e nunca chegou aqui.
--
-- Junto com este patch o código passa a enviar name (NOT NULL) e document
-- a partir de company_name/cnpj — ver commit na branch chore/revisao-20261103.
--
-- Aplicar manualmente no banco (psql/SQL editor) e, depois, regenerar
-- src/integrations/supabase/types.ts se possível.

BEGIN;

ALTER TABLE totum_system.clients
  -- Etapa 1 — Informações da empresa
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  -- Etapa 2 — Sobre o negócio
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS products_services text,
  ADD COLUMN IF NOT EXISTS time_in_market text,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS monthly_revenue text,
  -- Etapa 3 — Público-alvo
  ADD COLUMN IF NOT EXISTS main_niche text,
  ADD COLUMN IF NOT EXISTS main_pains text,
  ADD COLUMN IF NOT EXISTS desires text,
  ADD COLUMN IF NOT EXISTS age_min integer,
  ADD COLUMN IF NOT EXISTS age_max integer,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS social_class text,
  ADD COLUMN IF NOT EXISTS brand_tone text,
  -- Etapa 4 — Identidade visual
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS fonts text,
  ADD COLUMN IF NOT EXISTS visual_elements text,
  ADD COLUMN IF NOT EXISTS visual_personality text,
  -- Etapa 5 — Operação e contatos
  ADD COLUMN IF NOT EXISTS support_channels text[],
  ADD COLUMN IF NOT EXISTS crm_used text,
  ADD COLUMN IF NOT EXISTS sla_response text,
  ADD COLUMN IF NOT EXISTS business_hours_start text,
  ADD COLUMN IF NOT EXISTS business_hours_end text,
  ADD COLUMN IF NOT EXISTS working_days text[],
  ADD COLUMN IF NOT EXISTS additional_info text,
  ADD COLUMN IF NOT EXISTS terms_accepted boolean,
  -- Importação CSV (src/hooks/useImportData.ts)
  ADD COLUMN IF NOT EXISTS import_batch_id uuid;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ---------------------------------------------------------------------------
-- >>> 20261103_add_contracts_title_billing_frequency.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 20261103_add_delivery_model_items_plan_columns.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 20261103_add_delivery_checklist_items_columns.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 20261103_add_financial_entries_classification.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- >>> 20261103_add_asaas_sync_columns.sql
-- ---------------------------------------------------------------------------
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
-- em asaas_customers.client_id, exigido pelo upsert onConflict do front):
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

-- Sem predicado WHERE de propósito: o upsert do front vira `ON CONFLICT (client_id)`
-- no PostgREST, que só infere índices únicos completos. NULLs continuam permitidos
-- (unique trata NULL como distinto).
CREATE UNIQUE INDEX IF NOT EXISTS asaas_customers_client_id_key
  ON totum_system.asaas_customers (client_id);

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

-- Verificação (opcional) — deve listar as colunas novas:
-- SELECT table_name, column_name FROM information_schema.columns
--  WHERE table_schema = 'totum_system' AND column_name IN ('additional_info','company_name','title','billing_frequency','plan_id','entry_class','responsible_id','asaas_payment_id') ORDER BY 1,2;
