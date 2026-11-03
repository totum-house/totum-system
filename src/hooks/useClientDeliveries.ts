import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDemo } from "@/contexts/DemoContext";
import { demoDeliveryChecklists } from "@/data/demoData";
import type { Enums } from "@/integrations/supabase/types";

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

export function useClientDeliveries(clientId: string) {
  const { isDemoMode } = useDemo();
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isDemoMode) {
      setChecklists((demoDeliveryChecklists as any[]).filter((c) => c.client_id === clientId));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("delivery_checklists")
      .select("*, plans(name), delivery_checklist_items(*)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    const sorted = (data || []).map((c: any) => ({
      ...c,
      delivery_checklist_items: (c.delivery_checklist_items || [])
        .slice()
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));

    setChecklists(sorted);
    setLoading(false);
  }, [clientId, isDemoMode]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateItemStatus = async (itemId: string, status: Enums<"delivery_item_status">) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return; }
    const updates: any = { status };
    if (status === "entregue") updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    await supabase.from("delivery_checklist_items").update(updates).eq("id", itemId);
    await fetch();
  };

  const _saveJustification = useCallback(async (itemId: string, justification: string) => {
    if (isDemoMode) return;
    await supabase.from("delivery_checklist_items").update({ justification }).eq("id", itemId);
    setChecklists((prev) => prev.map((c) => ({
      ...c,
      delivery_checklist_items: (c.delivery_checklist_items || []).map((i: any) =>
        i.id === itemId ? { ...i, justification } : i
      ),
    })));
  }, [isDemoMode]);

  const updateJustification = useDebouncedCallback(_saveJustification, 400);

  const finalizeChecklist = async (checklistId: string) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return; }
    const c = checklists.find((x) => x.id === checklistId);
    if (!c) return;
    const items = c.delivery_checklist_items || [];
    const actionable = items.filter((i: any) => i.status !== "nao_aplicavel");
    const pct = actionable.length ? Math.round((actionable.filter((i: any) => i.status === "entregue").length / actionable.length) * 100) : 0;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("delivery_checklists").update({
      fulfillment_pct: pct,
      completed_at: new Date().toISOString(),
      completed_by: user?.id || null,
    }).eq("id", checklistId);
    await fetch();
    toast({ title: "Checklist finalizado", description: `Cumprimento: ${pct}%` });
  };

  return { checklists, loading, refetch: fetch, updateItemStatus, updateJustification, finalizeChecklist };
}
