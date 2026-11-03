import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClientDisplayName } from "@/lib/clients";

export interface ProductOption {
  id: string;
  name: string;
  price: number | null;
  product_types: { name: string } | null;
}

export interface ContractFormData {
  clients: any[];
  plans: { id: string; name: string; value: number | null; frequency: string | null }[];
  contractTypes: { id: string; name: string }[];
  packages: { id: string; name: string; total_sale: number | null }[];
  products: ProductOption[];
  loading: boolean;
}

export function useContractFormData(open: boolean): ContractFormData {
  const [clients, setClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<{ id: string; name: string; value: number | null; frequency: string | null }[]>([]);
  const [contractTypes, setContractTypes] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string; total_sale: number | null }[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.from("clients").select("*"),
      // plans em produção tem price/billing_cycle (baseline); o form continua lendo value/frequency
      supabase.from("plans").select("id, name, price, billing_cycle").eq("is_active", true).order("name"),
      supabase.from("contract_types").select("id, name").eq("is_active", true).order("name"),
      supabase.from("plans").select("id, name, price, billing_cycle").eq("is_active", true).order("name"),
      supabase.from("products").select("id, name, price, product_types(name)").eq("is_active", true).order("name"),
    ]).then(([c, p, ct, pkg, pr]) => {
      const activeClients = ((c.data as any[]) || [])
        .filter((client) => ["ativo", "active"].includes((client.status || "").toLowerCase()))
        .sort((a: any, b: any) => getClientDisplayName(a).localeCompare(getClientDisplayName(b), "pt-BR"));
      setClients(activeClients);
      setPlans((p.data || []).map((plan) => ({ id: plan.id, name: plan.name, value: plan.price, frequency: plan.billing_cycle })));
      setContractTypes(ct.data || []);
      setPackages((pkg.data || []).map((p) => ({ id: p.id, name: p.name, total_sale: p.price })));
      setProducts((pr.data as any) || []);
      setLoading(false);
    });
  }, [open]);

  return { clients, plans, contractTypes, packages, products, loading };
}
