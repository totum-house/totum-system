import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, MinusCircle, Ban, ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientDeliveries } from "@/hooks/useClientDeliveries";
import type { Enums } from "@/integrations/supabase/types";

type UIStatus = "entregue" | "entregue_parcialmente" | "nao_entregue" | "nao_aplicavel" | "pending";

const statusIcons: Record<UIStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  entregue: { icon: CheckCircle2, color: "text-emerald-400", label: "Entregue" },
  entregue_parcialmente: { icon: AlertCircle, color: "text-amber-400", label: "Parcial" },
  nao_entregue: { icon: MinusCircle, color: "text-red-400", label: "Não entregue" },
  nao_aplicavel: { icon: Ban, color: "text-muted-foreground", label: "N/A" },
  pending: { icon: AlertCircle, color: "text-muted-foreground/50", label: "Pendente" },
};

const statusOptions: Enums<"delivery_item_status">[] = ["entregue", "entregue_parcialmente", "nao_entregue", "nao_aplicavel"];

interface Props { clientId: string; }

export function ClientHubDeliveries({ clientId }: Props) {
  const { checklists, loading, updateItemStatus, updateJustification, finalizeChecklist } = useClientDeliveries(clientId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const getPct = (c: any) => {
    const items = c.delivery_checklist_items || [];
    const actionable = items.filter((i: any) => i.status && i.status !== "nao_aplicavel");
    if (!actionable.length) return 0;
    return Math.round((actionable.filter((i: any) => i.status === "entregue").length / actionable.length) * 100);
  };


  const canFinalize = (c: any) => {
    const items = c.delivery_checklist_items || [];
    return !items.some((i: any) => !i.status) &&
      !items.some((i: any) => (i.status === "entregue_parcialmente" || i.status === "nao_entregue") && !(i.justification || "").trim()) &&
      !c.completed_at;
  };

  const filtered = checklists.filter(c => {
    if (!search) return true;
    const planName = (c.plans as any)?.name || "";
    return planName.toLowerCase().includes(search.toLowerCase()) || c.period?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar entregas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.05] border-border" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma entrega encontrada</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(checklist => {
            const pct = getPct(checklist);
            const isExpanded = expanded.has(checklist.id);
            const items = checklist.delivery_checklist_items || [];

            return (
              <motion.div key={checklist.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl overflow-hidden">
                <button onClick={() => toggleExpand(checklist.id)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 text-left">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{(checklist.plans as any)?.name || "Sem pacote"}</span>
                        {checklist.completed_at && <span className="text-xs text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10">Finalizado</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{checklist.period} · {checklist.frequency}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-heading w-10 text-right">{pct}%</span>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-border px-4 py-3 space-y-1">
                        {items.map((item: any) => {
                          const uiStatus: UIStatus = item.status || "pending";
                          const info = statusIcons[uiStatus];
                          const Icon = info.icon;
                          const needsJust = (uiStatus === "entregue_parcialmente" || uiStatus === "nao_entregue") && !(item.justification || "").trim();

                          return (
                            <div key={item.id}>
                              <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.03]">
                                <Icon className={`h-4 w-4 shrink-0 ${info.color}`} />
                                <span className="flex-1 text-sm">{item.title}</span>
                                <div className="flex gap-0.5">
                                  {statusOptions.map(s => {
                                    const si = statusIcons[s];
                                    const SIcon = si.icon;
                                    return (
                                      <button key={s} onClick={() => updateItemStatus(item.id, s)} disabled={!!checklist.completed_at}
                                        className={`p-1 rounded transition-all ${item.status === s ? `${si.color} bg-white/[0.08]` : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"}`}
                                        title={si.label}>
                                        <SIcon className="h-3.5 w-3.5" />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              {(uiStatus === "entregue_parcialmente" || uiStatus === "nao_entregue") && (
                                <div className={`ml-9 mr-2 mb-2 rounded-lg border-l-2 ${needsJust ? "border-primary" : "border-border"}`}>
                                  <textarea
                                    defaultValue={item.justification || ""}
                                    onChange={e => updateJustification(item.id, e.target.value)}
                                    placeholder="Justificativa obrigatória"
                                    disabled={!!checklist.completed_at}
                                    className="w-full p-2 text-sm bg-white/[0.03] border-0 resize-none placeholder:text-muted-foreground focus:outline-none min-h-[50px]"
                                  />
                                  {needsJust && <p className="px-2 pb-1 text-xs text-primary">Justificativa obrigatória</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!checklist.completed_at && (
                        <div className="border-t border-border px-4 py-3 flex justify-end">
                          <Button disabled={!canFinalize(checklist)} onClick={() => finalizeChecklist(checklist.id)}
                            className={canFinalize(checklist) ? "gradient-primary border-0 text-white rounded-full px-5 text-sm" : "bg-white/[0.06] text-muted-foreground border border-border rounded-full px-5 text-sm"}>
                            Confirmar Entrega
                          </Button>
                        </div>
                      )}
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
