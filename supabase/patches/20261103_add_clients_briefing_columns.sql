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
