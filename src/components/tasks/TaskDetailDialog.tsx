import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Task, Subtask, ChecklistItem, TaskComment, TaskStatus, TaskPriority,
  statusConfig, priorityConfig, typeLabels, TaskType,
  RecurrenceType, recurrenceLabels, weekDayLabels, RecurrenceConfig,
} from "./taskData";
import {
  CheckCircle2, Circle, Plus, Trash2, User, Calendar, Clock,
  MessageSquare, History, ChevronDown, Send, RefreshCw, FileText, ListTree,
  Pencil, Save, Undo2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useTaskActivity } from "@/hooks/useTaskActivity";
import { UnsavedChangesDialog } from "@/components/shared";

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  profiles?: { user_id: string; full_name: string }[];
}

// Campos cobertos pelo fluxo Editar/Salvar/Descartar (aba Resumo + descrição).
// Checklist, subtarefas, comentários e recorrência continuam com salvamento
// imediato, como já funcionavam antes.
interface EditableFields {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  responsibleId?: string;
  responsible?: string;
  startDate?: string;
  dueDate?: string;
}

function pickEditable(task: Task): EditableFields {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    responsibleId: task.responsibleId,
    responsible: task.responsible,
    startDate: task.startDate,
    dueDate: task.dueDate,
  };
}

function validateEditable(d: EditableFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!d.title.trim()) errors.title = "Título é obrigatório";
  if (!d.responsibleId) errors.responsibleId = "Responsável é obrigatório";
  if (!d.priority) errors.priority = "Prioridade é obrigatória";
  if (!d.startDate) errors.startDate = "Data de início é obrigatória";
  if (!d.dueDate) errors.dueDate = "Data de vencimento é obrigatória";
  if (d.startDate && d.dueDate && d.startDate > d.dueDate) {
    errors.dueDate = "Data de vencimento não pode ser antes da data de início";
  }
  return errors;
}

