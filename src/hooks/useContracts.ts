import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useDemo } from "@/contexts/DemoContext";
import { useTenant } from "@/contexts/TenantContext";
import { attachOrganizationId } from "@/lib/tenant";
import { demoContracts } from "@/data/demoData";

export type ContractRow = Tables<"contracts"> & {
  clients?: { name: string } | null;
  plans?: { name: string } | null;
  contract_types?: { name: string } | null;
};

export function useContracts() {
  const { isDemoMode } = useDemo();
  const { tenant } = useTenant();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isDemoMode) {
      setContracts(demoContracts as ContractRow[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, clients(name), plans(name), contract_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContracts((data as ContractRow[]) || []);
    } catch (err) {
      console.error("Error fetching contracts:", err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, tenant?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const addContract = async (values: Partial<Tables<"contracts">>) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    const payload = attachOrganizationId(values as any, tenant?.organization_id);
    const { error } = await supabase.from("contracts").insert(payload);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    toast({ title: "Contrato criado", description: values.title });
    return true;
  };

  const updateContract = async (id: string, values: Partial<Tables<"contracts">>) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    
    const prevContract = contracts.find(c => c.id === id);
    const isActivating = values.status === 'ativo' && prevContract?.status !== 'ativo';

    const { error } = await supabase.from("contracts").update(values).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }

    // Auto-generate deliveries when activating a contract with a plan
    const planId = values.plan_id || prevContract?.plan_id;
    if (isActivating && planId) {
      try {
        const { data: modelItems } = await supabase
          .from("delivery_model_items")
          .select("*")
          .eq("plan_id", planId);
        
        if (modelItems && modelItems.length > 0) {
          const { data: checklist } = await supabase.from("delivery_checklists").insert({
            client_id: prevContract?.client_id as string,
            contract_id: id,
            plan_id: planId,
            title: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()),
            period: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()),
            frequency: prevContract?.billing_frequency || 'mensal',
            fulfillment_pct: 0,
            organization_id: tenant?.organization_id ?? null,
          }).select().single();

          if (checklist) {
            const itemsToInsert = modelItems.map((it, idx) => ({
              checklist_id: checklist.id,
              title: it.name,
              delivery_model_item_id: it.id,
              // status: null is valid — "pendente" is not in the enum
              sort_order: it.sort_order ?? idx,
              responsible_id: it.suggested_responsible_id ?? null,
            }));
            await supabase.from("delivery_checklist_items").insert(itemsToInsert);
            toast({ title: "🚀 Entregas geradas", description: `${modelItems.length} itens adicionados ao checklist.` });
          }
        }
      } catch (err) {
        console.error("Erro na automação de entregas:", err);
      }
    }

    await fetch();
    return true;
  };

  return { contracts, loading, refetch: fetch, addContract, updateContract };
}
