/**
 * Serviço de integração com a API do Asaas (v3)
 * Baseado na documentação oficial: https://docs.asaas.com/
 * Gerencia clientes, cobranças, assinaturas e webhooks
 */

import { supabase } from "@/integrations/supabase/client";
import { generateChecklistForClient } from "./checklistService";

// URL base da Edge Function proxy (resolve CORS)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ASAAS_PROXY_URL = `${SUPABASE_URL}/functions/v1/asaas-proxy`;

// ─── TIPOS (baseados na API oficial Asaas v3) ─────────────────────────────────

export interface AsaasConfig {
  id: string;
  api_key: string;
  environment: "sandbox" | "production";
  webhook_token: string | null;
  is_active: boolean;
  sync_clients: boolean;
  sync_payments: boolean;
  auto_create_financial: boolean;
  default_billing_type: AsaasBillingType;
}

export type AsaasBillingType = "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasSubscriptionCycle = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY";

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  cityName?: string;
  state?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  observations?: string;
  company?: string;
}

export interface AsaasDiscount {
  value: number;
  dueDateLimitDays?: number;
  type: "FIXED" | "PERCENTAGE";
}

export interface AsaasInterest {
  value: number; // percentual mensal
}

export interface AsaasFine {
  value: number; // percentual
  type?: "FIXED" | "PERCENTAGE";
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  netValue?: number;
  dueDate: string;
  description?: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixTransaction?: {
    qrCode?: string;
    pixQrCodeUrl?: string;
  };
  externalReference?: string;
  subscription?: string;
  paymentDate?: string;
  installment?: string;
  discount?: AsaasDiscount;
  interest?: AsaasInterest;
  fine?: AsaasFine;
}

export interface CreatePaymentInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  totalValue?: number;
  discount?: AsaasDiscount;
  interest?: AsaasInterest;
  fine?: AsaasFine;
  postalService?: boolean;
}

export interface CreateSubscriptionInput {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: AsaasSubscriptionCycle;
  description?: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
  discount?: AsaasDiscount;
  interest?: AsaasInterest;
  fine?: AsaasFine;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: AsaasSubscriptionCycle;
  description?: string;
  status: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  errors: string[];
}

// ─── HELPER: CHAMADAS À API VIA PROXY ─────────────────────────────────────────

