# CHANGELOG — Totum System
> Formato: Conventional Commits · Vibe Coding Totum v3.0

---

## [Unreleased]

### fix
- Cadastro/edição/importação de cliente (B-038): tabela `clients` em produção só tinha as colunas da baseline. Patch aditivo `supabase/patches/20261103_add_clients_briefing_columns.sql` cria as colunas do briefing (aplicar manualmente); `NewClient`/`EditClient`/`useImportData` passam a enviar também `name` (NOT NULL) e `document`, e `EditClient` cai para `name`/`document` ao carregar; `user_id` (coluna inexistente) removido do payload; `types.ts` atualizado
- Corrigir erro `Could not find the 'additional_info' column of 'clients' in the schema cache` no cadastro/edição de cliente — coluna criada via `supabase/patches/20260804_add_clients_additional_info.sql` (o campo já era usado no formulário, mas nunca existiu no banco)
- `TaskDetailDialog`: título e responsável da tarefa deixavam de ser persistidos ao salvar (payload de `updateTask` não incluía `title`/`responsible_id`) — corrigido em `src/pages/Tasks.tsx`
- Aplicar hotfix RLS em produção para filhos de tarefas, checklists de entrega e objetos `task-attachments`, removendo policies permissivas de insert para usuários autenticados — `supabase/patches/20260513_remote_task_child_rls_hotfix.sql`

### feat
- Cadastro de cliente: rascunho automático em `localStorage` (`draft_client_{userId}`, debounce 500ms) com prompt de retomada e indicador "Rascunho salvo" — `src/pages/NewClient.tsx`
- Tarefas: ordenação automática por prioridade (Urgente > Alta > Média > Baixa) e depois prazo, aplicada por padrão na listagem — `src/pages/Tasks.tsx`
- `TaskDetailDialog`: fluxo Editar / Salvar / Descartar — leitura por padrão, título e campos de resumo só ficam editáveis e só persistem através deste fluxo, com reversão total ao descartar
- Tarefas: responsável, prioridade, data de início e data de vencimento passam a ser obrigatórios na criação (`TaskFormDialog`) e edição (`TaskDetailDialog`), com validação inline e sugestão automática da data de início; data de vencimento não pode anteceder a data de início
- Cliente: botão "Desativar Cliente" (soft delete, `status = inativo`) e "Reativar Cliente" em `EditClient.tsx`; listagem de clientes ganha filtro "Mostrar Inativos" (oculto por padrão)
- Aviso de alterações não salvas: novo hook `useUnsavedChangesGuard` + `UnsavedChangesDialog` reutilizados em `NewClient`, `EditClient`, `TaskFormDialog` e `TaskDetailDialog` — bloqueia fechamento acidental (Dialog/Sheet) e refresh/fechamento de aba (`beforeunload`) quando há dados não salvos

### perf
- Revisão de performance 2026-11-03 (`chore/revisao-20261103`, checklist das 31 correções):
  - `index.html`: preconnect/dns-prefetch para `supa.grupototum.com` (apontava para o cloud aposentado)
  - Home: `RevenueChart` (recharts) em `React.lazy` — JS estático da rota 399 KB → 11 KB além do shell
  - Tarefas: Calendário, Dashboard, Metas e templates em `React.lazy`; loading com skeleton — 233 KB → 197 KB
  - Importação: `exceljs` (914 KB) importado só ao ler `.xlsx`
  - Busca global (Cmd+K): debounce de 300 ms antes do `ilike`
  - `useSupabaseTasks`: tarefas e perfis em `Promise.all` (poupa 1 RTT ≈ 0,4 s)
  - 18 dependências sem uso removidas (`package-lock` −580 linhas)
  - B-041 — Tarefas: comentários e histórico saem da listagem e carregam por tarefa ao abrir o detalhe (`useTaskActivity`); drag no Kanban, mudança de status e exclusão atualizam só o estado local; edição recarrega 1 linha; conclusão só refaz a lista se criou tarefas novas. Comentário no diálogo passa a ser gravado em `task_comments`

