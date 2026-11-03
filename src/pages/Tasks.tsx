import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, List, CalendarDays, Sparkles, BarChart3, Loader2, Plus, Archive, RotateCcw, LayoutTemplate, Target, Search, ArrowUpDown, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { GenerateTasksDialog } from "@/components/tasks/GenerateTasksDialog";
import { TaskCompletionDialog } from "@/components/tasks/TaskCompletionDialog";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { calculateNextDueDate } from "@/lib/recurrence";
import { Task, TaskStatus, initialTasks, statusConfig, statusColumns } from "@/components/tasks/taskData";
import { Confetti } from "@/components/tasks/Confetti";
import { LoadingState } from "@/components/shared/LoadingState";

// Views secundárias saem do chunk principal de /tarefas: o Kanban (padrão) e a
// Lista carregam primeiro; Calendário, Dashboard, Metas e Templates só quando abertos.
const TaskCalendar = lazy(() => import("@/components/tasks/TaskCalendar").then((m) => ({ default: m.TaskCalendar })));
const TaskDashboard = lazy(() => import("@/components/tasks/TaskDashboard").then((m) => ({ default: m.TaskDashboard })));
const TaskGoals = lazy(() => import("@/components/tasks/TaskGoals").then((m) => ({ default: m.TaskGoals })));
const TaskTemplateManager = lazy(() => import("@/components/templates/TaskTemplateManager").then((m) => ({ default: m.TaskTemplateManager })));
const ProjectTemplateManager = lazy(() => import("@/components/templates/ProjectTemplateManager").then((m) => ({ default: m.ProjectTemplateManager })));
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseTasks } from "@/hooks/useSupabaseTasks";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = "dashboard" | "kanban" | "list" | "calendar" | "goals" | "templates";

// Ordem de prioridade para ordenação automática: Urgente > Alta > Média > Baixa
const priorityRank: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };

const LIST_PAGE_SIZE = 25;

