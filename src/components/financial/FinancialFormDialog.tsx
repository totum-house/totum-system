import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useFinancialFormLookups, useClientContractsByClientId, useCreateFinancialEntry } from "@/hooks/useFinancialFormLookups";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { getClientDisplayName } from "@/lib/clients";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function FinancialFormDialog({ open, onOpenChange, onCreated }: Props) {
  const { categories, costCenters, expenseTypes, clients } = useFinancialFormLookups(open);
  const { createEntries } = useCreateFinancialEntry();
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [entryClass, setEntryClass] = useState("receita");
  const [nature, setNature] = useState("fixo");
  const [categoryId, setCategoryId] = useState("");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [installments, setInstallments] = useState("1");
  const [costCenterId, setCostCenterId] = useState("");
  const [expenseTypeId, setExpenseTypeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const contracts = useClientContractsByClientId(clientId || null);
  const [interval, setIntervalValue] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setCategoryId("");
  }, [entryClass]);

  useEffect(() => {
    if (!clientId || clientId === "none") setContractId("");
  }, [clientId]);

  const resetForm = () => {
    setDescription(""); setEntryClass("receita"); setNature("fixo"); setCategoryId(""); setValue("");
    setDueDate(""); setInstallments("1"); setIntervalValue("1");
    setCostCenterId(""); setExpenseTypeId(""); setClientId(""); setContractId(""); setNotes("");
  };

  const handleSave = async () => {
    if (!description.trim() || !value || !dueDate) {
      toast({ title: "Campos obrigatórios", description: "Preencha descrição, valor e vencimento.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const numInstallments = Math.max(1, parseInt(installments) || 1);
    const totalValue = parseFloat(value);
    const installmentValue = Math.round((totalValue / numInstallments) * 100) / 100;

    try {
      const dbType = entryClass === "receita" ? "receber" : "pagar";
      const intervalMonths = Math.max(1, parseInt(interval) || 1);
      const { data: { user } } = await supabase.auth.getUser();
      const entries: TablesInsert<"financial_entries">[] = [];

      for (let i = 0; i < numInstallments; i++) {
        const date = addMonths(parseISO(dueDate), i * intervalMonths);
        entries.push({
          description: numInstallments > 1 ? `${description.trim()} (${i + 1}/${numInstallments})` : description.trim(),
          type: dbType,
          entry_class: entryClass,
          nature,
          category_id: categoryId || null,
          cost_center_id: costCenterId || null,
          client_id: !clientId || clientId === "none" ? null : clientId,
          contract_id: !contractId || contractId === "none" ? null : contractId,
          value: installmentValue,
          due_date: format(date, "yyyy-MM-dd"),
          status: "pendente" as const,
          recurrence: numInstallments > 1 ? "parcelada" as const : "unica" as const,
          installment_number: numInstallments > 1 ? i + 1 : null,
          total_installments: numInstallments > 1 ? numInstallments : null,
          notes: notes.trim() || null,
          created_by: user?.id || null,
        });
      }

      const errMsg = await createEntries(entries);
      if (errMsg) throw new Error(errMsg);

      toast({ title: "Lançamento criado", description: numInstallments > 1 ? `${numInstallments} parcelas geradas` : undefined });
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c => {
    if (entryClass === "receita") return c.type === "receber" || c.type === "receita";
    return c.type === "pagar" || c.type === "despesa";
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
          <DialogDescription className="text-muted-foreground">Crie um lançamento financeiro.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mensalidade cliente X" className="bg-white/[0.04] border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={entryClass} onValueChange={setEntryClass}>
                <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="custo">Custo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground">Nenhuma categoria para este tipo</div>
                  ) : (
                    filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor Total *</Label>
              <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" className="bg-white/[0.04] border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-white/[0.04] border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Natureza</Label>
              <Select value={nature} onValueChange={setNature}>
                <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{getClientDisplayName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contrato</Label>
            <Select value={contractId} onValueChange={setContractId} disabled={!clientId || clientId === "none"}>
              <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {contracts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.plans?.name || "Contrato"} {c.value ? `· R$ ${Number(c.value).toLocaleString("pt-BR")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Centro de Custo</Label>
              <Select value={costCenterId} onValueChange={setCostCenterId}>
                <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {costCenters.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Despesa</Label>
              <Select value={expenseTypeId} onValueChange={setExpenseTypeId} disabled={entryClass === "receita"}>
                <SelectTrigger className="bg-white/[0.04] border-border"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {expenseTypes.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Input type="number" min="1" max="48" value={installments} onChange={e => setInstallments(e.target.value)} className="bg-white/[0.04] border-border" />
            </div>
            {parseInt(installments) > 1 && (
              <div className="space-y-1.5">
                <Label>Intervalo (meses)</Label>
                <Input type="number" min="1" max="12" value={interval} onChange={e => setIntervalValue(e.target.value)} className="bg-white/[0.04] border-border" />
              </div>
            )}
          </div>

          {parseInt(installments) > 1 && value && (
            <p className="text-xs text-muted-foreground">
              {installments}x de R$ {(parseFloat(value) / parseInt(installments)).toFixed(2)} — Intervalo de {interval} mês(es).
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas..." className="bg-white/[0.04] border-border resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white border-0">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