async function asaasRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  apiKey: string,
  body?: object,
  environment: "production" | "sandbox" = "production"
): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${ASAAS_PROXY_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Bearer ${session?.access_token || ""}`,
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      "x-asaas-key": apiKey,
      "x-asaas-env": environment,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.errors?.[0]?.description || err.message || `Erro ${res.status}`);
  }

  return res.json();
}

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────

export async function getAsaasConfig(): Promise<AsaasConfig | null> {
  const { data } = await supabase
    .from("asaas_config")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();
  return data as AsaasConfig | null;
}

export async function saveAsaasConfig(config: Partial<AsaasConfig>): Promise<void> {
  const { data: existing } = await supabase
    .from("asaas_config")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    await supabase.from("asaas_config").update({ ...config, updated_at: new Date().toISOString() } as any).eq("id", existing.id);
  } else {
    await supabase.from("asaas_config").insert(config as any);
  }
}

export async function testAsaasConnection(apiKey: string, environment: "production" | "sandbox" = "production"): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const data = await asaasRequest("GET", "/myAccount", apiKey, undefined, environment);
    return { ok: true, name: data.name || data.commercialName };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

/**
 * Linha de asaas_customers pelo id do cliente no Asaas (coluna asaas_id).
 * asaas_payments/asaas_subscriptions.asaas_customer_id é uuid → asaas_customers.id,
 * então quem insere cobrança/assinatura resolve o uuid aqui em vez de gravar o
 * id textual do Asaas (B-039).
 */
async function findAsaasCustomerRow(asaasCustomerId: string) {
  const { data } = await supabase
    .from("asaas_customers")
    .select("id, client_id, organization_id")
    .eq("asaas_id", asaasCustomerId)
    .maybeSingle();
  return data;
}

export async function syncClientToAsaas(
  clientId: string,
  apiKey: string,
  environment: "production" | "sandbox" = "production"
): Promise<{ asaasId: string; created: boolean }> {
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) throw new Error("Cliente não encontrado");

  const { data: existing } = await supabase
    .from("asaas_customers")
    .select("asaas_id")
    .eq("client_id", clientId)
    .maybeSingle();

  const customerPayload: Partial<AsaasCustomer> = {
    name: client.name,
    email: client.email || undefined,
    mobilePhone: client.phone?.replace(/\D/g, "") || undefined,
    cpfCnpj: client.document?.replace(/\D/g, "") || undefined,
    externalReference: clientId,
    observations: client.notes || undefined,
  };

  const customerRow = {
    name: client.name,
    email: client.email || null,
    cpf_cnpj: client.document?.replace(/\D/g, "") || null,
    organization_id: client.organization_id ?? null,
  };

  if (existing?.asaas_id) {
    await asaasRequest("PUT", `/customers/${existing.asaas_id}`, apiKey, customerPayload, environment);
    await supabase.from("asaas_customers").update({
      ...customerRow,
      synced_at: new Date().toISOString(),
      sync_status: "synced",
      error_message: null,
    }).eq("client_id", clientId);
    return { asaasId: existing.asaas_id, created: false };
  } else {
    const created = await asaasRequest("POST", "/customers", apiKey, customerPayload, environment);
    await supabase.from("asaas_customers").insert({
      ...customerRow,
      client_id: clientId,
      asaas_id: created.id,
      sync_status: "synced",
      synced_at: new Date().toISOString(),
    });
    return { asaasId: created.id, created: true };
  }
}

export async function syncAllClientsToAsaas(apiKey: string, environment: "production" | "sandbox" = "production"): Promise<SyncResult> {
  const result: SyncResult = { success: true, created: 0, updated: 0, errors: [] };

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, document, notes, organization_id")
    .eq("status", "ativo");

  if (!clients?.length) return result;

  for (const client of clients) {
    try {
      const { created } = await syncClientToAsaas(client.id, apiKey, environment);
      if (created) result.created++;
      else result.updated++;
    } catch (e: any) {
      result.errors.push(`${client.name}: ${e.message}`);
      await supabase.from("asaas_customers").upsert({
        client_id: client.id,
        asaas_id: `error_${client.id}`,
        name: client.name,
        organization_id: client.organization_id ?? null,
        sync_status: "error",
        error_message: e.message,
      }, { onConflict: "client_id" });
    }
  }

  if (result.errors.length > 0) result.success = false;
  return result;
}

// ─── COBRANÇAS ────────────────────────────────────────────────────────────────

export async function createAsaasPayment(
  input: CreatePaymentInput,
  apiKey: string,
  contractId?: string,
  clientId?: string,
  environment: "production" | "sandbox" = "production"
): Promise<AsaasPayment> {
  const payment = await asaasRequest("POST", "/payments", apiKey, input, environment);
  const customer = await findAsaasCustomerRow(input.customer);

  // Salvar no banco (asaas_payment_id é coluna gerada a partir de asaas_id)
  await supabase.from("asaas_payments").insert({
    asaas_id: payment.id,
    asaas_customer_id: customer?.id ?? null,
    client_id: clientId || customer?.client_id || null,
    contract_id: contractId || null,
    organization_id: customer?.organization_id ?? null,
    value: payment.value,
    net_value: payment.netValue,
    billing_type: payment.billingType,
    status: payment.status,
    due_date: payment.dueDate,
    description: payment.description,
    invoice_url: payment.invoiceUrl,
    bank_slip_url: payment.bankSlipUrl,
    pix_qr_code: payment.pixTransaction?.qrCode || null,
    pix_qr_code_url: payment.pixTransaction?.pixQrCodeUrl || null,
    external_reference: input.externalReference,
    installment_count: input.installmentCount || null,
    installment_value: input.installmentValue || null,
    discount_value: input.discount?.value || null,
    discount_type: input.discount?.type || null,
    interest_value: input.interest?.value || null,
    fine_value: input.fine?.value || null,
    asaas_subscription_id: payment.subscription || null,
  } as any);

  return payment;
}

export async function getAsaasPaymentStatus(paymentId: string, apiKey: string, environment: "production" | "sandbox" = "production"): Promise<any> {
  return asaasRequest("GET", `/payments/${paymentId}/status`, apiKey, undefined, environment);
}

export async function getAsaasPixQrCode(paymentId: string, apiKey: string, environment: "production" | "sandbox" = "production"): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
  return asaasRequest("GET", `/payments/${paymentId}/pixQrCode`, apiKey, undefined, environment);
}

export async function deleteAsaasPayment(paymentId: string, apiKey: string, environment: "production" | "sandbox" = "production"): Promise<void> {
  await asaasRequest("DELETE", `/payments/${paymentId}`, apiKey, undefined, environment);
  await supabase.from("asaas_payments").update({ status: "DELETED" } as any).eq("asaas_payment_id", paymentId);
}

export async function refundAsaasPayment(paymentId: string, apiKey: string, value?: number, environment: "production" | "sandbox" = "production"): Promise<void> {
  const body = value ? { value } : undefined;
  await asaasRequest("POST", `/payments/${paymentId}/refund`, apiKey, body, environment);
  await supabase.from("asaas_payments").update({ status: "REFUNDED" } as any).eq("asaas_payment_id", paymentId);
}

export async function getAsaasPaymentsByClient(
  asaasCustomerId: string,
  apiKey: string,
  environment: "production" | "sandbox" = "production"
): Promise<AsaasPayment[]> {
  const data = await asaasRequest("GET", `/payments?customer=${asaasCustomerId}&limit=50`, apiKey, undefined, environment);
  return data.data || [];
}

export async function syncPaymentsFromAsaas(apiKey: string, environment: "production" | "sandbox" = "production"): Promise<SyncResult> {
  const result: SyncResult = { success: true, created: 0, updated: 0, errors: [] };

  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().split("T")[0];

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await asaasRequest(
        "GET",
        `/payments?dateCreated[ge]=${sinceStr}&limit=100&offset=${offset}`,
        apiKey, undefined, environment
      );

      for (const payment of data.data || []) {
        const mapping = await findAsaasCustomerRow(payment.customer);

        const { data: existing } = await supabase
          .from("asaas_payments")
          .select("id")
          .eq("asaas_payment_id", payment.id)
          .maybeSingle();

        const paymentData = {
          asaas_customer_id: mapping?.id ?? null,
          client_id: mapping?.client_id || null,
          organization_id: mapping?.organization_id ?? null,
          value: payment.value,
          net_value: payment.netValue,
          billing_type: payment.billingType,
          status: payment.status,
          due_date: payment.dueDate,
          payment_date: payment.paymentDate || null,
          description: payment.description,
          invoice_url: payment.invoiceUrl,
          bank_slip_url: payment.bankSlipUrl,
          pix_qr_code: payment.pixTransaction?.qrCode || null,
          pix_qr_code_url: payment.pixTransaction?.pixQrCodeUrl || null,
          asaas_subscription_id: payment.subscription || null,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from("asaas_payments").update(paymentData as any).eq("asaas_payment_id", payment.id);
          result.updated++;
        } else {
          await supabase.from("asaas_payments").insert({
            asaas_id: payment.id,
            ...paymentData,
          } as any);
          result.created++;
        }
      }

      hasMore = data.hasMore;
      offset += 100;
    }
  } catch (e: any) {
    result.success = false;
    result.errors.push(e.message);
  }

  return result;
}

// ─── ASSINATURAS (SUBSCRIPTIONS) ──────────────────────────────────────────────

export async function createAsaasSubscription(
  input: CreateSubscriptionInput,
  apiKey: string,
  contractId?: string,
  clientId?: string,
  environment: "production" | "sandbox" = "production"
): Promise<AsaasSubscription> {
  const subscription = await asaasRequest("POST", "/subscriptions", apiKey, input, environment);
  const customer = await findAsaasCustomerRow(input.customer);

  // asaas_subscription_id é coluna gerada a partir de asaas_id
  await supabase.from("asaas_subscriptions").insert({
    asaas_id: subscription.id,
    asaas_customer_id: customer?.id ?? null,
    client_id: clientId || customer?.client_id || null,
    contract_id: contractId || null,
    organization_id: customer?.organization_id ?? null,
    billing_type: subscription.billingType,
    value: subscription.value,
    cycle: subscription.cycle,
    next_due_date: subscription.nextDueDate,
    end_date: input.endDate || null,
    max_payments: input.maxPayments || null,
    description: subscription.description,
    external_reference: input.externalReference,
    status: subscription.status || "ACTIVE",
    discount_value: input.discount?.value || null,
    discount_type: input.discount?.type || null,
    interest_value: input.interest?.value || null,
    fine_value: input.fine?.value || null,
  } as any);

  return subscription;
}

export async function listAsaasSubscriptions(
  apiKey: string,
  customerId?: string,
  environment: "production" | "sandbox" = "production"
): Promise<AsaasSubscription[]> {
  const path = customerId
    ? `/subscriptions?customer=${customerId}&limit=50`
    : `/subscriptions?limit=50`;
  const data = await asaasRequest("GET", path, apiKey, undefined, environment);
  return data.data || [];
}

export async function updateAsaasSubscription(
  subscriptionId: string,
  updates: Partial<CreateSubscriptionInput>,
  apiKey: string,
  environment: "production" | "sandbox" = "production"
): Promise<AsaasSubscription> {
  return asaasRequest("PUT", `/subscriptions/${subscriptionId}`, apiKey, updates, environment);
}

export async function deleteAsaasSubscription(
  subscriptionId: string,
  apiKey: string,
  environment: "production" | "sandbox" = "production"
): Promise<void> {
  await asaasRequest("DELETE", `/subscriptions/${subscriptionId}`, apiKey, undefined, environment);
  await supabase.from("asaas_subscriptions").update({ status: "DELETED" } as any).eq("asaas_subscription_id", subscriptionId);
}

export async function getSubscriptionPayments(
  subscriptionId: string,
  apiKey: string,
  environment: "production" | "sandbox" = "production"
): Promise<AsaasPayment[]> {
  const data = await asaasRequest("GET", `/subscriptions/${subscriptionId}/payments`, apiKey, undefined, environment);
  return data.data || [];
}

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────

export async function processWebhookEvent(
  event: string,
  payment: AsaasPayment,
  autoCreateFinancial: boolean
): Promise<void> {
  await supabase
    .from("asaas_payments")
    .update({
      status: payment.status,
      payment_date: payment.paymentDate || null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("asaas_payment_id", payment.id);

  if (event === "PAYMENT_RECEIVED" && autoCreateFinancial) {
    const { data: asaasPayment } = await supabase
      .from("asaas_payments")
      .select("*")
      .eq("asaas_payment_id", payment.id)
      .single();

    if (asaasPayment && !(asaasPayment as any).financial_entry_id) {
      const { data: category } = await supabase
        .from("financial_categories")
        .select("id")
        .eq("type", "receita")
        .limit(1)
        .single();

      const { data: entry } = await supabase
        .from("financial_entries")
        .insert({
          type: "receber",
          category_id: category?.id || null,
          client_id: (asaasPayment as any).client_id,
          contract_id: (asaasPayment as any).contract_id,
          description: (asaasPayment as any).description || `Cobrança Asaas #${payment.id}`,
          value: (asaasPayment as any).value,
          due_date: (asaasPayment as any).due_date,
          payment_date: payment.paymentDate || new Date().toISOString().split("T")[0],
          status: "pago",
          recurrence: "unica",
          notes: `Sincronizado automaticamente do Asaas. ID: ${payment.id}`,
        })
        .select("id")
        .single();

      if (entry) {
        await supabase
          .from("asaas_payments")
          .update({ financial_entry_id: entry.id } as any)
          .eq("asaas_payment_id", payment.id);
      }

      // 7. Gerar Checklist de Entrega (se configurado)
      if (asaasPayment && (asaasPayment as any).client_id) {
        const period = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        await generateChecklistForClient((asaasPayment as any).client_id, period);
      }
    }
  }
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

