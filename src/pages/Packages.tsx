import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Box, Plus, Loader2, Pencil, MoreHorizontal, Trash2, TrendingUp, Info, ListChecks, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePackages, PackageRow } from "@/hooks/usePackages";
import { useProducts } from "@/hooks/useProducts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

const formatCurrency = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "R$ 0,00";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

export default function Packages() {
  const { packages, loading, addPackage, updatePackage, deletePackage, addDeliveryItem, updateDeliveryItem, deleteDeliveryItem } = usePackages();
  const { products } = useProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);

  // Delivery items dialog
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [itemsPkg, setItemsPkg] = useState<PackageRow | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState("outro");
  const [newItemPriority, setNewItemPriority] = useState("media");
  const [savingItem, setSavingItem] = useState(false);

  const openItemsDialog = (pkg: PackageRow) => {
    setItemsPkg(packages.find(p => p.id === pkg.id) || pkg);
    setNewItemName(""); setNewItemType("outro"); setNewItemPriority("media");
    setItemsDialogOpen(true);
  };

  const handleAddItem = async () => {
    if (!itemsPkg || !newItemName.trim() || savingItem) return;
    setSavingItem(true);
    await addDeliveryItem(itemsPkg.id, { name: newItemName.trim(), task_type: newItemType, suggested_priority: newItemPriority });
    // Refresh local reference from updated packages list
    setNewItemName("");
    setSavingItem(false);
  };

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<{product_id: string, quantity: number, unit_price: number, discount: number}[]>([]);
  const [totalSale, setTotalSale] = useState(0);

  const openNew = () => {
    setEditing(null);
    setName(""); setDescription(""); setSelectedItems([]); setTotalSale(0);
    setDialogOpen(true);
  };

  const openEdit = (p: PackageRow) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || "");
    setSelectedItems([]);
    setTotalSale(Number(p.price) || 0);
    setDialogOpen(true);
  };

  // Calculations
  const metrics = useMemo(() => {
    let cost = 0;
    let sale = 0;
    (selectedItems || []).forEach(item => {
      const prod = (products || []).find(pr => pr.id === item.product_id);
      cost += (Number(prod?.cost) || 0) * item.quantity;
      sale += item.unit_price * item.quantity;
    });

    const profit = totalSale - cost;
    const margin = totalSale > 0 ? (profit / totalSale) * 100 : 0;

    return { totalCost: cost, totalBaseSale: sale, profit, margin };
  }, [selectedItems, products, totalSale]);

  const handleToggleProduct = (productId: string, checked: boolean) => {
    if (checked) {
      const prod = (products || []).find(p => p.id === productId);
      const newItems = [...(selectedItems || []), { 
        product_id: productId, 
        quantity: 1, 
        unit_price: Number((prod as any)?.price_package) || Number(prod?.price) || 0,
        discount: 0
      }];
      setSelectedItems(newItems);
      setTotalSale(newItems.reduce((acc, curr) => acc + (curr.unit_price * curr.quantity), 0));
    } else {
      const newItems = (selectedItems || []).filter(i => i.product_id !== productId);
      setSelectedItems(newItems);
      setTotalSale(newItems.reduce((acc, curr) => acc + (curr.unit_price * curr.quantity), 0));
    }
  };

  const handleUpdateItem = (productId: string, field: string, val: any) => {
    const newItems = (selectedItems || []).map(item => {
      if (item.product_id === productId) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setSelectedItems(newItems);
    if (field === 'unit_price' || field === 'quantity') {
      setTotalSale(newItems.reduce((acc, curr) => acc + (curr.unit_price * curr.quantity), 0));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const values = {
      name,
      description: description || null,
      price: totalSale,
    };

    if (editing) {
      const ok = await updatePackage(editing.id, values);
      if (ok) setDialogOpen(false);
    } else {
      const ok = await addPackage(values);
      if (ok) setDialogOpen(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Módulo de Pacotes</h1>
          <p className="text-sm text-muted-foreground mt-1">Precificação inteligente e gestão de lucratividade</p>
        </div>
        <Button onClick={openNew} className="gradient-primary border-0 text-white font-semibold gap-2 rounded-full px-5">
          <Plus className="h-4 w-4" /> Novo Pacote
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary/30" />
        </div>
      ) : (packages || []).length === 0 ? (
        <div className="text-center py-20 text-muted-foreground/50 border-2 border-dashed rounded-2xl">
          <Box className="h-12 w-12 mx-auto mb-4 opacity-10" />
          Nenhum pacote estratégico cadastrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(packages || []).map((pkg) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Box className="h-16 w-16" />
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Box className="h-5 w-5" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(pkg)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openItemsDialog(pkg)}><ListChecks className="h-4 w-4 mr-2" /> Gerenciar Entregas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deletePackage(pkg.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="text-lg font-bold mb-1">{pkg.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{pkg.description || "Sem descrição"}</p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor (Mensal):</span>
                  <span className="font-bold text-primary">{formatCurrency(pkg.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequência:</span>
                  <span className="text-muted-foreground">{pkg.billing_cycle || "mensal"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <button
                  onClick={() => openItemsDialog(pkg)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  {(pkg as any).items?.length || 0} {(pkg as any).items?.length === 1 ? "entrega" : "entregas"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delivery Items Dialog */}
      <Dialog open={itemsDialogOpen} onOpenChange={open => {
        setItemsDialogOpen(open);
        if (!open) setItemsPkg(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle className="text-xl font-heading flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Itens de Entrega — {itemsPkg?.name}
            </DialogTitle>
            <DialogDescription>
              Estes itens serão gerados automaticamente nos checklists de entrega ao ativar um contrato com este pacote.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            {/* Existing items list */}
            {(() => {
              const currentPkg = packages.find(p => p.id === itemsPkg?.id);
              const items = currentPkg?.items || [];
              return items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/50 border-2 border-dashed rounded-xl text-sm">
                  Nenhum item de entrega cadastrado
                </div>
              ) : (
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors group">
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{(item as any).task_type || "outro"}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{(item as any).suggested_priority || "media"}</span>
                      <button
                        onClick={() => deleteDeliveryItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        title="Remover item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Add new item form */}
            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Adicionar novo item</Label>
              <div className="flex gap-2">
                <Input
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Ex: Relatório mensal de performance..."
                  className="flex-1"
                  onKeyDown={e => e.key === "Enter" && handleAddItem()}
                />
              </div>
              <div className="flex gap-2">
                <Select value={newItemType} onValueChange={setNewItemType}>
                  <SelectTrigger className="flex-1 h-9 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conteudo">Conteúdo</SelectItem>
                    <SelectItem value="trafego">Tráfego</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="relatorio">Relatório</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newItemPriority} onValueChange={setNewItemPriority}>
                  <SelectTrigger className="flex-1 h-9 text-xs">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim() || savingItem}
                  className="gradient-primary border-0 text-white gap-1.5 rounded-xl px-4 h-9 text-xs font-semibold"
                >
                  {savingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border flex justify-end">
            <Button variant="outline" onClick={() => setItemsDialogOpen(false)} className="rounded-full">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-heading">{editing ? "Editar Pacote" : "Criar Novo Pacote"}</DialogTitle>
            <DialogDescription>Personalize e valide a lucratividade deste pacote de serviços.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Pacote</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pacote Business Gold" />
              </div>
              <div />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Destaque os benefícios deste pacote..." className="resize-none" rows={2} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-primary font-bold">Composição do Pacote</Label>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> Selecione os produtos que compõem este pacote.
                </div>
              </div>
              
              <div className="border rounded-xl overflow-hidden bg-accent/20">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Produto/Serviço</TableHead>
                      <TableHead className="w-20 text-center">Qtd.</TableHead>
                      <TableHead className="w-32 text-right">Preço Un.</TableHead>
                      <TableHead className="w-32 text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(products || []).filter(p => p.is_active).map((p) => {
                      const isSelected = (selectedItems || []).find(it => it.product_id === p.id);
                      return (
                        <TableRow key={p.id} className={isSelected ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox 
                              checked={!!isSelected} 
                              onCheckedChange={(checked) => handleToggleProduct(p.id, checked === true)} 
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground">Custo: {formatCurrency(p.cost)}</div>
                          </TableCell>
                          <TableCell>
                            {isSelected && (
                              <Input 
                                type="number" 
                                value={isSelected.quantity} 
                                onChange={(e) => handleUpdateItem(p.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-7 w-12 mx-auto px-1 text-center text-xs"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSelected && (
                               <div className="flex items-center justify-end">
                                 <span className="text-[10px] mr-1 text-muted-foreground">R$</span>
                                 <input 
                                   type="number" 
                                   value={isSelected.unit_price} 
                                   onChange={(e) => handleUpdateItem(p.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                   className="bg-transparent text-right w-20 border-b border-border/50 outline-none h-6 text-xs hover:border-primary focus:border-primary"
                                 />
                               </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {isSelected ? formatCurrency(isSelected.quantity * isSelected.unit_price) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-accent/50 border-t border-border mt-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 items-center">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Custo Total</span>
                <div className="text-lg font-bold">{formatCurrency(metrics.totalCost)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Valor Sugerido (+30%)</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.totalCost * 1.3)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Valor de Venda Final</Label>
                <Input 
                  type="number" 
                  value={totalSale} 
                  onChange={(e) => setTotalSale(parseFloat(e.target.value) || 0)}
                  className="h-10 text-lg font-bold text-primary border-primary/20 bg-primary/5" 
                />
              </div>
              <div className="rounded-xl bg-primary shadow-lg p-4 text-primary-foreground space-y-1">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold opacity-80">
                  <span>Margem Bruta</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black">{Math.round(metrics.margin)}%</div>
              </div>
            </div>
            
            <DialogFooter className="mt-8 border-t border-border/20 pt-4 px-0">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-full">Cancelar</Button>
              <Button 
                onClick={handleSave} 
                disabled={!name.trim()} 
                className="gradient-primary border-0 text-white font-bold rounded-full px-10"
              >
                {editing ? "Salvar Alterações" : "Criar Pacote"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
