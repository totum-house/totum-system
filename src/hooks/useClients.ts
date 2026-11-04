import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useDemo } from "@/contexts/DemoContext";
import { useTenant } from "@/contexts/TenantContext";
import { attachOrganizationId } from "@/lib/tenant";
import { demoClients } from "@/data/demoData";
import { getClientDisplayName } from "@/lib/clients";

export type ClientRow = Tables<"clients"> & {
  company_name?: string | null;
  contact_name?: string | null;
  cnpj?: string | null;
  contracts?: { value: number | null; plan_id: string | null; status: string; plans?: { name: string } | null }[];
};

export function useClients() {
  const { isDemoMode } = useDemo();
  const { tenant } = useTenant();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (isDemoMode) {
      setClients(demoClients as ClientRow[]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setClients([]);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*, contracts(value, plan_id, status, plans(name))");

      if (error) throw error;
      const sorted = ((data as ClientRow[]) || []).sort((a, b) =>
        getClientDisplayName(a).localeCompare(getClientDisplayName(b), "pt-BR")
      );
      setClients(sorted);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, tenant?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const addClient = async (values: Partial<Tables<"clients">>) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    const payload = attachOrganizationId(values as any, tenant?.organization_id);
    const { error } = await supabase.from("clients").insert(payload);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    toast({ title: "Cliente criado", description: getClientDisplayName(values as ClientRow) });
    return true;
  };

  const updateClient = async (id: string, values: Partial<Tables<"clients">>) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    const { error } = await supabase.from("clients").update(values).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    return true;
  };

  const deleteClient = async (id: string) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      // FKs de contracts/financial_entries/tasks/projects/task_goals não têm cascata (de propósito):
      // a tela deve ter oferecido "Desativar"; aqui é só o último recurso.
      const blocked = /foreign key constraint/i.test(error.message);
      toast({
        title: blocked ? "Cliente possui vínculos" : "Erro",
        description: blocked
          ? "Este cliente tem contratos, tarefas ou lançamentos ligados a ele e não pode ser excluído. Desative o cliente para ocultá-lo das listagens."
          : error.message,
        variant: "destructive",
      });
      return false;
    }
    await fetch();
    toast({ title: "Cliente excluído" });
    return true;
  };

  /** Soft delete: o cliente some das listagens, mas contratos, tarefas e financeiro ficam íntegros. */
  const deactivateClient = async (id: string) => {
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    const { error } = await supabase
      .from("clients")
      .update({ status: "inativo", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    toast({ title: "Cliente desativado", description: "O cliente foi ocultado das listagens." });
    return true;
  };

  return { clients, loading, refetch: fetch, addClient, updateClient, deleteClient, deactivateClient };
}

export interface ClientLinks {
  contratos: number;
  lancamentos: number;
  tarefas: number;
  projetos: number;
  metas: number;
  total: number;
}

/**
 * Conta os registros que apontam para o cliente em tabelas cuja FK bloqueia o DELETE
 * (contracts, financial_entries, tasks, projects, task_goals). Usado pela tela de
 * clientes para explicar por que a exclusão não é possível e oferecer "Desativar".
 */
export async function countClientLinks(clientId: string): Promise<ClientLinks> {
  const count = async (table: "contracts" | "financial_entries" | "tasks" | "projects" | "task_goals") => {
    const { count: n, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);
    if (error) throw error;
    return n ?? 0;
  };
  const [contratos, lancamentos, tarefas, projetos, metas] = await Promise.all([
    count("contracts"), count("financial_entries"), count("tasks"), count("projects"), count("task_goals"),
  ]);
  return { contratos, lancamentos, tarefas, projetos, metas, total: contratos + lancamentos + tarefas + projetos + metas };
}

export function useClientById(clientId: string | undefined) {
  const { isDemoMode } = useDemo();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    if (isDemoMode) {
      const found = (demoClients as ClientRow[]).find((c) => c.id === clientId) || null;
      setClient(found);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").eq("id", clientId).single();
    setClient((data as ClientRow) || null);
    setLoading(false);
  }, [clientId, isDemoMode]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateClient = async (values: Partial<Tables<"clients">>) => {
    if (!clientId) return false;
    if (isDemoMode) { toast({ title: "Modo Demo", description: "Ação simulada com sucesso." }); return true; }
    const { error } = await supabase.from("clients").update(values).eq("id", clientId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    return true;
  };

  return { client, loading, refetch: fetch, updateClient };
}