export function TaskDetailDialog({ task, open, onOpenChange, onUpdate, onDelete, profiles = [] }: TaskDetailDialogProps) {
  type TabKey = "summary" | "details" | "subtasks" | "recurrence" | "comments" | "history";
  const TAB_STORAGE_KEY = "taskDetailDialog.activeTab";
  const validTabs: TabKey[] = ["summary", "details", "subtasks", "recurrence", "comments", "history"];
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "summary";
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY) as TabKey | null;
    return saved && validTabs.includes(saved) ? saved : "summary";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);
  const [newComment, setNewComment] = useState("");
  // Comentários e histórico carregam só quando o diálogo abre (B-041); em demo
  // usa o que vem embutido na tarefa.
  const activity = useTaskActivity(task?.id, open, task ? { comments: task.comments, history: task.history } : undefined);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Editar / Salvar / Descartar — estado padrão é leitura; título e campos do
  // Resumo só ficam editáveis (e só persistem) através deste fluxo.
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const originalRef = useRef<EditableFields | null>(null);

  useEffect(() => {
    if (task) {
      const picked = pickEditable(task);
      setDraft(picked);
      originalRef.current = picked;
      setEditMode(false);
      setFieldErrors({});
    }
    // Reseta apenas ao trocar de tarefa ou reabrir o dialog — não a cada
    // atualização de `task` em background, para não perder edição em curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, open]);

  const isDirty = editMode && draft !== null && originalRef.current !== null &&
    JSON.stringify(draft) !== JSON.stringify(originalRef.current);

  const { confirmOpen, guardedAction, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isDirty);

  if (!task || !draft) return null;

  const updateDraft = (partial: Partial<EditableFields>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
    setFieldErrors((e) => {
      const next = { ...e };
      Object.keys(partial).forEach((k) => { delete next[k]; });
      return next;
    });
  };

  const handleEdit = () => setEditMode(true);

  const handleSaveEdit = () => {
    const errors = validateEditable(draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    onUpdate({ ...task, ...draft });
    originalRef.current = draft;
    setEditMode(false);
    setFieldErrors({});
  };

  const handleDiscardEdit = () => {
    if (originalRef.current) setDraft(originalRef.current);
    setEditMode(false);
    setFieldErrors({});
  };

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      guardedAction(() => { handleDiscardEdit(); onOpenChange(false); });
    } else {
      onOpenChange(next);
    }
  };

  const update = (partial: Partial<Task>) => onUpdate({ ...task, ...partial });

  const checkProgress = task.checklist.length > 0
    ? Math.round((task.checklist.filter((c) => c.completed).length / task.checklist.length) * 100)
    : 0;

  const toggleCheckItem = (id: string) => {
    update({
      checklist: task.checklist.map((c) => c.id === id ? { ...c, completed: !c.completed } : c),
    });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    update({
      checklist: [...task.checklist, { id: crypto.randomUUID(), text: newCheckItem, completed: false }],
    });
    setNewCheckItem("");
  };

  const removeCheckItem = (id: string) => {
    update({ checklist: task.checklist.filter((c) => c.id !== id) });
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    update({
      subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: newSubtask, status: "pendente" as TaskStatus }],
    });
    setNewSubtask("");
  };

  const updateSubtaskStatus = (id: string, status: TaskStatus) => {
    update({
      subtasks: task.subtasks.map((s) => s.id === id ? { ...s, status } : s),
    });
  };

  const removeSubtask = (id: string) => {
    update({ subtasks: task.subtasks.filter((s) => s.id !== id) });
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    const ok = await activity.addComment(newComment);
    if (ok) setNewComment("");
  };

  const toggleWeekDay = (day: number) => {
    const config = task.recurrenceConfig || {};
    const currentDays = config.week_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort();
    update({ recurrenceConfig: { ...config, week_days: newDays } });
  };

  const selectClasses = "bg-muted/50 border-border rounded-lg h-8 text-xs focus:border-primary/50";
  const selectContentClasses = "bg-popover border-border text-foreground";
  const selectItemClasses = "text-xs focus:bg-white/[0.06] focus:text-foreground";

  const tabs = [
    { key: "summary", label: "Resumo", icon: ChevronDown },
    { key: "details", label: "Detalhes", icon: FileText },
    { key: "subtasks", label: `Subtarefas (${task.subtasks.length})`, icon: ListTree },
    { key: "recurrence", label: "Recorrência", icon: RefreshCw },
    { key: "comments", label: `Comentários (${activity.comments.length})`, icon: MessageSquare },
    { key: "history", label: `Histórico (${activity.history.length})`, icon: History },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex-1 min-w-0">
              {editMode ? (
                <div>
                  <Input
                    value={draft.title}
                    onChange={(e) => updateDraft({ title: e.target.value })}
                    className={`font-heading text-lg h-auto py-1 bg-muted/50 border-border ${fieldErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="Título da tarefa"
                  />
                  {fieldErrors.title && <p className="text-xs text-destructive mt-1">{fieldErrors.title}</p>}
                </div>
              ) : (
                <DialogTitle className="font-heading text-lg flex items-center gap-2 flex-wrap">
                  {task.title}
                  {task.isRecurring && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      <RefreshCw className="h-3 w-3" />
                      {task.recurrenceType ? recurrenceLabels[task.recurrenceType] : "Recorrente"}
                    </span>
                  )}
                  {task.parentTaskId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-muted-foreground">
                      Ocorrência
                    </span>
                  )}
                </DialogTitle>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-muted-foreground/70">{task.clientName}</span>
                {task.planName && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground/50">{task.planName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Editar / Salvar / Descartar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {editMode ? (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleDiscardEdit}>
                    <Undo2 className="h-3.5 w-3.5" /> Descartar
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1" disabled={!isDirty} onClick={handleSaveEdit}>
                    <Save className="h-3.5 w-3.5" /> Salvar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-border bg-white/[0.04] hover:bg-white/[0.08]" onClick={handleEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-2 border-b border-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground/70 hover:text-muted-foreground"
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-5 mt-3">
            {!editMode && (
              <p className="text-[10px] text-muted-foreground/50 -mt-1">
                Clique em <strong>Editar</strong> para alterar os campos abaixo.
              </p>
            )}
            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Status</label>
                {editMode ? (
                  <Select value={draft.status} onValueChange={(v) => updateDraft({ status: v as TaskStatus })}>
                    <SelectTrigger className={selectClasses}><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClasses}>
                      {(Object.keys(statusConfig) as TaskStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className={selectItemClasses}>{statusConfig[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs h-8 flex items-center">{statusConfig[task.status]?.label || task.status}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Prioridade *</label>
                {editMode ? (
                  <>
                    <Select value={draft.priority} onValueChange={(v) => updateDraft({ priority: v as TaskPriority })}>
                      <SelectTrigger className={`${selectClasses} ${fieldErrors.priority ? "border-destructive" : ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent className={selectContentClasses}>
                        {(Object.keys(priorityConfig) as TaskPriority[]).map((p) => (
                          <SelectItem key={p} value={p} className={selectItemClasses}>{priorityConfig[p].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.priority && <p className="text-[10px] text-destructive mt-1">{fieldErrors.priority}</p>}
                  </>
                ) : (
                  <p className="text-xs h-8 flex items-center">{priorityConfig[task.priority]?.label || task.priority}</p>
                )}
              </div>
            </div>

            {/* Responsible & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Responsável *</label>
                {editMode ? (
                  <>
                    <Select
                      value={draft.responsibleId || "none"}
                      onValueChange={(v) => {
                        if (v === "none") { updateDraft({ responsibleId: undefined, responsible: undefined }); return; }
                        const p = profiles.find((pr) => pr.user_id === v);
                        updateDraft({ responsibleId: v, responsible: p?.full_name });
                      }}
                    >
                      <SelectTrigger className={`${selectClasses} ${fieldErrors.responsibleId ? "border-destructive" : ""}`}><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent className={selectContentClasses}>
                        <SelectItem value="none" className={selectItemClasses}>Sem responsável</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.user_id} value={p.user_id} className={selectItemClasses}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.responsibleId && <p className="text-[10px] text-destructive mt-1">{fieldErrors.responsibleId}</p>}
                  </>
                ) : (
                  <p className="text-xs h-8 flex items-center">{task.responsible || "Sem responsável"}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Tipo</label>
                {editMode ? (
                  <Select value={draft.type} onValueChange={(v) => updateDraft({ type: v as TaskType })}>
                    <SelectTrigger className={selectClasses}><SelectValue /></SelectTrigger>
                    <SelectContent className={selectContentClasses}>
                      {(Object.keys(typeLabels) as TaskType[]).map((t) => (
                        <SelectItem key={t} value={t} className={selectItemClasses}>{typeLabels[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs h-8 flex items-center">{typeLabels[task.type] || task.type}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Data de Início *</label>
                {editMode ? (
                  <>
                    <Input
                      type="date"
                      value={draft.startDate || ""}
                      onChange={(e) => updateDraft({ startDate: e.target.value })}
                      className={`bg-muted/50 border-border rounded-lg h-8 text-xs focus:border-primary/50 ${fieldErrors.startDate ? "border-destructive" : ""}`}
                    />
                    {fieldErrors.startDate && <p className="text-[10px] text-destructive mt-1">{fieldErrors.startDate}</p>}
                  </>
                ) : (
                  <p className="text-xs h-8 flex items-center">{task.startDate ? new Date(task.startDate).toLocaleDateString("pt-BR") : "—"}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Data de Entrega *</label>
                {editMode ? (
                  <>
                    <Input
                      type="date"
                      value={draft.dueDate || ""}
                      onChange={(e) => updateDraft({ dueDate: e.target.value })}
                      className={`bg-muted/50 border-border rounded-lg h-8 text-xs focus:border-primary/50 ${fieldErrors.dueDate ? "border-destructive" : ""}`}
                    />
                    {fieldErrors.dueDate && <p className="text-[10px] text-destructive mt-1">{fieldErrors.dueDate}</p>}
                  </>
                ) : (
                  <p className="text-xs h-8 flex items-center">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "—"}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-5 mt-3">
            {/* Description (5x larger) */}
            <div>
              <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Descrição</label>
              {editMode ? (
                <Textarea
                  value={draft.description}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                  className="bg-muted/50 border-border rounded-lg text-xs min-h-[300px] resize-y focus:border-primary/50"
                />
              ) : (
                <p className="text-xs text-foreground/80 whitespace-pre-wrap min-h-[80px]">{task.description || "Sem descrição."}</p>
              )}
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Checklist</label>
                {task.checklist.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/50 font-heading">{checkProgress}%</span>
                )}
              </div>
              {task.checklist.length > 0 && (
                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mb-3">
                  <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: `${checkProgress}%` }} />
                </div>
              )}
              <div className="space-y-1">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group py-1 px-2 rounded-md hover:bg-white/[0.03]">
                    <button onClick={() => toggleCheckItem(item.id)}>
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </button>
                    <span className={`text-xs flex-1 ${item.completed ? "line-through text-muted-foreground/50" : ""}`}>{item.text}</span>
                    <button
                      onClick={() => removeCheckItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newCheckItem}
                  onChange={(e) => setNewCheckItem(e.target.value)}
                  placeholder="Novo item..."
                  onKeyDown={(e) => e.key === "Enter" && addCheckItem()}
                  className="bg-white/[0.03] border-border rounded-md h-7 text-xs placeholder:text-muted-foreground/40 focus:border-primary/50"
                />
                <Button onClick={addCheckItem} size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground/50 hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Subtasks Tab */}
        {activeTab === "subtasks" && (
          <div className="space-y-5 mt-3">
            <div>
              <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2 block">Subtarefas</label>
              <div className="space-y-1">
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white/[0.03] group">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      sub.status === "concluido" ? "bg-emerald-500" :
                      sub.status === "em_andamento" ? "bg-blue-500" :
                      sub.status === "pausado" ? "bg-amber-500" : "bg-white/20"
                    }`} />
                    <span className={`text-xs flex-1 ${sub.status === "concluido" ? "line-through text-muted-foreground/50" : ""}`}>
                      {sub.title}
                    </span>
                    <Select
                      value={sub.status}
                      onValueChange={(v) => updateSubtaskStatus(sub.id, v as TaskStatus)}
                    >
                      <SelectTrigger className="bg-transparent border-0 h-6 text-[10px] w-auto px-1.5 focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectContentClasses}>
                        {(Object.keys(statusConfig) as TaskStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className={selectItemClasses}>{statusConfig[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => removeSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Nova subtarefa..."
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  className="bg-white/[0.03] border-border rounded-md h-7 text-xs placeholder:text-muted-foreground/40 focus:border-primary/50"
                />
                <Button onClick={addSubtask} size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground/50 hover:text-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Recurrence Tab */}
        {activeTab === "recurrence" && (
          <div className="space-y-5 mt-3">
            {task.parentTaskId ? (
              <div className="p-4 rounded-lg bg-white/[0.03] border border-border">
                <p className="text-xs text-muted-foreground">
                  Esta é uma <strong>ocorrência</strong> de uma tarefa recorrente. 
                  As configurações de recorrência ficam na tarefa modelo.
                </p>
              </div>
            ) : (
              <>
                {/* Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Tarefa periódica</span>
                  </div>
                  <Switch
                    checked={task.isRecurring || false}
                    onCheckedChange={(v) => update({ isRecurring: v })}
                  />
                </div>

                {task.isRecurring && (
                  <>
                    {/* Recurrence Type */}
                    <div>
                      <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Tipo de recorrência</label>
                      <Select
                        value={task.recurrenceType || "semanal"}
                        onValueChange={(v) => update({ recurrenceType: v as RecurrenceType })}
                      >
                        <SelectTrigger className={selectClasses}><SelectValue /></SelectTrigger>
                        <SelectContent className={selectContentClasses}>
                          {(Object.keys(recurrenceLabels) as RecurrenceType[]).map((r) => (
                            <SelectItem key={r} value={r} className={selectItemClasses}>{recurrenceLabels[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Weekly: select days */}
                    {(task.recurrenceType === "semanal") && (
                      <div>
                        <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-2 block">Dias da semana</label>
                        <div className="flex gap-1.5">
                          {weekDayLabels.map((label, i) => {
                            const active = (task.recurrenceConfig?.week_days || []).includes(i);
                            return (
                              <button
                                key={i}
                                onClick={() => toggleWeekDay(i)}
                                className={`h-8 w-10 rounded-lg text-[10px] font-medium transition-all ${
                                  active
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-white/[0.04] text-muted-foreground/70 border border-border hover:bg-white/[0.08]"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Monthly: select day */}
                    {task.recurrenceType === "mensal" && (
                      <div>
                        <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Dia do mês</label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={task.recurrenceConfig?.month_day || 1}
                          onChange={(e) => update({
                            recurrenceConfig: { ...task.recurrenceConfig, month_day: parseInt(e.target.value) || 1 },
                          })}
                          className="bg-muted/50 border-border rounded-lg h-8 text-xs w-20 focus:border-primary/50"
                        />
                      </div>
                    )}

                    {/* Custom: every X days */}
                    {task.recurrenceType === "personalizada" && (
                      <div>
                        <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">A cada X dias</label>
                        <Input
                          type="number"
                          min={1}
                          value={task.recurrenceConfig?.interval_days || 7}
                          onChange={(e) => update({
                            recurrenceConfig: { ...task.recurrenceConfig, interval_days: parseInt(e.target.value) || 7 },
                          })}
                          className="bg-muted/50 border-border rounded-lg h-8 text-xs w-20 focus:border-primary/50"
                        />
                      </div>
                    )}

                    {/* End date */}
                    <div>
                      <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1 block">Encerrar em (opcional)</label>
                      <Input
                        type="date"
                        value={task.recurrenceEndDate || ""}
                        onChange={(e) => update({ recurrenceEndDate: e.target.value || undefined })}
                        className="bg-muted/50 border-border rounded-lg h-8 text-xs w-48 focus:border-primary/50"
                      />
                    </div>

                    {/* Info */}
                    {task.lastGeneratedAt && (
                      <p className="text-[10px] text-muted-foreground/50">
                        Última geração: {new Date(task.lastGeneratedAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div className="mt-3 space-y-3">
            {activity.loading && activity.comments.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Carregando comentários…</p>
            )}
            {!activity.loading && activity.comments.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Nenhum comentário ainda</p>
            )}
            {activity.comments.map((comment) => (
              <div key={comment.id} className="p-3 rounded-lg bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar className="h-5 w-5">
                    {comment.authorAvatarUrl && <AvatarImage src={comment.authorAvatarUrl} />}
                    <AvatarFallback className="text-[7px] gradient-primary">{comment.author[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{comment.author}</span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {new Date(comment.createdAt).toLocaleDateString("pt-BR")} {new Date(comment.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-foreground/70 pl-7">{comment.text}</p>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escrever comentário..."
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                className="bg-muted/50 border-border rounded-lg h-9 text-xs placeholder:text-muted-foreground/40 focus:border-primary/50"
              />
              <Button onClick={addComment} size="sm" className="gradient-primary border-0 text-white h-9 px-3 rounded-lg">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="mt-3 space-y-2">
            {activity.loading && activity.history.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Carregando histórico…</p>
            )}
            {!activity.loading && activity.history.length === 0 && (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Nenhum registro no histórico</p>
            )}
            {activity.history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 py-2 px-2">
                <div className="h-1.5 w-1.5 rounded-full bg-white/20 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs">
                    <span className="font-medium">{entry.action}:</span>{" "}
                    <span className="text-muted-foreground">{entry.detail}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                    {entry.user} · {new Date(entry.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Delete section */}
        {onDelete && (
          <div className="mt-4 pt-3 border-t border-border">
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Excluir tarefa permanentemente
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">Tem certeza? Essa ação é irreversível.</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => { onDelete(task.id); setConfirmDelete(false); }}
                >
                  Confirmar exclusão
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <UnsavedChangesDialog open={confirmOpen} onConfirmDiscard={confirmDiscard} onCancel={cancelDiscard} />
    </Dialog>
  );
}
