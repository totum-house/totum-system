import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDemo } from "@/contexts/DemoContext";
import type { Tables } from "@/integrations/supabase/types";
import type { TaskComment, TaskHistoryEntry } from "@/components/tasks/taskData";

type CommentRow = Pick<Tables<"task_comments">, "id" | "user_id" | "content" | "created_at">;
type HistoryRow = Pick<Tables<"task_history">, "id" | "user_id" | "action" | "detail" | "created_at">;
type ProfileRow = Pick<Tables<"profiles">, "user_id" | "full_name" | "avatar_url">;

/**
 * Comentários e histórico de UMA tarefa, carregados sob demanda quando o
 * diálogo de detalhe abre. Antes vinham embutidos na listagem (task_comments(*)
 * e task_history(*) de todas as tarefas em cada fetch) — B-041.
 *
 * Em modo demo usa o que já vem em demoTasks (fallback).
 */
export function useTaskActivity(
  taskId: string | undefined,
  enabled: boolean,
  fallback?: { comments: TaskComment[]; history: TaskHistoryEntry[] },
) {
  const { isDemoMode } = useDemo();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!taskId) return;
    if (isDemoMode) {
      setComments(fallback?.comments ?? []);
      setHistory(fallback?.history ?? []);
      return;
    }
    setLoading(true);
    try {
      const [{ data: commentRows, error: cErr }, { data: historyRows, error: hErr }] = await Promise.all([
        supabase.from("task_comments").select("id, user_id, content, created_at").eq("task_id", taskId).order("created_at", { ascending: true }),
        supabase.from("task_history").select("id, user_id, action, detail, created_at").eq("task_id", taskId).order("created_at", { ascending: false }),
      ]);
      if (cErr) throw cErr;
      if (hErr) throw hErr;

      // Nomes/avatares: task_comments.user_id aponta para auth.users, não para
      // profiles, então não dá para embutir no select — resolve em uma query.
      const userIds = Array.from(new Set(
        [...(commentRows || []), ...(historyRows || [])].map((r: { user_id: string | null }) => r.user_id).filter(Boolean),
      )) as string[];
      const profileMap = new Map<string, { name: string; avatar: string | null }>();
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        (profileRows || []).forEach((p: ProfileRow) => profileMap.set(p.user_id, { name: p.full_name, avatar: p.avatar_url }));
      }

      setComments((commentRows || []).map((c: CommentRow) => ({
        id: c.id,
        author: profileMap.get(c.user_id)?.name || "Usuário",
        authorAvatarUrl: profileMap.get(c.user_id)?.avatar || undefined,
        text: c.content,
        createdAt: c.created_at,
      })));
      setHistory((historyRows || []).map((h: HistoryRow) => ({
        id: h.id,
        action: h.action,
        detail: h.detail || "",
        user: h.user_id ? profileMap.get(h.user_id)?.name || "Sistema" : "Sistema",
        createdAt: h.created_at,
      })));
    } catch (error) {
      console.error("Error fetching task activity:", error);
    } finally {
      setLoading(false);
    }
    // fallback é um objeto novo a cada render; só o conteúdo demo importa e ele é estático
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, isDemoMode]);

  useEffect(() => {
    if (!enabled || !taskId) {
      setComments([]);
      setHistory([]);
      return;
    }
    fetch();
  }, [enabled, taskId, fetch]);

  const addComment = async (text: string) => {
    const content = text.trim();
    if (!taskId || !content) return false;
    if (isDemoMode) {
      setComments((prev) => [...prev, { id: crypto.randomUUID(), author: "Você", text: content, createdAt: new Date().toISOString() }]);
      toast({ title: "Modo Demo", description: "Comentário simulado." });
      return true;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from("task_comments").insert({ task_id: taskId, user_id: user.id, content });
    if (error) {
      toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    return true;
  };

  return { comments, history, loading, addComment, refetch: fetch };
}