export default function Tasks() {
  const { tasks: supabaseTasks, loading, updateTaskStatus, updateTask, deleteTask, completeTask, refetch, profiles, clients } = useSupabaseTasks();

  const tasks = supabaseTasks.length > 0 || !loading ? supabaseTasks : initialTasks;
  
  const [view, setView] = useState<ViewMode>("kanban");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showArchived, setShowArchived] = useState(false);

  // Seleção em massa no Kanban
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  // Completion dialog state
  const [completionTask, setCompletionTask] = useState<Task | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [responsibleFilter, setResponsibleFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [managerFilter, setManagerFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"dueDate" | "clientName" | "status" | "type" | "responsible">("dueDate");
  const [listPage, setListPage] = useState(1);

  const filteredTasks = useMemo(() => {
    const result = tasks.filter((t) => {
      // Archive filter: if not showing archived, hide them; if showing archived, ONLY show archived
      if (showArchived) {
        if (t.status !== "arquivado") return false;
      } else {
        if (t.status === "arquivado") return false;
      }
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (clientFilter.length > 0 && !clientFilter.includes(t.clientId)) return false;
      if (responsibleFilter.length > 0) {
        const passesResponsible = (responsibleFilter.includes("unassigned") && !t.responsible) ||
          (t.responsible != null && responsibleFilter.includes(t.responsible));
        if (!passesResponsible) return false;
      }
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false;
      if (typeFilter.length > 0 && !typeFilter.includes(t.type)) return false;
      if (managerFilter.length > 0) {
        const passesManager = (managerFilter.includes("unassigned") && !t.clientManagerId) ||
          (t.clientManagerId != null && managerFilter.includes(t.clientManagerId));
        if (!passesManager) return false;
      }
      return true;
    });

    const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case "clientName":
          return collator.compare(a.clientName || "", b.clientName || "");
        case "status":
          return collator.compare(a.status || "", b.status || "");
        case "type":
          return collator.compare(a.type || "", b.type || "");
        case "responsible":
          return collator.compare(a.responsible || "", b.responsible || "");
        case "dueDate":
        default: {
          // Ordenação automática: prioridade (Urgente > Alta > Média > Baixa) primeiro,
          // depois prazo mais próximo. Tarefa sem prazo vai para o fim.
          const rank = priorityRank[a.priority] - priorityRank[b.priority];
          if (rank !== 0) return rank;
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return da - db;
        }
      }
    });
    return sorted;
  }, [tasks, search, clientFilter, responsibleFilter, priorityFilter, typeFilter, managerFilter, showArchived, sortBy]);

  const archivedCount = useMemo(() => tasks.filter(t => t.status === "arquivado").length, [tasks]);

  // A visão "Lista" (e a lista de arquivadas) é paginada em memória sobre o
  // conjunto já filtrado — Kanban/Calendário/Dashboard/Metas continuam vendo
  // o conjunto completo, que é o que essas visões precisam para fazer sentido.
  useEffect(() => { setListPage(1); }, [search, clientFilter, responsibleFilter, priorityFilter, typeFilter, managerFilter, showArchived, sortBy, view]);

  // A seleção só faz sentido dentro do Kanban visível: trocar de visão ou de
  // filtro deixaria ids selecionados fora da tela, e a ação em massa agiria
  // sobre tarefas que o usuário não está mais vendo.
  useEffect(() => { setSelectedTaskIds([]); }, [view, showArchived, search, clientFilter, responsibleFilter, priorityFilter, typeFilter, managerFilter]);

  const pagedListTasks = useMemo(
    () => filteredTasks.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE),
    [filteredTasks, listPage]
  );

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleColumnSelection = (taskIds: string[], select: boolean) => {
    setSelectedTaskIds((prev) =>
      select
        ? Array.from(new Set([...prev, ...taskIds]))
        : prev.filter((id) => !taskIds.includes(id))
    );
  };

  const handleBulkStatusChange = async (newStatus: TaskStatus) => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0) return;
    setBulkRunning(true);
    try {
      // Sequencial de propósito: updateTaskStatus refaz o fetch a cada chamada,
      // e disparar tudo em paralelo geraria N refetches concorrentes.
      for (const id of ids) {
        await updateTaskStatus(id, newStatus);
      }
      setSelectedTaskIds([]);
      toast({
        title: "Tarefas atualizadas",
        description: `${ids.length} ${ids.length === 1 ? "tarefa movida" : "tarefas movidas"} para ${statusConfig[newStatus].label}.`,
      });
    } finally {
      setBulkRunning(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedTaskIds];
    if (ids.length === 0) return;
    setBulkRunning(true);
    try {
      let deleted = 0;
      for (const id of ids) {
        const ok = await deleteTask(id);
        if (ok) deleted += 1;
      }
      setSelectedTaskIds([]);
      setBulkDeleteOpen(false);
      toast({
        title: "Exclusão concluída",
        description: `${deleted} de ${ids.length} ${ids.length === 1 ? "tarefa excluída" : "tarefas excluídas"}.`,
      });
    } finally {
      setBulkRunning(false);
    }
  };

  const handleUnarchive = async (taskId: string) => {
    await updateTaskStatus(taskId, "concluido");
    toast({ title: "Tarefa restaurada", description: "A tarefa foi movida de volta para Concluído." });
  };

  // Intercept status changes to "concluido" — open completion dialog
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === "concluido") {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== "concluido") {
        setCompletionTask(task);
        setCompletionOpen(true);
        return;
      }
    }
    await updateTaskStatus(taskId, newStatus);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    // Intercept if changing to "concluido" from detail dialog
    if (updatedTask.status === "concluido" && selectedTask && selectedTask.status !== "concluido") {
      setCompletionTask(updatedTask);
      setCompletionOpen(true);
      // Revert the status in the detail dialog
      setSelectedTask({ ...updatedTask, status: selectedTask.status });
      return;
    }

    setSelectedTask(updatedTask);
    await updateTask(updatedTask.id, {
      title: updatedTask.title,
      responsible_id: updatedTask.responsibleId || null,
      status: updatedTask.status as any,
      priority: updatedTask.priority as any,
      task_type: updatedTask.type as any,
      description: updatedTask.description || null,
      start_date: updatedTask.startDate || null,
      due_date: updatedTask.dueDate || null,
      is_recurring: updatedTask.isRecurring || false,
      recurrence_type: updatedTask.recurrenceType || null,
      recurrence_config: (updatedTask.recurrenceConfig as any) || null,
      recurrence_end_date: updatedTask.recurrenceEndDate || null,
    });
  };

  // Handle the completion flow
  const handleComplete = async (data: {
    taskId: string;
    decision: "closed" | "next_action";
    comment?: string;
    nextAction?: {
      title: string;
      description: string;
      responsible_id: string;
      due_date: string;
      priority: string;
    };
  }) => {
    await completeTask(data);
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);

    if (detailOpen) {
      setDetailOpen(false);
      setSelectedTask(null);
    }

    toast({
      title: "Tarefa concluída",
      description: "Operação realizada com sucesso.",
    });
  };

  const handleGenerateTasks = (newTasks: Task[]) => {
    refetch();
  };

  const viewButtons: { key: ViewMode; icon: any; label: string }[] = [
    { key: "dashboard", icon: BarChart3, label: "Dashboard" },
    { key: "kanban", icon: LayoutGrid, label: "Kanban" },
    { key: "list", icon: List, label: "Lista" },
    { key: "calendar", icon: CalendarDays, label: "Calendário" },
    { key: "goals", icon: Target, label: "Metas" },
    { key: "templates", icon: LayoutTemplate, label: "Templates" },
  ];

  // Stats (exclude archived)
  const activeTasks = tasks.filter(t => t.status !== "arquivado");
  const overdueTasks = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "concluido").length;
  const pendingTasks = activeTasks.filter((t) => t.status === "pendente").length;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            {showArchived ? "Tarefas Arquivadas" : "Tarefas"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showArchived ? (
              <span>{archivedCount} tarefa{archivedCount !== 1 ? "s" : ""} arquivada{archivedCount !== 1 ? "s" : ""}</span>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-foreground/70 font-medium">
                    {activeTasks.filter(t => t.status === 'concluido').length} de {activeTasks.length} concluídas
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{pendingTasks} pendentes</span>
                  {overdueTasks > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-red-400">{overdueTasks} atrasada{overdueTasks > 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeTasks.filter(t => t.status === 'concluido').length / Math.max(activeTasks.length, 1)) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowArchived(!showArchived)}
            variant="outline"
            className={`gap-2 rounded-full px-4 text-sm border-border ${
              showArchived 
                ? "bg-primary/20 text-primary-bright border-primary/40" 
                : "bg-muted/40 hover:bg-muted/80 text-foreground"
            }`}
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Ver Ativas" : `Arquivadas${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
          </Button>
          {!showArchived && (
            <>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2 rounded-full px-4 text-sm"
              >
                <Plus className="h-4 w-4" /> Nova Tarefa
              </Button>
              <Button
                onClick={() => setGenerateOpen(true)}
                variant="outline"
                className="gap-2 rounded-full px-4 text-sm border-border bg-muted/40 hover:bg-muted/80 text-foreground"
              >
                <Sparkles className="h-4 w-4 text-primary" /> Gerar do Pacote
              </Button>
            </>
          )}
        </div>
      </div>

      {/* View Toggle + Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-border w-fit overflow-x-auto">
            {viewButtons.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  view === v.key
                    ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            ))}
          </div>

          {view !== "dashboard" && view !== "templates" && view !== "goals" && (
            <div className="flex items-center gap-2 lg:shrink-0">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 bg-white/[0.05] border-border rounded-lg h-9 text-xs placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-9 w-[160px] bg-white/[0.05] border-border rounded-lg text-xs" aria-label="Ordenar tarefas por">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Prioridade + data</SelectItem>
                  <SelectItem value="clientName">Por cliente</SelectItem>
                  <SelectItem value="status">Por status</SelectItem>
                  <SelectItem value="type">Por tipo</SelectItem>
                  <SelectItem value="responsible">Por responsável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {view !== "dashboard" && view !== "templates" && view !== "goals" && (
          <TaskFilters
            clientFilter={clientFilter} onClientFilterChange={setClientFilter}
            responsibleFilter={responsibleFilter} onResponsibleFilterChange={setResponsibleFilter}
            priorityFilter={priorityFilter} onPriorityFilterChange={setPriorityFilter}
            typeFilter={typeFilter} onTypeFilterChange={setTypeFilter}
            managerFilter={managerFilter} onManagerFilterChange={setManagerFilter}
            tasks={tasks}
            profiles={profiles}
            clients={clients}
          />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState variant="page" className="p-0" />
      ) : (
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense fallback={<LoadingState variant="page" className="p-0" />}>
          {view === "dashboard" && !showArchived && <TaskDashboard tasks={activeTasks} />}
          {view === "kanban" && !showArchived && (
            <>
              {selectedTaskIds.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-2.5 backdrop-blur">
                  <span className="text-sm font-medium text-foreground">
                    {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "tarefa selecionada" : "tarefas selecionadas"}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Select
                      value=""
                      onValueChange={(value) => handleBulkStatusChange(value as TaskStatus)}
                      disabled={bulkRunning}
                    >
                      <SelectTrigger className="h-8 w-[190px] text-xs" aria-label="Mover tarefas selecionadas para outro status">
                        <SelectValue placeholder="Mover para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {statusColumns.map((status) => (
                          <SelectItem key={status} value={status} className="text-xs">
                            {statusConfig[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                      disabled={bulkRunning}
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      {bulkRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Excluir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={bulkRunning}
                      onClick={() => setSelectedTaskIds([])}
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar
                    </Button>
                  </div>
                </div>
              )}
              <TaskKanban
                tasks={filteredTasks}
                onStatusChange={handleStatusChange}
                onTaskClick={handleTaskClick}
                selectedIds={selectedTaskIds}
                onToggleTask={toggleTaskSelection}
                onToggleColumn={toggleColumnSelection}
              />
            </>
          )}
          {(view === "list" || showArchived) && (
            <>
              <TaskListView
                tasks={pagedListTasks}
                onTaskClick={handleTaskClick}
                showUnarchive={showArchived}
                onUnarchive={handleUnarchive}
              />
              <PaginationControls page={listPage} pageSize={LIST_PAGE_SIZE} totalCount={filteredTasks.length} onPageChange={setListPage} />
            </>
          )}
          {view === "calendar" && !showArchived && (
            <TaskCalendar
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
          )}
          {view === "goals" && !showArchived && (
            <TaskGoals tasks={activeTasks} profiles={profiles} clients={clients} />
          )}
          {view === "templates" && (
            <div className="mt-4">
              <Tabs defaultValue="projects" className="space-y-4">
                <TabsList className="bg-white/[0.04] border border-border">
                  <TabsTrigger value="projects">Templates de Projeto</TabsTrigger>
                  <TabsTrigger value="tasks">Templates de Tarefa</TabsTrigger>
                </TabsList>
                <TabsContent value="projects">
                  <ProjectTemplateManager />
                </TabsContent>
                <TabsContent value="tasks">
                  <TaskTemplateManager />
                </TabsContent>
              </Tabs>
            </div>
          )}
          </Suspense>
        </motion.div>
      )}

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "tarefa" : "tarefas"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Subtarefas, checklists, comentários e
              histórico das tarefas selecionadas também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void handleBulkDelete(); }}
              disabled={bulkRunning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkRunning ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={handleTaskUpdate}
        profiles={profiles}
        onDelete={async (taskId) => {
          const success = await deleteTask(taskId);
          if (success) {
            setDetailOpen(false);
            setSelectedTask(null);
          }
        }}
      />

      <GenerateTasksDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerate={handleGenerateTasks}
      />

      <TaskCompletionDialog
        task={completionTask}
        open={completionOpen}
        onOpenChange={setCompletionOpen}
        profiles={profiles}
        onComplete={handleComplete}
      />

      <TaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients}
        profiles={profiles}
        onCreated={refetch}
      />
      <Confetti active={confettiActive} />
    </div>
  );
}
