import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, MinusCircle, Ban, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryChecklists, ChecklistRow } from "@/hooks/useDeliveryChecklists";
import type { Enums } from "@/integrations/supabase/types";

type UIStatus = "entregue" | "entregue_parcialmente" | "nao_entregue" | "nao_aplicavel" | "pending";

const statusIcons: Record<UIStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  entregue: { icon: CheckCircle2, color: "text-emerald-400", label: "Entregue" },
  entregue_parcialmente: { icon: AlertCircle, color: "text-amber-400", label: "Parcial" },
  nao_entregue: { icon: MinusCircle, color: "text-red-400", label: "Não entregue" },
  nao_aplicavel: { icon: Ban, color: "text-muted-foreground/50", label: "N/A" },
  pending: { icon: AlertCircle, color: "text-muted-foreground/40", label: "Pendente" },
};

const statusOptions: Enums<"delivery_item_status">[] = ["entregue", "entregue_parcialmente", "nao_entregue", "nao_aplicavel"];

export default function Fulfillment() {
  const { checklists, loading, updateItemStatus, updateItemJustification, finalizeChecklist } = useDeliveryChecklists();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getFulfillmentPercent = (checklist: ChecklistRow) => {
    const items = checklist.delivery_checklist_items || [];
    const actionable = items.filter(i => i.status && i.status !== "nao_aplicavel");
    if (actionable.length === 0) return 0;
    const delivered = actionable.filter(i => i.status === "entregue").length;
    return Math.round((delivered / actionable.length) * 100);
  };

  const canFinalize = (checklist: ChecklistRow) => {
    const items = checklist.delivery_checklist_items || [];
    const hasUnset = items.some(i => !i.status);
    const needsJust = items.some(
      i => (i.status === "entregue_parcialmente" || i.status === "nao_entregue") && !(i.justification || "").trim()
    );
    return !hasUnset && !needsJust && !checklist.completed_at;
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Entregas Contratuais</h1>
        <p className="text-sm text-muted-foreground mt-1">Checklists de entrega por cliente e período</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground/50">Nenhum checklist de entrega encontrado. Gere checklists a partir dos contratos ativos.</div>
      ) : (
        <div className="space-y-4">
          {checklists.map((checklist) => {
            const pct = getFulfillmentPercent(checklist);
            const isExpanded = expanded.has(checklist.id);
            const finalizable = canFinalize(checklist);
            const items = checklist.delivery_checklist_items || [];
            const clientName = (checklist.clients as any)?.name || "—";
            const planName = (checklist.plans as any)?.name || "";

            return (
              <motion.div
                key={checklist.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                <button onClick={() => toggleExpand(checklist.id)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/70" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/70" />}
                    <div className="text-left">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{clientName}</span>
                        {planName && (
                          <span className="text-xs text-muted-foreground/50 px-2 py-0.5 rounded-full border border-border bg-white/[0.04]">{planName}</span>
                        )}
                        {checklist.completed_at && (
                          <span className="text-xs text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10">Finalizado</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground/70 mt-0.5 block">{checklist.period} · {checklist.frequency}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-heading font-medium w-10 text-right">{pct}%</span>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-border px-5 py-3 space-y-1">
                        {items.map((item) => {
                          const uiStatus: UIStatus = (item.status as UIStatus) || "pending";
                          const info = statusIcons[uiStatus] || statusIcons.pending || { icon: AlertCircle, color: "text-muted-foreground/40", label: "Pendente" };
                          const Icon = info.icon;
                          const needsJust = (uiStatus === "entregue_parcialmente" || uiStatus === "nao_entregue") && !(item.justification || "").trim();

                          return (
                            <div key={item.id}>
                              <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                                <Icon className={`h-4 w-4 shrink-0 ${info.color}`} />
                                <span className="flex-1 text-sm">{item.title}</span>
                                <div className="flex items-center gap-1">
                                  {statusOptions.map((s) => {
                                    const si = statusIcons[s] || statusIcons.pending;
                                    const SIcon = si.icon;
                                    const active = item.status === s;
                                    return (
                                      <button
                                        key={s}
                                        onClick={() => updateItemStatus(item.id, s)}
                                        disabled={!!checklist.completed_at}
                                        className={`p-1.5 rounded-md transition-all text-xs ${active ? `${si.color} bg-white/[0.08]` : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/[0.04]"}`}
                                        title={si.label}
                                      >
                                        <SIcon className="h-3.5 w-3.5" />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <AnimatePresence>
                                {(uiStatus === "entregue_parcialmente" || uiStatus === "nao_entregue") && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className={`ml-10 mr-3 mb-2 rounded-lg overflow-hidden ${needsJust ? "border-l-2 border-primary" : "border-l-2 border-border"}`}>
                                      <textarea
                                        value={item.justification || ""}
                                        onChange={(e) => updateItemJustification(item.id, e.target.value)}
                                        placeholder="Justificativa obrigatória"
                                        disabled={!!checklist.completed_at}
                                        className="w-full p-3 text-sm bg-white/[0.03] border-0 resize-none placeholder:text-white/25 focus:outline-none min-h-[60px]"
                                      />
                                      {needsJust && <p className="px-3 pb-2 text-xs text-primary">Justificativa obrigatória</p>}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-border px-5 py-4 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground/70">
                          {items.filter(i => i.status === "entregue").length} de {items.filter(i => i.status !== "nao_aplicavel").length} entregas concluídas
                        </div>
                        {!checklist.completed_at && (
                          <Button
                            disabled={!finalizable}
                            onClick={() => finalizeChecklist(checklist.id)}
                            className={`rounded-full text-sm px-5 font-semibold ${finalizable ? "gradient-primary border-0 text-white shadow-lg shadow-red-500/20" : "bg-white/[0.06] text-muted-foreground/50 border border-border cursor-not-allowed"}`}
                          >
                            Confirmar Entrega
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
