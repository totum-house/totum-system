# BUGS.md — Totum System
> Vibe Coding Totum v3.0 · Atualizado: 2026-11-03

## 🔴 CRÍTICOS (resolver antes de qualquer release)

| # | Status | Arquivo | Problema | Commit fix |
|---|---|---|---|---|
| B-001 | ✅ RESOLVIDO | `src/services/asaasService.ts` | URL Supabase hardcoded apontando para projeto antigo (`sugulxjfkhibuddmoyzr`) | `8de4f1a` |
| B-002 | ✅ RESOLVIDO | `src/index.css` | `@import` Google Fonts após diretivas `@tailwind` causava warning de build | `364bbbb` |
| B-003 | ✅ RESOLVIDO | Supabase RLS | Recursão infinita na policy `user_roles` — causava sidebar incompleta para todos os usuários | Fixado via SQL |
| B-004 | ✅ RESOLVIDO | `src/contexts/AuthContext.tsx` | Segundo `AuthProvider` duplicado nunca montado — 9 arquivos importavam contexto errado | `408315d` |
| B-005 | ✅ RESOLVIDO | `src/components/layout/AppSidebar.tsx` | `window.location` em vez de `useLocation()` — sidebar não reativava ao trocar rota | `408315d` |
| B-006 | ✅ RESOLVIDO | `src/pages/Tasks.tsx` | Filter short-circuit: `return true` em `responsibleFilter` bypassa filtros de status/prioridade | `408315d` |
| B-007 | ✅ RESOLVIDO | `src/hooks/useAuth.tsx` | `.single()` crashava com `PGRST116` quando profile não existia | `408315d` |
| B-008 | ✅ RESOLVIDO | `src/App.tsx` | 2.5MB bundle único — sem code splitting | `c15595d` |
| B-009 | ✅ RESOLVIDO | `src/stark-api/node_modules/` | 2187 arquivos binários (~65MB) trackeados no git | `948c250c` |
| B-010 | ✅ RESOLVIDO | 23 arquivos `* 2.*` | Duplicatas byte-identical causavam 695+ erros de lint e risco de import errado | `bd676aeb` |
| B-024 | ✅ RESOLVIDO | Supabase RLS | Policies de filhos de tarefas/checklists e storage `task-attachments` tinham inserts amplos para `authenticated` | Hotfix remoto `20260513_remote_task_child_rls_hotfix.sql` |
| B-026 | ✅ RESOLVIDO | `src/pages/NewClient.tsx`, `src/pages/EditClient.tsx` | Cadastro/edição de cliente quebrava com `Could not find the 'additional_info' column of 'clients' in the schema cache` — coluna nunca existiu no banco | `supabase/patches/20260804_add_clients_additional_info.sql` |
| B-027 | ✅ RESOLVIDO | `src/pages/Tasks.tsx` | `handleTaskUpdate` não incluía `title`/`responsible_id` no payload de `updateTask` — editar título ou responsável na `TaskDetailDialog` não persistia no Supabase | Ver CHANGELOG [Unreleased] |

## 🔴 CRÍTICOS — drift de schema entre o código e o banco self-hosted (revisão 2026-11-03)

