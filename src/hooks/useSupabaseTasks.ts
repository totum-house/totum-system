import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { Task, TaskStatus, RecurrenceType, RecurrenceConfig } from "@/components/tasks/taskData";
import { useDemo } from "@/contexts/DemoContext";
import { useTenant } from "@/contexts/TenantContext";
import { attachOrganizationId } from "@/lib/tenant";
import { demoTasks } from "@/data/demoData";
import { calculateNextDueDate } from "@/lib/recurrence";

type TaskRow = Tables<"tasks">;
type ProfileMap = Map<string, { name: string; avatar: string | null }>;

// Comentários e histórico NÃO entram aqui: são carregados por tarefa, sob
// demanda, em useTaskActivity quando o diálogo de detalhe abre (B-041).
// Subtarefas e checklist ficam porque os cards do Kanban/Lista mostram progresso.
const TASK_SELECT = `
  *,
  clients(name, responsible_id),
  plans(name),
  subtasks(*),
  task_checklist_items(*)
`;

function mapTaskRow(t: any, profileMap: ProfileMap): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description || "",
    clientId: t.client_id,
    clientName: t.clients?.name || "—",
    clientManagerId: t.clients?.responsible_id || undefined,
    contractId: t.contract_id || undefined,
    planName: t.plans?.name || undefined,
    projectId: t.project_id || undefined,
    responsible: t.responsible_id ? profileMap.get(t.responsible_id)?.name || undefined : undefined,
    responsibleAvatarUrl: t.responsible_id ? profileMap.get(t.responsible_id)?.avatar || undefined : undefined,
    responsibleId: t.responsible_id || undefined,
    priority: t.priority as Enums<"task_priority">,
    status: t.status as TaskStatus,
    type: t.task_type as Enums<"task_type">,
    startDate: t.start_date || undefined,
    dueDate: t.due_date || undefined,
    estimatedTime: t.estimated_minutes || undefined,
    actualTime: t.actual_minutes || undefined,
    isRecurring: t.is_recurring || false,
    recurrenceType: t.recurrence_type as RecurrenceType | undefined,
    recurrenceConfig: t.recurrence_config as RecurrenceConfig | undefined,
    recurrenceEndDate: t.recurrence_end_date || undefined,
    parentTaskId: t.parent_task_id || undefined,
    lastGeneratedAt: t.last_generated_at || undefined,
    subtasks: (t.subtasks || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      status: s.status as TaskStatus,
      responsible: s.responsible_id ? profileMap.get(s.responsible_id)?.name : undefined,
      dueDate: s.due_date || undefined,
    })),
    checklist: (t.task_checklist_items || []).map((c: any) => ({
      id: c.id,
      text: c.text,
      completed: c.completed,
    })),
    comments: [],
    history: [],
  };
}

