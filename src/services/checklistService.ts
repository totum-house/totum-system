import { supabase } from "@/integrations/supabase/client";

/**
 * Gera um checklist de entrega para um cliente baseado no seu plano atual.
 * @param clientId ID do cliente
 * @param period Descrição do período (ex: "Março 2026")
 */
export async function generateChecklistForClient(clientId: string, period: string): Promise<boolean> {
  try {
    // 1. Buscar contrato ativo do cliente com pacote associado
    const { data: contract, error: contractErr } = await supabase
      .from("contracts")
      .select("id, plan_id, billing_frequency")
      .eq("client_id", clientId)
      .eq("status", "ativo")
      .limit(1)
      .single();

    if (contractErr || !contract || !contract.plan_id) {
      console.warn(`Cliente ${clientId} não possui contrato ativo com pacote associado.`);
      return false;
    }

    // 2. Verificar se já existe um checklist para este período e cliente
    const { data: existing } = await supabase
      .from("delivery_checklists")
      .select("id")
      .eq("client_id", clientId)
      .eq("period", period)
      .limit(1)
      .single();

    if (existing) {
      return true;
    }

    // 3. Criar o cabeçalho do checklist
    // Resolve organization_id via clients table (service-role bypasses RLS)
    const { data: clientRow } = await supabase
      .from("clients")
      .select("organization_id")
      .eq("id", clientId)
      .single();

    const { data: checklist, error: checklistErr } = await supabase
      .from("delivery_checklists")
      .insert({
        client_id: clientId,
        contract_id: contract.id,
        plan_id: contract.plan_id,
        title: period,
        period: period,
        frequency: contract.billing_frequency || "mensal",
        fulfillment_pct: 0,
        organization_id: clientRow?.organization_id ?? null,
      })
      .select("id")
      .single();

    if (checklistErr || !checklist) {
      throw checklistErr || new Error("Falha ao criar checklist");
    }

    // 4. Buscar itens do modelo do pacote
    const { data: modelItems } = await supabase
      .from("delivery_model_items")
      .select("*")
      .eq("plan_id", contract.plan_id)
      .order("sort_order", { ascending: true });

    if (modelItems && modelItems.length > 0) {
      // 5. Inserir os itens no checklist
      const itemsToInsert = modelItems.map(item => ({
        checklist_id: checklist.id,
        delivery_model_item_id: item.id,
        title: item.name,
        // status: null → valid (enum has no "pendente"; NULL = not yet assessed)
        sort_order: item.sort_order ?? 0,
        responsible_id: item.suggested_responsible_id ?? null,
      }));

      const { error: itemsErr } = await supabase
        .from("delivery_checklist_items")
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      // 6. Opcional: Criar tarefas no Kanban para cada item (se necessário pelo fluxo)
      // Por enquanto, os itens do checklist são independentes do Kanban principal,
      // mas o banco permite vincular via task_id.
    }

    return true;
  } catch (error) {
    console.error("Erro ao gerar checklist automático:", error);
    return false;
  }
}