| # | Status | Arquivo | Problema | Prioridade |
|---|---|---|---|---|
| B-038 | 🟡 EM ANDAMENTO — código pronto, aguarda aplicar `supabase/patches/20261103_add_clients_briefing_columns.sql` no banco | `src/pages/NewClient.tsx`, `src/pages/EditClient.tsx`, `src/hooks/useImportData.ts` | **Ninguém consegue cadastrar/editar/importar cliente.** O formulário envia ~30 colunas (`company_name`, `cnpj`, `contact_name`, `user_id`, `industry`, …, `terms_accepted`) que não existem em `totum_system.clients` no banco de produção (`supa.grupototum.com`), e não envia `name` (NOT NULL). A tabela real tem só as colunas da baseline (`name`, `document`, `segment`, `notes`…). Confirmado por GET no PostgREST: `column clients.company_name does not exist` (42703). O patch de B-026 (`additional_info`) também nunca foi aplicado nesse banco. `QuickAddDialog` funciona porque envia só `name` | Crítica |
| B-039 | 🔴 ABERTO | 9 pontos de query (ver lista) | Mesmo drift em outras telas — selects que o PostgREST de produção rejeita: `asaas_customers.asaas_customer_id` (`asaasService.ts`); relação `asaas_payments`/`asaas_subscriptions` → `clients` (`useAsaas.ts`); `contracts.billing_frequency` (`checklistService.ts`); `contracts.title` (`useProjectFormData.ts`); `financial_entries.entry_class` (`useReports.ts`); tabela `organization_settings` (`useAdminSettings.ts`); relação `plans` → `delivery_model_items` (`usePackages.ts`); `plans.value`/`frequency` (`useContractFormData.ts`); `delivery_model_items.sort_order`/`suggested_responsible_id` (`checklistService.ts`, também erro de `tsc`). Método: `.from().select()` do código testados por GET contra o schema real | Alta |

## 🔴 CRÍTICOS — achados da auditoria de permissões (2026-08-10, ver `docs/PERMISSION_MATRIX.md`)

| # | Status | Arquivo | Problema | Prioridade |
|---|---|---|---|---|
| B-028 | 🔴 ABERTO | `src/App.tsx` (`ProtectedRoutes`) | Nenhuma rota é protegida por permissão — só por sessão. Qualquer usuário autenticado acessa `/admin`, `/usuarios`, `/dashboard-executivo` etc. digitando a URL direta, independente de role/permissão. O filtro de menu (`AppSidebar`) é só cosmético/de descoberta | Crítica |
| B-029 | 🔴 ABERTO | RLS de `tasks`, `clients`, `financial_entries`, `projects`, `contracts` | Policies de INSERT usam `WITH CHECK (true)` — não valida que o `organization_id` inserido bate com a org do usuário. Em tese permite inserir registros com `organization_id` de outra organização | Alta |
| B-030 | ✅ RESOLVIDO | `src/hooks/usePermissions.ts` | `isAdmin` passa a usar a RPC `is_admin()` (mesma fonte das RLS policies) + `profile.is_master` síncrono; string match vira só fallback até a RPC responder | `3ae655ca` |
| B-031 | 🟡 ABERTO | RLS de `user_roles` | Qualquer membro autenticado da mesma org pode ler/editar `user_roles` de qualquer outro membro (policy "Tenant isolation" não restringe por role, só por org) | Alta |
| B-032 | 🟡 ABERTO | RLS de `profiles` (UPDATE) | Policy `Users update own profile` permite ao próprio usuário editar seu profile sem restringir colunas — em tese permite alterar `role_id`/`is_master` | Alta |
| B-033 | 🟢 ABERTO | Tabela `roles` (RLS) | Sem `organization_id` — todas as organizações compartilham o mesmo espaço de leitura de `roles` (`SELECT USING (true)`) | Média |
| B-034 | 🟢 ABERTO | Funções SQL `has_permission()`/`get_user_permissions()` | Existem no schema mas não são referenciadas por nenhuma `CREATE POLICY` — o sistema de permissões granulares (`roles.permissions`) não é enforced no banco, só no client (`usePermissions.ts`), que pode ser contornado por chamadas diretas à API | Média |

## 🟡 ALTOS — achados da auditoria api-v1/agentes (2026-08-10, ver `docs/AGENTS_API_AUDIT.md`)