export function useSupabaseTasks() {
  const { isDemoMode } = useDemo();
  const { tenant, loading: tenantLoading } = useTenant();
  const [tasks, setTasks] = useState<Task[]>([]);
  // Mapa user_id → nome/avatar do último fetch; reutilizado ao remapear uma
  // única tarefa depois de uma atualização, sem refazer a listagem inteira.
  const profileMapRef = useRef<ProfileMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);

  const fetchTasks = useCallback(async () => {
    if (isDemoMode) {
      setTasks(demoTasks);
      setClients([
        { id: "demo-0001-0000-0000-000000000000", name: "TechVentures S.A." },
        { id: "demo-0002-0000-0000-000000000000", name: "Nova Digital LTDA" },
        { id: "demo-0003-0000-0000-000000000000", name: "Startup Labs" },
        { id: "demo-0004-0000-0000-000000000000", name: "Innova Corp" },
        { id: "demo-0005-0000-0000-000000000000", name: "DigitalPlus Agência" },
        { id: "demo-0006-0000-0000-000000000000", name: "Agro Connect" },
        { id: "demo-0007-0000-0000-000000000000", name: "Saúde Mais Clínicas" },
      ]);
      setProfiles([
        { user_id: "demo-user-1", full_name: "Ana Silva" },
        { user_id: "demo-user-2", full_name: "Carlos Mendes" },
        { user_id: "demo-user-3", full_name: "Juliana Costa" },
        { user_id: "demo-user-4", full_name: "Rafael Lima" },
        { user_id: "demo-user-5", full_name: "Marina Souza" },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTasks([]);
        return;
      }

      // Fetch profiles scoped to current tenant for name resolution
      // Explicit org filter is belt-and-suspenders over RLS (master user bypasses RLS)
      let profileQuery = supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url");
      if (tenant?.organization_id) {
        profileQuery = profileQuery.eq("organization_id", tenant.organization_id);
      }

      // Tarefas e perfis são independentes: disparar em paralelo poupa um RTT
      // inteiro ao banco (≈0,4s por chamada em produção).
      const [{ data: taskRows, error }, { data: profileRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select(TASK_SELECT)
          .order("created_at", { ascending: false }),
        profileQuery,
      ]);

      if (error) throw error;

      const profileMap: ProfileMap = new Map();
      (profileRows || []).forEach((p: any) => profileMap.set(p.user_id, { name: p.full_name, avatar: p.avatar_url }));
      profileMapRef.current = profileMap;

      setTasks((taskRows || []).map((t: any) => mapTaskRow(t, profileMap)));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, tenant?.organization_id]);

  const fetchClients = useCallback(async () => {
    if (isDemoMode) return;
    try {
      let q = supabase.from("clients").select("id, name").eq("status", "ativo").order("name");
      if (tenant?.organization_id) {
        q = q.eq("organization_id", tenant.organization_id);
      }
      const { data, error } = await q;
      if (error) {
        console.error("Error fetching clients:", error);
        return;
      }
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, [isDemoMode, tenant?.organization_id]);

  const fetchProfiles = useCallback(async () => {
    if (isDemoMode) return;
    // Scope explicitly to current tenant org.
    // Normal users are filtered by RLS; master users bypass RLS so we need
    // explicit org filter. Include masters that belong to the current org
    // (e.g. the sys-admin who also works as a team member in their own org).
    try {
      let q = supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("status", "ativo")
        .order("full_name");
      if (tenant?.organization_id) {
        q = q.eq("organization_id", tenant.organization_id);
      } else {
        q = q.eq("is_master", false);
      }
      const { data, error } = await q;
      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  }, [isDemoMode, tenant?.organization_id]);

  useEffect(() => {
    // Espera a resolução do tenant antes de buscar. Sem essa trava as três
    // consultas rodavam duas vezes (uma com tenant nulo, outra já resolvido) —
    // no Lighthouse isso aparecia como 2× 449 KB só no fetch de tasks.
    if (tenantLoading) return;
    fetchTasks();
    fetchClients();
    fetchProfiles();
  }, [tenantLoading, fetchTasks, fetchClients, fetchProfiles]);

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast({ title: "Modo Demo", description: `Status alterado para ${newStatus}` });
      return;
    }
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus as Enums<"task_status"> })
      .eq("id", taskId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    // Atualização local: o drag no Kanban não precisa refazer a listagem
    // inteira (era o caminho mais caro do app — B-041).
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("task_history").insert({
        task_id: taskId,
        action: "Status alterado",
        detail: `Status → ${newStatus}`,
        user_id: user.id,
      });
    }
  };

  // Recarrega UMA tarefa (com relações) e a substitui na lista — 1 linha em
  // vez de todas. Se não vier (ex.: deletada), remove da lista.
  const refreshTask = async (taskId: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("id", taskId)
      .maybeSingle();
    if (error) {
      console.error("Error refreshing task:", error);
      return;
    }
    setTasks(prev => data
      ? prev.map(t => t.id === taskId ? mapTaskRow(data, profileMapRef.current) : t)
      : prev.filter(t => t.id !== taskId));
  };

  const updateTask = async (taskId: string, updates: Partial<TaskRow>) => {
    if (isDemoMode) {
      toast({ title: "Modo Demo", description: "Ação simulada com sucesso." });
      return true;
    }
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }

    await refreshTask(taskId);
    return true;
  };

  const addTasks = async (newTasks: Array<{
    title: string;
    client_id: string;
    priority: Enums<"task_priority">;
    task_type: Enums<"task_type">;
    status: Enums<"task_status">;
    plan_id?: string;
    contract_id?: string;
    delivery_model_item_id?: string;
    responsible_id?: string;
    generation_period?: string;
    due_date?: string;
    description?: string;
  }>) => {
    if (isDemoMode) {
      toast({ title: "Modo Demo", description: `${newTasks.length} tarefas simuladas com sucesso.` });
      return true;
    }
    const payload = newTasks.map((task) => attachOrganizationId(task, tenant?.organization_id));
    const { error } = await supabase.from("tasks").insert(payload);

    if (error) {
      toast({ title: "Erro ao gerar tarefas", description: error.message, variant: "destructive" });
      return false;
    }

    await fetchTasks();
    toast({ title: "Tarefas geradas", description: `${newTasks.length} tarefas criadas com sucesso.` });
    return true;
  };

  const deleteTask = async (taskId: string) => {
    if (isDemoMode) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: "Modo Demo", description: "Tarefa excluída (simulado)." });
      return true;
    }

    // Delete related records in parallel before deleting the task
    const cascadeResults = await Promise.all([
      supabase.from("task_checklist_items").delete().eq("task_id", taskId),
      supabase.from("task_comments").delete().eq("task_id", taskId),
      supabase.from("task_history").delete().eq("task_id", taskId),
      supabase.from("subtasks").delete().eq("task_id", taskId),
    ]);

    const cascadeError = cascadeResults.find(r => r.error);
    if (cascadeError?.error) {
      toast({ title: "Erro ao excluir registros relacionados", description: cascadeError.error.message, variant: "destructive" });
      return false;
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Tarefa excluída", description: "A tarefa foi removida permanentemente." });
    setTasks(prev => prev.filter(t => t.id !== taskId));
    return true;
  };

  const completeTask = async (data: {
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
    if (isDemoMode) {
      toast({ title: "Modo Demo", description: "Tarefa concluída (simulado)." });
      return true;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    const task = tasks.find((t) => t.id === data.taskId);
    // Só refaz a listagem se a conclusão criou tarefas novas (próxima ação ou
    // recorrência); o status em si é atualizado localmente.
    let createdNewTasks = false;

    if (data.decision === "next_action" && data.nextAction && task) {
      createdNewTasks = true;
      await supabase.from("subtasks").insert({
        task_id: data.taskId,
        title: data.nextAction.title,
        status: "pendente",
        responsible_id: data.nextAction.responsible_id || null,
        due_date: data.nextAction.due_date || null,
      });

      await supabase.from("tasks").insert(attachOrganizationId({
        title: data.nextAction.title,
        description: data.nextAction.description || null,
        client_id: task.clientId,
        parent_task_id: data.taskId,
        responsible_id: data.nextAction.responsible_id || null,
        due_date: data.nextAction.due_date || null,
        priority: data.nextAction.priority as any,
        status: "pendente",
        task_type: task.type as any,
        contract_id: task.contractId || null,
        project_id: task.projectId || null,
      }, tenant?.organization_id));

      if (userId) {
        await supabase.from("task_history").insert({
          task_id: data.taskId,
          action: "Concluída com próxima ação",
          detail: `Próxima ação criada: "${data.nextAction.title}"`,
          user_id: userId,
        });
      }
    } else if (data.decision === "closed") {
      if (data.comment && userId) {
        await supabase.from("task_comments").insert({
          task_id: data.taskId,
          content: `[Conclusão] ${data.comment}`,
          user_id: userId,
        });
      }
      if (userId) {
        await supabase.from("task_history").insert({
          task_id: data.taskId,
          action: "Concluída e encerrada",
          detail: data.comment ? `Comentário: ${data.comment}` : "Tarefa encerrada sem ações adicionais",
          user_id: userId,
        });
      }
    }

    if (task && task.isRecurring && !task.parentTaskId) {
      const nextDueDate = calculateNextDueDate(
        task.dueDate || new Date().toISOString(),
        task.recurrenceType || "mensal",
        task.recurrenceConfig
      );
      const isEnded = task.recurrenceEndDate && new Date(nextDueDate) > new Date(task.recurrenceEndDate);
      if (!isEnded) {
        createdNewTasks = true;
        await supabase.from("tasks").insert(attachOrganizationId({
          title: task.title,
          description: task.description,
          client_id: task.clientId,
          responsible_id: task.responsibleId || null,
          priority: task.priority as any,
          status: "pendente",
          task_type: task.type as any,
          start_date: null,
          due_date: nextDueDate,
          is_recurring: false,
          parent_task_id: task.id,
          contract_id: task.contractId || null,
          project_id: task.projectId || null,
        }, tenant?.organization_id));
        await supabase.from("tasks").update({ last_generated_at: new Date().toISOString() }).eq("id", task.id);
      }
    }

    await updateTaskStatus(data.taskId, "concluido");
    if (createdNewTasks) await fetchTasks();
    return true;
  };

  return {
    tasks,
    loading,
    clients,
    profiles,
    updateTaskStatus,
    updateTask,
    addTasks,
    deleteTask,
    completeTask,
    refetch: fetchTasks,
  };
}