### chore
- Revisão 2026-11-03 (`chore/revisao-20261103`): remove diretivas `eslint-disable` sem efeito, `prefer-const` em `Products.tsx` e imports mortos em `NewClient`/`EditClient` — lint 498 → 495. Diagnóstico do cadastro de cliente quebrado registrado em `BUGS.md` B-038/B-039 (drift de schema; correção depende de decisão)
- Untrack `src/stark-api/node_modules/` e `dist/` do git (2215 arquivos, ~65MB) — `948c250c`
- Remover 23 arquivos duplicados `* 2.*` byte-identical (artefatos do Finder macOS) — `bd676aeb`

### docs
- Mover `BUGFIX_AGENTES_TELA_BRANCA.md` para `docs/fixes/` — `f5f91754`
- Criar `CLAUDE.md`, `KIMI.md`, `BUGS.md`, `TODO.md`, `CHANGELOG.md` (Vibe Coding Totum v3.0)

---

## [2026-05-07]

### fix
- Corrigir cores hardcoded que quebravam dark mode em 6 componentes de tasks — `eb62740`
  - `TaskModal`, `TaskComentarios`, `TaskSubtarefas`, `TaskAnexos`, `PendingAttachmentsPicker`, `AlexandriaLayout`
  - Substituídos: `bg-white/stone-*/slate-*` → `bg-background/border/foreground`

### perf
- Code splitting: 29 imports estáticos → `React.lazy()` + `Suspense` — `c15595d`
  - Bundle principal: 2.5MB → 825KB gzip (248KB)
  - `useHasAdmin`: `useState/useEffect` → `useQuery` (cache 60s, retry 1)
  - `QueryClient` com `defaultOptions` (staleTime 30s, retry 1)
  - Tailwind `content` simplificado para `["./src/**/*.tsx", "./src/**/*.ts"]`

### fix
- Remover rota duplicada inexistente `/financeiro/lancamentos` do sidebar — `3add47f`

### fix (auditoria completa — 38 correções)
- `contexts/AuthContext.tsx` → re-export de `hooks/useAuth` (elimina AuthProvider duplicado)
- `AppSidebar`: adicionar `useLocation()` (corrige active state das rotas)
- `Tasks.tsx`: corrigir short-circuit nos filtros `responsibleFilter`/`managerFilter`
- `SetupPage.tsx`: `useNavigate` + redirect após login bem-sucedido
- Remover `@lovable.dev/cloud-auth-js` (não funciona fora de `*.lovable.app`)
- `useAuth.tsx`: `.single()` → `.maybeSingle()` no carregamento do profile
- `useAdminSettings.ts`: 4× `.single()` → `.maybeSingle()`
- `useDashboardData.ts`: `.single()` → `.maybeSingle()` no `github_config`
- `ThemeContext`: listener `storage` para sincronização entre abas
- Deletar páginas mortas: `Login`, `SignUp`, `ContentPipeline`, `Hub`
- `package.json`: remover `lovable-tagger` e `@lovable.dev/cloud-auth-js`
- Todos os 9 importadores de `@/contexts/AuthContext` → `@/hooks/useAuth`
- `hasExecDashboard`: reset ao fazer logout

---

## [2026-05-06]

### fix
- Corrigir referências ao projeto Supabase antigo (`sugulxjfkhibuddmoyzr` → `fgosozxvhbdhqigwzqih`)
- Adicionar `vercel.json` para roteamento SPA (corrige 404 em rotas diretas)
- Corrigir warnings do build: CSS `@import` order e Tailwind content pattern

### fix (banco de dados)
- Resolver recursão infinita na RLS policy `user_roles` (causava sidebar incompleta)
- Adicionar `UNIQUE constraint` em `profiles.user_id` (previne perfis duplicados)
- Atualizar trigger `handle_new_user` para `status = 'ativo'` por padrão
- Registrar organização Totum em `organizations` table (resolve tenant lookup)
- Criar usuário master `dev@grupototum.com` com role Master

---

## [2026-05-05] — Netflix Design System

### feat
- Aplicar Netflix Design System (dark-first, #000/#fff/#e00000)
- Multi-tenant subdomain provisioning automático via Vercel API
- Google OAuth nativo + demo mode em `ola.pixelsystem.online`

---

*Histórico anterior disponível via `git log --oneline`*
