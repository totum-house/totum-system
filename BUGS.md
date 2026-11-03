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
| B-039 | 🟡 EM ANDAMENTO — código pronto na branch `chore/schema-drift-b039`, aguarda aplicar os patches `supabase/patches/20261103_add_asaas_sync_columns.sql`, `…_add_contracts_title_billing_frequency.sql`, `…_add_delivery_model_items_plan_columns.sql`, `…_add_financial_entries_classification.sql` no banco | `asaasService.ts`, `useAsaas.ts`, `checklistService.ts`, `useContracts.ts`, `useProjectFormData.ts`, `useReports.ts`, `useAdminSettings.ts`, `usePackages.ts`, `Packages.tsx`, `useContractFormData.ts`, `FinancialFormDialog.tsx` | Drift de schema em 9 pontos de query (reconfirmado por GET em produção em 2026-11-03, todos faltando). Decisão (Israel, 2026-11-03): todas as telas em uso. Asaas → patch aditivo + código grava `asaas_id` e resolve o uuid de `asaas_customers` (`asaas_payment_id`/`asaas_subscription_id` viram colunas geradas, webhook intocado); Contratos → patch (`title`, `billing_frequency`, `package_id` sem FK para não ambiguar `plans(name)`); Pacotes → sem patch em `plans` (código usa `price`/`billing_cycle`) + patch em `delivery_model_items` (`plan_id` FK, `sort_order`, `task_type`, `suggested_priority`, `suggested_responsible_id`); Financeiro → patch (`entry_class`, `nature`, `installment_number`, `total_installments`, `created_by`; criar lançamento falhava em prod); Admin → só código (`organization_settings` não existe; `company_settings` filtrado por `organization_id`). `tsc` 90 → 33 erros (restantes pré-existentes, fora do drift: `demoData.ts` 20, null-safety de datas, `marketing_analysis`) | Alta |
| B-043 | 🟡 EM ANDAMENTO — código pronto, aguarda aplicar `supabase/patches/20261103_add_delivery_checklist_items_columns.sql` | `src/services/checklistService.ts`, `src/hooks/useContracts.ts`, `src/hooks/useDeliveryChecklists.ts`, `src/hooks/useClientDeliveries.ts`, `src/pages/Fulfillment.tsx` | Vizinho de B-039 achado na mesma verificação: itens de checklist de entrega eram inseridos com `name`/`responsible_id` e atualizados com `justification`/`completed_at`, mas em produção `delivery_checklist_items` só tem `title`/`status`/`notes`/`sort_order`, e `delivery_checklists.title` é NOT NULL e nunca era enviado — gerar checklist ao ativar contrato falhava. Código passa a enviar `title` nos dois casos; patch aditivo cria `responsible_id`, `justification`, `observation`, `completed_at` | Alta |

## 🟡 PERFORMANCE — achados da revisão 2026-11-03 (dependem de decisão)

| # | Status | Arquivo | Problema | Prioridade |
|---|---|---|---|---|
| B-040 | 🟡 ABERTO | Infra (Coolify/Hostinger) | O banco `supa.grupototum.com` resolve para `2.24.206.161` — Hostinger, **Boston/EUA** (ipinfo). Usuários e a edge da Vercel estão em São Paulo (`gru1`). Cada chamada do navegador ao PostgREST paga ~0,42 s de ida e volta (TCP 0,14 s + TLS 0,28 s medidos), antes de qualquer custo de dados. Mover a VPS para uma região em SP/BR é o maior ganho de latência disponível | Alta |
| B-041 | ✅ RESOLVIDO | `src/hooks/useSupabaseTasks.ts`, `src/hooks/useTaskActivity.ts`, `TaskDetailDialog.tsx` | A listagem carregava `task_comments(*)` e `task_history(*)` de **todas** as tarefas e refazia o fetch completo após cada mutação (inclusive cada drag). Agora: comentários/histórico carregam por tarefa ao abrir o detalhe (`useTaskActivity`); drag/status e exclusão atualizam só o estado local; edição recarrega 1 linha (`refreshTask`); conclusão só refaz a lista se criou tarefas novas. Bônus: comentário do diálogo passa a ser gravado em `task_comments` (antes era só local) | Ver CHANGELOG [Unreleased] |
| B-044 | 🔴 ABERTO | `src/pages/Tasks.tsx` (`handleTaskUpdate`), `TaskDetailDialog.tsx` | Subtarefas e itens de checklist adicionados/alterados no diálogo de detalhe **nunca são persistidos**: `handleTaskUpdate` envia só campos da tabela `tasks`; nenhum insert em `subtasks`/`task_checklist_items` existe fora de `completeTask`. O usuário vê a alteração até fechar o diálogo e perde ao recarregar. Pré-existente (achado durante B-041) | Alta |
| B-042 | 🟡 ABERTO | `supabase/migrations/...baseline` | Só 2 `CREATE INDEX` em todo o schema. Filtros frequentes sem índice: `tasks(organization_id, status)`, `tasks(responsible_id)`, `task_comments(task_id)`, `task_history(task_id)`, `subtasks(task_id)`, `clients(organization_id)`, `financial_entries(organization_id, due_date)` | Média |

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
