import { useState } from "react";
import { motion } from "framer-motion";
import { Package, TrendingUp, Plus, Loader2, Pencil, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProducts, useProductTypes, ProductRow } from "@/hooks/useProducts";
import { QuickAddDialog } from "@/components/shared/QuickAddDialog";

const formatCurrency = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "";
  const strValue = typeof value === 'number' ? value.toFixed(2) : String(value);
  const numericValue = strValue.replace(/\D/g, "");
  if (!numericValue) return "";
  const floatValue = parseInt(numericValue, 10) / 100;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(floatValue);
};

const parseCurrency = (value: string) => {
  if (!value) return null;
  const numericValue = value.replace(/\D/g, "");
  return numericValue ? parseInt(numericValue, 10) / 100 : null;
};

export default function Products() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const productTypes = useProductTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricePackage, setPricePackage] = useState("");
  const [cost, setCost] = useState("");
  const [typeId, setTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [profMonthlyCost, setProfMonthlyCost] = useState("");
  const [monthlyHours, setMonthlyHours] = useState("160");
  const [timeSpent, setTimeSpent] = useState("");
  const [quickAddTypeOpen, setQuickAddTypeOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setName(""); setDescription(""); setPrice(""); setPricePackage(""); setCost(""); setTypeId(""); setNotes("");
    setProfMonthlyCost(""); setMonthlyHours("160"); setTimeSpent("");
    setDialogOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || "");
    setPrice(formatCurrency(p.price));
    setPricePackage(formatCurrency((p as any).price_package));
    setCost(formatCurrency(p.cost));
    setTypeId(p.product_type_id || "");
    setNotes((p as any).notes || "");
    setProfMonthlyCost(formatCurrency((p as any).professional_monthly_cost));
    setMonthlyHours((p as any).monthly_hours_worked?.toString() || "160");
    setTimeSpent((p as any).time_spent_hours?.toString() || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const values: any = {
      name,
      description: description || null,
      price: parseCurrency(price),
      price_package: parseCurrency(pricePackage),
      cost: parseCurrency(cost),
      product_type_id: typeId || null,
      notes: notes || null,
      professional_monthly_cost: parseCurrency(profMonthlyCost),
      monthly_hours_worked: parseFloat(monthlyHours) || 160,
      time_spent_hours: parseFloat(timeSpent) || 0,
    };
    if (editing) {
      const ok = await updateProduct(editing.id, values);
      if (ok) setDialogOpen(false);
    } else {
      const ok = await addProduct(values);
      if (ok) setDialogOpen(false);
    }
  };

  const calculateEffortCost = () => {
    const monthlyCostInput = parseCurrency(profMonthlyCost) || 0;
    const hoursWorkedInput = parseFloat(monthlyHours) || 160;
    const timeSpentInput = parseFloat(timeSpent) || 0;
    
    if (monthlyCostInput > 0 && hoursWorkedInput > 0 && timeSpentInput > 0) {
      const hourlyRate = monthlyCostInput / hoursWorkedInput;
      const totalCost = hourlyRate * timeSpentInput;
      setCost(formatCurrency(totalCost));
    }
  };

  const activeProducts = products.filter(p => p.is_active);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Produtos e Serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeProducts.length} ativos · {products.length} total</p>
        </div>
        <Button onClick={openNew} className="gradient-primary border-0 text-white font-semibold gap-2 rounded-full px-5">
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : activeProducts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground/50">Nenhum produto cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeProducts.map((product) => {
            const priceVal = Number(product.price) || 0;
            const pricePackageVal = Number((product as any).price_package) || 0;
            const costVal = Number(product.cost) || 0;
            const margin = priceVal > 0 ? Math.round(((priceVal - costVal) / priceVal) * 100) : 0;
            const typeName = (product.product_types as any)?.name || "—";

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-xl p-5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-full border border-border bg-accent">
                      {typeName}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(product)} className="text-xs">
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteProduct(product.id)} className="text-xs text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <h3 className="font-semibold mb-1 line-clamp-1">{product.name}</h3>
                {product.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-3 min-h-[3rem]">{product.description}</p>}
                <div className="grid grid-cols-2 gap-3 text-center mb-2">
                  <div>
                    <div className="font-heading text-sm font-bold">
                      {priceVal > 0 ? `R$ ${priceVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Preço Avulso</div>
                  </div>
                  <div>
                    <div className="font-heading text-sm font-bold text-primary">
                      {pricePackageVal > 0 ? `R$ ${pricePackageVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Preço Pacote</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="font-heading text-sm font-bold">
                      {costVal > 0 ? `R$ ${costVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Custo</div>
                  </div>
                  <div>
                    <div className="font-heading text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                      {priceVal > 0 ? <><TrendingUp className="h-3 w-3" /> {margin}%</> : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Margem</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>Preencha as informações do produto ou serviço.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="geral" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
              <TabsTrigger value="precificacao" className="flex-1">Precificação</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto/serviço" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição breve" rows={2} className="resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  Categoria
                  <Button type="button" variant="ghost" size="icon" className="h-4 w-4 text-primary" onClick={() => setQuickAddTypeOpen(true)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </Label>
                <Select value={typeId} onValueChange={setTypeId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                  <SelectContent>
                    {productTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas..." rows={2} className="resize-none" />
              </div>
            </TabsContent>

            <TabsContent value="precificacao" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Preço Avulso</Label>
                  <Input type="text" value={price} onChange={(e) => setPrice(formatCurrency(e.target.value))} placeholder="R$ 0,00" />
                  <p className="text-[10px] text-muted-foreground">Preço quando vendido individualmente</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Preço no Pacote</Label>
                  <Input type="text" value={pricePackage} onChange={(e) => setPricePackage(formatCurrency(e.target.value))} placeholder="R$ 0,00" />
                  <p className="text-[10px] text-muted-foreground">Preço quando incluído em um pacote</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-accent/30 p-4 space-y-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3">
                  <TrendingUp className="h-4 w-4 text-primary/20" />
                </div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Calculadora de Custo (Esforço Humano)
                </h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Custo Mensal Prof.</Label>
                    <Input 
                      type="text" 
                      value={profMonthlyCost} 
                      onChange={(e) => setProfMonthlyCost(formatCurrency(e.target.value))} 
                      onBlur={calculateEffortCost}
                      placeholder="R$ 0,00" 
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Horas Totais/Mês</Label>
                    <Input 
                      type="number" 
                      value={monthlyHours} 
                      onChange={(e) => setMonthlyHours(e.target.value)} 
                      onBlur={calculateEffortCost}
                      placeholder="160" 
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Tempo no Prod. (h)</Label>
                    <Input 
                      type="number" 
                      value={timeSpent} 
                      onChange={(e) => setTimeSpent(e.target.value)} 
                      onBlur={calculateEffortCost}
                      placeholder="8" 
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * O custo do produto será automaticamente calculado com base no valor da hora do profissional.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Custo Final (Mercado/Insumos)</Label>
                <div className="flex gap-2">
                  <Input type="text" value={cost} onChange={(e) => setCost(formatCurrency(e.target.value))} placeholder="R$ 0,00" className="flex-1" />
                </div>
                <p className="text-[10px] text-muted-foreground">Custo total para a empresa produzir/entregar este item.</p>
              </div>

              {/* Pricing summary */}
              {(parseCurrency(price) || parseCurrency(cost)) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">Indicadores de Lucratividade</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Margem Avulso:</span>
                        {parseCurrency(price) && parseCurrency(cost) && (
                          <span className={`font-bold ${((parseCurrency(price)! - parseCurrency(cost)!) / parseCurrency(price)!) > 0.3 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {Math.round(((parseCurrency(price)! - parseCurrency(cost)!) / parseCurrency(price)!) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Margem Pacote:</span>
                        {parseCurrency(pricePackage) && parseCurrency(cost) && (
                          <span className={`font-bold ${((parseCurrency(pricePackage)! - parseCurrency(cost)!) / parseCurrency(pricePackage)!) > 0.2 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {Math.round(((parseCurrency(pricePackage)! - parseCurrency(cost)!) / parseCurrency(pricePackage)!) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Lucro Líquido:</span>
                        {parseCurrency(price) && parseCurrency(cost) && (
                          <span className="font-bold">
                            R$ {(parseCurrency(price)! - parseCurrency(cost)!).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()} className="gradient-primary border-0 text-white font-semibold rounded-full px-6">
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <QuickAddDialog
        open={quickAddTypeOpen}
        onOpenChange={setQuickAddTypeOpen}
        registryKey="categorias_produto"
        title="Nova Categoria de Produto"
        onSuccess={(id) => { setTypeId(id); }}
      />
    </div>
  );
}
