import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { handleApiError } from "@/lib/errorHandler";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { useTenant } from "@/contexts/TenantContext";
import { demoCompanySettings, demoSystemSettings, demoAuditLogsList } from "@/data/demoData";

const DEMO_TOAST = { title: "🎭 Modo Demonstração", description: "Ação simulada — nenhuma alteração foi salva." };

export function useCompanySettings() {
  const { isDemoMode } = useDemo();
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["company_settings", tenant?.organization_id, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return demoCompanySettings;

      // company_settings é a única tabela de configurações da empresa em produção
      // (organization_settings não existe no schema totum_system — B-039).
      if (tenant?.organization_id && !tenant.fallback) {
        const { data, error } = await supabase
          .from("company_settings")
          .select("*")
          .eq("organization_id", tenant.organization_id)
          .maybeSingle();

        if (error) throw error;

        if (data) return data;
      }

      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (isDemoMode) { toast(DEMO_TOAST); return; }

      const payload = {
        name: updates.name || "",
        email: updates.email || null,
        phone: updates.phone || null,
        address: updates.address || null,
      };

      if (tenant?.organization_id && !tenant.fallback) {
        const { data: existing } = await supabase
          .from("company_settings")
          .select("id")
          .eq("organization_id", tenant.organization_id)
          .maybeSingle();

        const { error } = existing
          ? await supabase.from("company_settings").update(payload).eq("id", existing.id)
          : await supabase.from("company_settings").insert({ ...payload, organization_id: tenant.organization_id });

        if (error) throw error;

        return;
      }

      const { data: existing } = await supabase.from("company_settings").select("id").limit(1).maybeSingle();
      if (!existing) throw new Error("Configurações não encontradas");
      const { error } = await supabase.from("company_settings").update(payload).eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isDemoMode) {
        qc.invalidateQueries({ queryKey: ["company_settings"] });
        toast({ title: "Salvo", description: "Configurações da empresa atualizadas." });
      }
    },
    onError: (err) => {
      if (isDemoMode) return;
      const friendly = handleApiError(err, "update_company_settings", user?.id);
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    },
  });
}

export function useSystemSettings() {
  const { isDemoMode } = useDemo();
  return useQuery({
    queryKey: ["system_settings", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return demoSystemSettings;
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (isDemoMode) { toast(DEMO_TOAST); return; }
      const { data: existing } = await (supabase as any).from("system_settings").select("id").limit(1).maybeSingle();
      if (!existing) throw new Error("Configurações não encontradas");
      const { error } = await (supabase as any).from("system_settings").update(updates as any).eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (!isDemoMode) {
        qc.invalidateQueries({ queryKey: ["system_settings"] });
        toast({ title: "Salvo", description: "Configurações do sistema atualizadas." });
      }
    },
    onError: (err) => {
      if (isDemoMode) return;
      const friendly = handleApiError(err, "update_system_settings", user?.id);
      toast({ title: friendly.title, description: friendly.description, variant: "destructive" });
    },
  });
}

export function useAuditLogs(filters?: { entityType?: string; limit?: number }) {
  const { isDemoMode } = useDemo();
  return useQuery({
    queryKey: ["audit_logs", filters, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return demoAuditLogsList;
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit || 100);
      if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useErrorLogs() {
  const { isDemoMode } = useDemo();
  return useQuery({
    queryKey: ["error_logs", isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return [];
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}
