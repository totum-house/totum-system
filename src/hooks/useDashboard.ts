import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/contexts/DemoContext";
import { demoDashboardData } from "@/data/demoData";

interface DashboardData {
  mrr: number;
  activeClients: number;
  fulfillmentPct: number;
  profit: number;
  mrrChange: string;
  clientsChange: string;
  profitChange: string;
  recentActivity: { action: string; client: string; time: string; type: "success" | "warning" | "info" }[];
  pendingUsers: number;
  overdueEntries: number;
  pendingChecklists: number;
}

export function useDashboard() {
  const { isDemoMode } = useDemo();
  const [data, setData] = useState<DashboardData>({
    mrr: 0, activeClients: 0, fulfillmentPct: 0, profit: 0,
    mrrChange: "+0%", clientsChange: "+0", profitChange: "+0%",
    recentActivity: [], pendingUsers: 0, overdueEntries: 0, pendingChecklists: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isDemoMode) {
      setData(demoDashboardData);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Guard: ensure we have an auth session before querying
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      // Active contracts → MRR
      const { data: contracts } = await supabase
        .from("contracts")
        .select("value, client_id")
        .eq("status", "ativo");

      const mrr = (contracts || []).reduce((s, c) => s + (Number(c.value) || 0), 0);
      const uniqueClients = new Set((contracts || []).map(c => c.client_id));

      const { count: activeClients } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .in("status", ["ativo", "active"]);

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

      const { data: entries } = await supabase
        .from("financial_entries")
        .select("type, value, status")
        .gte("due_date", monthStart)
        .lt("due_date", monthEnd);

      const income = (entries || []).filter(e => e.type === "receber" && e.status === "pago").reduce((s, e) => s + Number(e.value), 0);
      const expense = (entries || []).filter(e => e.type === "pagar" && e.status === "pago").reduce((s, e) => s + Number(e.value), 0);
      const overdue = (entries || []).filter(e => e.status === "atrasado").length;

      const { data: checklists } = await supabase
        .from("delivery_checklists")
        .select("fulfillment_pct")
        .limit(100);

      const avgFulfillment = checklists && checklists.length > 0
        ? Math.round(checklists.reduce((s, c) => s + (Number(c.fulfillment_pct) || 0), 0) / checklists.length)
        : 0;

      const { count: pendingUsers } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente" as any);

      const { data: recentTasks } = await supabase
        .from("task_history")
        .select("action, detail, created_at, tasks(title, clients(name))")
        .order("created_at", { ascending: false })
        .limit(5);

      const recentActivity = (recentTasks || []).map((t: any) => ({
        action: t.action,
        client: t.tasks?.clients?.name || t.tasks?.title || "—",
        time: formatTimeAgo(new Date(t.created_at)),
        type: t.action.includes("conclu") ? "success" as const : t.action.includes("pendente") ? "warning" as const : "info" as const,
      }));

      setData({
        mrr,
        activeClients: activeClients || 0,
        fulfillmentPct: avgFulfillment,
        profit: income - expense,
        mrrChange: "+0%",
        clientsChange: `${uniqueClients.size}`,
        profitChange: income - expense >= 0 ? "Positivo" : "Negativo",
        recentActivity,
        pendingUsers: pendingUsers || 0,
        overdueEntries: overdue,
        pendingChecklists: 0,
      });
    } catch (err) {
      console.error("[Dashboard] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}
