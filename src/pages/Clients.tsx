import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, MoreHorizontal, ArrowUpDown, Pencil, Trash2,
  LayoutGrid, List, Mail, Phone, Building2, Users, UserCheck, EyeOff, Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useClients, countClientLinks, ClientRow, ClientLinks } from "@/hooks/useClients";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfiles } from "@/hooks/useProfiles";
import { usePermissions } from "@/hooks/usePermissions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientDisplayName, getClientSecondaryInfo, getClientStatusLabel } from "@/lib/clients";
import { PageHeader, EmptyState, LoadingState, PaginationControls } from "@/components/shared";

const statusConfig: Record<string, string> = {
  ativo: "status-active",
  active: "status-active",
  pausado: "status-paused",
  cancelado: "status-cancelled",
  inativo: "status-cancelled",
  pending: "status-paused",
};

function isInactiveStatus(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  return normalized === "inativo" || normalized === "inactive";
}

const PAGE_SIZE = 25;

export default function Clients() {
  const navigate = useNavigate();
  const { clients, loading, deleteClient, deactivateClient } = useClients();
  // Diálogo de exclusão: conta vínculos antes de apagar; com vínculos, oferece "Desativar"
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleteLinks, setDeleteLinks] = useState<ClientLinks | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openDelete = async (client: ClientRow) => {
    setDeleteTarget(client);
    setDeleteLinks(null);
    try {
      setDeleteLinks(await countClientLinks(client.id));
    } catch {
      // Sem contagem, deixa o banco decidir (deleteClient já traduz o erro de FK)
      setDeleteLinks({ contratos: 0, lancamentos: 0, tarefas: 0, projetos: 0, metas: 0, total: 0 });
    }
  };

  const closeDelete = () => { setDeleteTarget(null); setDeleteLinks(null); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const ok = await deleteClient(deleteTarget.id);
    setDeleteBusy(false);
    if (ok) closeDelete();
  };

  const confirmDeactivate = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const ok = await deactivateClient(deleteTarget.id);
    setDeleteBusy(false);
    if (ok) closeDelete();
  };
  const { profiles } = useProfiles();
  const { maskDocument } = usePermissions();
  const [search, setSearch] = useState("");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">(() => {
    return (localStorage.getItem("clients_view_mode") as "list" | "card") || "list";
  });

  const filtered = useMemo(() => clients.filter((c: any) => {
    const matchesSearch = getClientDisplayName(c).toLowerCase().includes(search.toLowerCase());
    const matchesManager = managerFilter === "all" || c.responsible_id === managerFilter;
    const matchesActiveState = showInactive ? isInactiveStatus(c.status) : !isInactiveStatus(c.status);
    return matchesSearch && matchesManager && matchesActiveState;
  }), [clients, search, managerFilter, showInactive]);

  const inactiveCount = useMemo(() => clients.filter((c) => isInactiveStatus(c.status)).length, [clients]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, managerFilter, showInactive, viewMode]);
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const getActivePlan = (c: ClientRow) => {
    const active = (c.contracts || []).find((ct) => ct.status === "ativo");
    return active?.plans?.name || "—";
  };

  const getMrr = (c: ClientRow) => {
    return (c.contracts || [])
      .filter((ct) => ct.status === "ativo")
      .reduce((s, ct) => s + (Number(ct.value) || 0), 0);
  };

  const activeCount = clients.filter((c) => ["ativo", "active"].includes((c.status || "").toLowerCase())).length;

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Clientes"
        subtitle={`${activeCount} ativos · ${clients.length} total`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button
            onClick={() => navigate("/clientes/novo")}
            className="gradient-primary border-0 text-white font-semibold gap-2 rounded-full px-5"
          >
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.05] border-border rounded-xl h-10 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex-1 max-w-[200px]">
          <Select value={managerFilter} onValueChange={setManagerFilter}>
            <SelectTrigger className="bg-white/[0.05] border-border rounded-xl h-10 text-sm focus:ring-primary/20">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Gestor de Conta" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Gestores</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => setShowInactive(!showInactive)}
          variant="outline"
          className={`gap-2 rounded-xl h-10 px-4 text-sm border-border shrink-0 ${
            showInactive ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.05] text-muted-foreground hover:text-foreground"
          }`}
        >
          {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showInactive ? "Ver Ativos" : `Mostrar Inativos${inactiveCount > 0 ? ` (${inactiveCount})` : ""}`}
        </Button>

        <div className="flex items-center gap-1 bg-white/[0.04] border border-border rounded-lg p-0.5">
          <button
            onClick={() => { setViewMode("list"); localStorage.setItem("clients_view_mode", "list"); }}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Visualização em lista"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setViewMode("card"); localStorage.setItem("clients_view_mode", "card"); }}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Visualização em cards"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState variant="cards" rows={6} />
      ) : viewMode === "list" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-card rounded-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pacote</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1 cursor-pointer hover:text-foreground">MRR <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-0">
                    <EmptyState
                      title="Nenhum cliente encontrado"
                      description={search || managerFilter !== "all" ? "Ajuste a busca ou os filtros." : "Cadastre o primeiro cliente para começar."}
                      icon={<Users className="h-6 w-6" />}
                      action={
                        <Button onClick={() => navigate("/clientes/novo")} size="sm">
                          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
                        </Button>
                      }
                      className="m-4"
                    />
                  </td></tr>
                ) : paged.map((client) => {
                  const mrr = getMrr(client);
                  const displayName = getClientDisplayName(client);
                  const statusLabel = getClientStatusLabel(client.status);
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-border/50 hover:bg-white/[0.03] transition-colors cursor-pointer"
                      onClick={() => navigate(`/clientes/${client.id}`)}
                    >
                      <td className="p-4 font-medium text-primary cursor-pointer">{displayName}</td>
                      <td className="p-4 text-muted-foreground text-xs">{maskDocument(client.cnpj || client.document) || "—"}</td>
                      <td className="p-4">{getActivePlan(client)}</td>
                      <td className="p-4 font-heading">
                        {mrr > 0 ? `R$ ${mrr.toLocaleString("pt-BR")}` : "—"}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[client.status] || "status-paused"}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">{getClientSecondaryInfo(client)}</td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/clientes/${client.id}/editar`)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => openDelete(client)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />
        </motion.div>
      ) : (
        <>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="Nenhum cliente encontrado"
                description={search || managerFilter !== "all" ? "Ajuste a busca ou os filtros." : "Cadastre o primeiro cliente para começar."}
                icon={<Users className="h-6 w-6" />}
                action={
                  <Button onClick={() => navigate("/clientes/novo")} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Novo Cliente
                  </Button>
                }
              />
            </div>
          ) : paged.map((client, i) => {
            const mrr = getMrr(client);
            const displayName = getClientDisplayName(client);
            const statusLabel = getClientStatusLabel(client.status);
            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                onClick={() => navigate(`/clientes/${client.id}`)}
                className="glass-card rounded-xl p-5 cursor-pointer hover:bg-white/[0.04] transition-all hover:scale-[1.01] group relative"
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-lg hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/clientes/${client.id}/editar`)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => openDelete(client)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {getInitials(displayName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{displayName}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{maskDocument(client.cnpj || client.document) || "Sem documento"}</p>
                  </div>
                </div>

                {/* Status + MRR */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusConfig[client.status] || "status-paused"}`}>
                    {statusLabel}
                  </span>
                  {mrr > 0 ? (
                    <span className="text-xs font-heading font-semibold text-emerald-400">R$ {mrr.toLocaleString("pt-BR")}<span className="text-muted-foreground font-normal">/mês</span></span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Info rows */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {(client.contact_name || client.email) && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate">{client.contact_name || client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{getActivePlan(client)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        <PaginationControls page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />
        </>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleteBusy) closeDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteLinks && deleteLinks.total > 0 ? "Este cliente possui vínculos" : "Excluir cliente?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {!deleteLinks && <p>Verificando contratos, tarefas e lançamentos…</p>}
                {deleteLinks && deleteLinks.total === 0 && (
                  <p>
                    <span className="font-medium text-foreground">{deleteTarget ? getClientDisplayName(deleteTarget) : ""}</span>{" "}
                    será excluído permanentemente. Esta ação não pode ser desfeita.
                  </p>
                )}
                {deleteLinks && deleteLinks.total > 0 && (
                  <>
                    <p>
                      <span className="font-medium text-foreground">{deleteTarget ? getClientDisplayName(deleteTarget) : ""}</span>{" "}
                      não pode ser excluído porque outros registros dependem dele:
                    </p>
                    <ul className="list-disc pl-5">
                      {deleteLinks.contratos > 0 && <li>{deleteLinks.contratos} contrato(s)</li>}
                      {deleteLinks.lancamentos > 0 && <li>{deleteLinks.lancamentos} lançamento(s) financeiro(s)</li>}
                      {deleteLinks.tarefas > 0 && <li>{deleteLinks.tarefas} tarefa(s)</li>}
                      {deleteLinks.projetos > 0 && <li>{deleteLinks.projetos} projeto(s)</li>}
                      {deleteLinks.metas > 0 && <li>{deleteLinks.metas} meta(s)</li>}
                    </ul>
                    <p>
                      Desative o cliente: ele some das listagens e o histórico fica preservado.
                      Para excluir de vez, remova antes os vínculos acima.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            {deleteLinks && deleteLinks.total === 0 && (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); confirmDelete(); }}
                disabled={deleteBusy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            )}
            {deleteLinks && deleteLinks.total > 0 && (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); confirmDeactivate(); }}
                disabled={deleteBusy}
              >
                Desativar cliente
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