export function formatAsaasStatus(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pendente", color: "text-amber-500" },
    RECEIVED: { label: "Recebido", color: "text-emerald-500" },
    CONFIRMED: { label: "Confirmado", color: "text-emerald-500" },
    OVERDUE: { label: "Vencido", color: "text-red-500" },
    REFUNDED: { label: "Estornado", color: "text-muted-foreground" },
    RECEIVED_IN_CASH: { label: "Rec. em dinheiro", color: "text-emerald-500" },
    REFUND_REQUESTED: { label: "Estorno solicitado", color: "text-amber-500" },
    REFUND_IN_PROGRESS: { label: "Estorno em andamento", color: "text-amber-500" },
    CHARGEBACK_REQUESTED: { label: "Chargeback", color: "text-red-500" },
    CHARGEBACK_DISPUTE: { label: "Disputa", color: "text-red-500" },
    AWAITING_CHARGEBACK_REVERSAL: { label: "Aguardando reversão", color: "text-amber-500" },
    DUNNING_REQUESTED: { label: "Em cobrança", color: "text-amber-500" },
    DUNNING_RECEIVED: { label: "Cobrança recebida", color: "text-emerald-500" },
    AWAITING_RISK_ANALYSIS: { label: "Análise de risco", color: "text-amber-500" },
    DELETED: { label: "Excluída", color: "text-muted-foreground" },
    ACTIVE: { label: "Ativa", color: "text-emerald-500" },
    INACTIVE: { label: "Inativa", color: "text-muted-foreground" },
    EXPIRED: { label: "Expirada", color: "text-red-500" },
  };
  return map[status] || { label: status, color: "text-muted-foreground" };
}

export function formatBillingType(type: string): string {
  const map: Record<string, string> = {
    BOLETO: "Boleto",
    PIX: "Pix",
    CREDIT_CARD: "Cartão de Crédito",
    UNDEFINED: "Indefinido",
  };
  return map[type] || type;
}

export function formatCycle(cycle: string): string {
  const map: Record<string, string> = {
    WEEKLY: "Semanal",
    BIWEEKLY: "Quinzenal",
    MONTHLY: "Mensal",
    BIMONTHLY: "Bimestral",
    QUARTERLY: "Trimestral",
    SEMIANNUALLY: "Semestral",
    YEARLY: "Anual",
  };
  return map[cycle] || cycle;
}