| # | Status | Arquivo | Problema | Prioridade |
|---|---|---|---|---|
| B-035 | 🟡 ABERTO | `supabase/functions/api-v1/`, `api/tarefas/index.js` | Dois endpoints paralelos para o mesmo propósito (agentes externos), com contratos de resposta diferentes (RFC 7807 vs envelope custom), superfícies diferentes (projects+tasks vs só tasks) e nenhum consumidor real identificado no repo. `api-v1` não tem documentação em `docs/` | Média |
| B-036 | 🟡 ABERTO | `supabase/functions/api-v1/index.ts` (catch global) | Erro 500 expõe `String(e)` no campo `detail` da resposta RFC 7807 — pode vazar detalhes internos de erro | Média |
| B-037 | 🟢 ABERTO | `api-v1` e `api/tarefas` | Nenhum rate limiting em nenhum dos dois endpoints autenticados por API key | Baixa |

## 🟡 ALTOS (esta sprint)

| # | Status | Arquivo | Problema | Prioridade |
|---|---|---|---|---|
| B-011 | 🔴 ABERTO | `tsconfig.app.json` | `strict: false`, `noImplicitAny: false` — toda salvaguarda TypeScript desligada | Alta |
| B-012 | 🔴 ABERTO | `src/pages/AgenteDetail.tsx` | God Component 756 LOC: UI + gráficos + state + Supabase | Alta |
| B-013 | 🔴 ABERTO | `src/components/ui/sidebar.tsx` | 637 LOC monolítico | Alta |
| B-014 | 🔴 ABERTO | `src/services/asaasService.ts` | 615 LOC — **No-Fly Zone** | Alta |
| B-015 | ✅ RESOLVIDO | `src/components/tasks/TaskGoals.tsx:67` | `useEffect` com deps incompletas (`fetchGoals` fora do array) | `fetchGoals` movido para `useCallback`, incluído nas deps do `useEffect` — Rodada 1 |
| B-016 | ✅ RESOLVIDO (achado obsoleto) | `src/components/financial/FinancialFormDialog.tsx:46` | Já tinha `[open]` nas deps — descrição do bug não correspondia ao código auditado em 2026-08-10 | — |
| B-017 | ✅ RESOLVIDO (achado obsoleto) | — | `src/components/clients/ClientFormDialog.tsx` não existe no repositório; equivalente funcional (`src/pages/NewClient.tsx:229`) já trata erro do Supabase | — |
| B-018 | ✅ RESOLVIDO (achado obsoleto) | `supabase/functions/asaas-webhook/index.ts:21` | Já valida `asaas-access-token` fail-closed contra `asaas_config.webhook_token`. Asaas não oferece HMAC — o controle correto pro provedor já está implementado | — |
| B-019 | ✅ RESOLVIDO | `package.json` | `xlsx@0.18.5` (Prototype Pollution, sem fix upstream) substituído por `exceljs@4.4.0` em `src/hooks/useImportData.ts` — único consumidor no repo | Rodada 1 |
| B-025 | ✅ RESOLVIDO (achado obsoleto) | `supabase/migrations/` | Migrations já consolidadas em baseline único (`00000000000000_baseline_totum_system.sql`, commit `03eeddd5`). Bloqueador real era outro — ver B-028 | — |

## 🟢 MÉDIOS (próximas semanas)

| # | Status | Localização | Problema |
|---|---|---|---|
| B-020 | 🟡 ABERTO | `src/pages/DataImport.tsx` | Heights fixas (`h-[400px]`) quebram mobile |
| B-021 | 🟡 ABERTO | `src/hooks/useDashboardData.ts:93-123` | 11× `as unknown as Type[]` — casting duplo inseguro |
| B-022 | 🟡 ABERTO | `tailwind.config.ts:114` | `require()` style import — 1 erro de lint |
| B-023 | ✅ RESOLVIDO | ~~`src/services/embeddingService.ts:17`~~ | TODO antigo de OpenAI Embedding API não implementado — arquivo não existe mais no repositório (removido em limpeza anterior de código morto) |

## 📌 COMO REGISTRAR NOVOS BUGS

```
| B-XXX | 🔴 ABERTO | arquivo:linha | Descrição clara do problema | Prioridade |
```

Status: `🔴 ABERTO` → `🟡 EM ANDAMENTO` → `✅ RESOLVIDO`
