import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDemo } from "@/contexts/DemoContext";
import { useTenant } from "@/contexts/TenantContext";
import { demoDeliveryChecklists } from "@/data/demoData";
import type { Tables, TablesUpdate, Enums } from "@/integrations/supabase/types";

export type ChecklistRow = Tables<"delivery_checklists"> & {
  clients?: { name: string } | null;
  plans?: { name: string } | null;
  delivery_checklist_items?: (Tables<"delivery_checklist_items">)[];
};

const DEMO_TOAST = { title: "🎭 Modo Demonstração", description: "Ação simulada — nenhuma alteração foi salva." };

/** Debounce hook — fires fn only after `delay` ms of silence. */
function useDebouncedCallback<T extends (...args: any[]) => any>(fn: T, delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export function useDeliveryChecklists() {
  const { isDemoMode } = useDemo();
  const { tenant } = useTenant();
  const [checklists, setChecklists] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setChecklists(demoDeliveryChecklists as unknown as ChecklistRow[]);
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecklists([]); return; }

      // RLS already scopes to the tenant; org_id filter is belt-and-suspenders
      let query = supabase
        .from("delivery_checklists")
        .select(`
          *,
          clients(name),
          plans(name),
          delivery_checklist_items(* )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (tenant?.organization_id) {
        query = query.eq("organization_id", tenant.organization_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Sort items inside each checklist by sort_order
      const sorted = (data as ChecklistRow[] | null)?.map(c => ({
        ...c,
        delivery_checklist_items: (c.delivery_checklist_items || [])
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      })) ?? [];

      setChecklists(sorted);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, tenant?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateItemStatus = async (
    itemId: string,
    status: Enums<"delivery_item_status">,
    justification?: string
  ) => {
    if (isDemoMode) { toast(DEMO_TOAST); return true; }

    const updates: TablesUpdate<"delivery_checklist_items"> = { status };
    if (justification !== undefined) updates.justification = justification;
    if (status === "entregue") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    const { error } = await supabase
      .from("delivery_checklist_items")
      .update(updates)
      .eq("id", itemId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    return true;
  };

  // Debounced: only hits DB after 400ms of silence (prevents per-keystroke calls)
  const _saveJustification = useCallback(async (itemId: string, justification: string) => {
    if (isDemoMode) return true;
    const { error } = await supabase
      .from("delivery_checklist_items")
      .update({ justification })
      .eq("id", itemId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    // Silent refetch (no spinner flicker)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return true;
    const { data } = await supabase
      .from("delivery_checklists")
      .select("*, clients(name), plans(name), delivery_checklist_items(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setChecklists((data as ChecklistRow[]).map(c => ({
        ...c,
        delivery_checklist_items: (c.delivery_checklist_items || [])
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      })));
    }
    return true;
  }, [isDemoMode]);

  const updateItemJustification = useDebouncedCallback(_saveJustification, 400);

  const finalizeChecklist = async (checklistId: string) => {
    if (isDemoMode) { toast(DEMO_TOAST); return true; }
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return false;

    const items = checklist.delivery_checklist_items || [];
    const actionable = items.filter(i => i.status !== "nao_aplicavel");
    const delivered = actionable.filter(i => i.status === "entregue").length;
    const pct = actionable.length > 0 ? Math.round((delivered / actionable.length) * 100) : 0;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("delivery_checklists")
      .update({
        fulfillment_pct: pct,
        completed_at: new Date().toISOString(),
        completed_by: user?.id || null,
      })
      .eq("id", checklistId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }

    await fetch();
    toast({ title: "Checklist finalizado", description: `Cumprimento: ${pct}%` });
    return true;
  };

  return { checklists, loading, refetch: fetch, updateItemStatus, updateItemJustification, finalizeChecklist };
}
