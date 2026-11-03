import { DollarSign, Users, ClipboardCheck, TrendingUp, AlertTriangle, ArrowRight, UserCheck, Loader2 } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RiskRanking } from "@/components/dashboard/RiskRanking";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";

// RevenueChart puxa o recharts (~350 KB): fica fora do chunk da Home e
// carrega depois dos cards de métricas.
const RevenueChart = lazy(() => import("@/components/dashboard/RevenueChart").then((m) => ({ default: m.RevenueChart })));
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data, loading } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Dashboard Operacional</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sua agência sob controle.{" "}
          {data.fulfillmentPct > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.fulfillmentPct}%</span>
          )}{" "}
          {data.fulfillmentPct > 0 ? "das entregas concluídas este mês." : ""}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="MRR" value={`R$ ${data.mrr.toLocaleString("pt-BR")}`} change={data.mrrChange} changeType="positive" icon={DollarSign} tooltip="Soma do valor de todos os Contratos Ativos." />
        <MetricCard title="Clientes Ativos" value={String(data.activeClients)} change={`${data.clientsChange} com contrato`} changeType="positive" icon={Users} tooltip="Total de clientes com status ativo no sistema." />
        <MetricCard title="Cumprimento Contratual" value={`${data.fulfillmentPct}%`} change="" changeType="positive" icon={ClipboardCheck} tooltip="Percentual médio de entregas finalizadas neste mês." />
        <MetricCard title="Resultado do Mês" value={`R$ ${data.profit.toLocaleString("pt-BR")}`} change={data.profitChange} changeType={data.profit >= 0 ? "positive" : "negative"} icon={TrendingUp} tooltip="Receitas - Despesas de títulos pagos no mês corrente." />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
            <RevenueChart />
          </Suspense>
        </div>
        <div className="lg:col-span-2"><RiskRanking /></div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading text-base font-semibold">Atividade Recente</h3>
            <Link to="/tarefas" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma atividade recente</p>
            ) : (
              data.recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent transition-colors">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${item.type === "success" ? "bg-emerald-500" : item.type === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{item.action}</span>
                    <span className="text-muted-foreground text-sm"> — {item.client}</span>
                  </div>
                  <span className="text-xs text-muted-foreground/70 shrink-0">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-6">
          <h3 className="font-heading text-base font-semibold mb-5">Alertas</h3>
          <div className="space-y-3">
            {data.pendingUsers > 0 && (
              <Link to="/usuarios" className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/[0.08] border border-blue-500/20 hover:bg-blue-500/[0.12] transition-colors">
                <UserCheck className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{data.pendingUsers} usuário(s) pendente(s)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Aguardando aprovação</p>
                </div>
              </Link>
            )}
            {data.overdueEntries > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/[0.08] border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{data.overdueEntries} lançamento(s) atrasado(s)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Financeiro com pendências</p>
                </div>
              </div>
            )}
            {data.pendingUsers === 0 && data.overdueEntries === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta no momento</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
