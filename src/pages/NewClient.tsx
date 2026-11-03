import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Briefcase, Target, Palette, Settings2,
  ChevronLeft, ChevronRight, Check, Loader2, User, FileClock,
} from "lucide-react";
import { validateClientBasicInfo, sanitizeURL, type ValidationErrors } from "@/lib/validation";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─── types ─── */
interface FormData {
  company_name: string; cnpj: string; contact_name: string; email: string; phone: string; website: string;
  industry: string; business_description: string; products_services: string; time_in_market: string; company_size: string; monthly_revenue: string;
  main_niche: string; main_pains: string; desires: string; age_min: number; age_max: number; gender: string; location: string; social_class: string; brand_tone: string;
  primary_color: string; secondary_color: string; fonts: string; visual_elements: string; visual_personality: string;
  support_channels: string[]; crm_used: string; sla_response: string; business_hours_start: string; business_hours_end: string; working_days: string[]; additional_info: string; terms_accepted: boolean;
}

const INITIAL: FormData = {
  company_name: "", cnpj: "", contact_name: "", email: "", phone: "", website: "",
  industry: "", business_description: "", products_services: "", time_in_market: "", company_size: "", monthly_revenue: "",
  main_niche: "", main_pains: "", desires: "", age_min: 18, age_max: 65, gender: "both", location: "", social_class: "", brand_tone: "",
  primary_color: "#f76926", secondary_color: "#1a1a2e", fonts: "", visual_elements: "", visual_personality: "",
  support_channels: [], crm_used: "", sla_response: "", business_hours_start: "08:00", business_hours_end: "18:00", working_days: [], additional_info: "", terms_accepted: false,
};

const STEPS = [
  { title: "Informações da Empresa", subtitle: "Comece com os dados principais", icon: Building2 },
  { title: "Sobre o Negócio", subtitle: "Nos ajude a entender o cliente", icon: Briefcase },
  { title: "Público-Alvo", subtitle: "Quem são seus clientes ideais?", icon: Target },
  { title: "Identidade Visual", subtitle: "Aparência da marca", icon: Palette },
  { title: "Operação e Contatos", subtitle: "Últimos detalhes", icon: Settings2 },
];

const INDUSTRIES = ["Saúde", "Tecnologia", "Educação", "E-commerce", "Serviços", "Outros"];
const TIME_OPTIONS = ["Menos de 1 ano", "1-3 anos", "3-5 anos", "5+ anos"];
const SIZE_OPTIONS = ["Startup", "PME", "Grande empresa"];
const REVENUE_OPTIONS = ["Até R$ 10k", "R$ 10k-50k", "R$ 50k-200k", "R$ 200k-1M", "R$ 1M+"];
const TONE_OPTIONS = ["Formal", "Descontraído", "Técnico", "Empático", "Irreverente"];
const LOCATION_OPTIONS = ["Nacional", "Regional", "Internacional"];
const SOCIAL_OPTIONS = ["A", "B", "C", "D/E"];
const CRM_OPTIONS = ["Kommo", "HubSpot", "Pipedrive", "Salesforce", "Outro", "Nenhum"];
const SLA_OPTIONS = ["1h", "2h", "4h", "8h", "24h"];
const CHANNEL_OPTIONS = ["WhatsApp", "Email", "Telefone", "Chat", "Redes Sociais"];
const DAY_OPTIONS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/* ─── helpers ─── */
const documentMask = (v: string) => {
  const digits = v.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
      .slice(0, 14);
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};
const phoneMask = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <Label className="text-sm text-foreground font-medium">{children}{required && <span className="text-destructive ml-0.5">*</span>}</Label>;
}

/* ─── page ─── */
export default function NewClient() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const { user } = useAuth();
  const { addClient } = useClients();
  const navigate = useNavigate();

  const draftKey = user ? `draft_client_${user.id}` : null;
  const [draftReady, setDraftReady] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const pendingDraftRef = useRef<FormData | null>(null);

  // Ao abrir o cadastro, verifica se existe um rascunho salvo para este usuário
  useEffect(() => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        pendingDraftRef.current = JSON.parse(raw);
        setShowDraftPrompt(true);
      } catch {
        localStorage.removeItem(draftKey);
        setDraftReady(true);
      }
    } else {
      setDraftReady(true);
    }
  }, [draftKey]);

  const continueDraft = () => {
    if (pendingDraftRef.current) setForm(pendingDraftRef.current);
    pendingDraftRef.current = null;
    setShowDraftPrompt(false);
    setDraftReady(true);
  };

  const discardDraft = () => {
    if (draftKey) localStorage.removeItem(draftKey);
    pendingDraftRef.current = null;
    setShowDraftPrompt(false);
    setDraftReady(true);
  };

  // Salva rascunho no localStorage a cada alteração (debounce 500ms) — nunca vai para o Supabase
  useEffect(() => {
    if (!draftReady || !draftKey) return;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(form));
      setDraftSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 500);
    return () => clearTimeout(timer);
  }, [form, draftReady, draftKey]);

  const isDirty = draftReady && JSON.stringify(form) !== JSON.stringify(INITIAL);
  useUnsavedChangesGuard(isDirty);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const toggleArray = (key: "support_channels" | "working_days", value: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  };

  const validate = (): boolean => {
    // Limpa erros anteriores
    setErrors({});
    
    if (step === 0) {
      const validationErrors = validateClientBasicInfo(
        form.company_name,
        form.cnpj,
        form.contact_name,
        form.email,
        form.phone,
        form.website
      );
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast({ 
          title: "⚠️ Campos inválidos", 
          description: Object.values(validationErrors)[0], 
          variant: "destructive" 
        });
        return false;
      }
    }
    return true;
  };

  const next = () => { if (validate() && step < 4) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const submit = async () => {
    if (!user) return;
    if (!form.terms_accepted) { toast({ title: "⚠️ Termos", description: "Aceite os termos para continuar", variant: "destructive" }); return; }
    
    // Validação final antes de enviar
    const validationErrors = validateClientBasicInfo(
      form.company_name,
      form.cnpj,
      form.contact_name,
      form.email,
      form.phone,
      form.website
    );
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({ 
        title: "⚠️ Campos inválidos", 
        description: Object.values(validationErrors)[0], 
        variant: "destructive" 
      });
      return;
    }
    
    // Sanitiza a URL do website
    const sanitizedWebsite = form.website ? sanitizeURL(form.website) : null;

    setSaving(true);
    const ok = await addClient({
      user_id: user.id,
      company_name: form.company_name, cnpj: form.cnpj, contact_name: form.contact_name, email: form.email, phone: form.phone, website: sanitizedWebsite,
      industry: form.industry || null, business_description: form.business_description || null, products_services: form.products_services || null, time_in_market: form.time_in_market || null, company_size: form.company_size || null, monthly_revenue: form.monthly_revenue || null,
      main_niche: form.main_niche || null, main_pains: form.main_pains || null, desires: form.desires || null, age_min: form.age_min, age_max: form.age_max, gender: form.gender as any, location: form.location || null, social_class: form.social_class || null, brand_tone: form.brand_tone || null,
      primary_color: form.primary_color, secondary_color: form.secondary_color, fonts: form.fonts || null, visual_elements: form.visual_elements || null, visual_personality: form.visual_personality || null,
      support_channels: form.support_channels as any, crm_used: form.crm_used || null, sla_response: form.sla_response || null, business_hours_start: form.business_hours_start, business_hours_end: form.business_hours_end, working_days: form.working_days as any, additional_info: form.additional_info || null, terms_accepted: form.terms_accepted,
      status: "active" as any,
    } as any);
    setSaving(false);
    if (!ok) return;
    if (draftKey) localStorage.removeItem(draftKey);
    toast({ title: "✅ Cliente cadastrado!", description: `${form.company_name} adicionado com sucesso` });
    navigate("/clientes");
  };

  const progress = ((step + 1) / 5) * 100;

  const inputCls = (key: string) => `bg-secondary border-border/40 h-10 text-sm ${errors[key] ? "border-destructive focus-visible:ring-destructive" : ""}`;
  const textareaCls = (key: string) => `bg-secondary border-border/40 text-sm min-h-[80px] resize-none ${errors[key] ? "border-destructive focus-visible:ring-destructive" : ""}`;
  
  // Helper para mostrar mensagem de erro
  const ErrorMessage = ({ field }: { field: string }) => {
    return errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground tracking-tight">NOVO CLIENTE</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Cadastro Totum · Etapa {step + 1} de 5</p>
        </motion.div>

        {/* Progress steps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 flex items-center gap-1">
                <button
                  onClick={() => { if (i <= step) setStep(i); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full ${
                    i === step ? "bg-primary text-primary-foreground" :
                    i < step ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i < step ? "bg-emerald-500 text-white" :
                    i === step ? "bg-primary-foreground text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < step ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="hidden lg:inline truncate">{s.title}</span>
                </button>
                {i < 4 && <div className={`w-4 h-0.5 shrink-0 ${i < step ? "bg-emerald-500" : "bg-border"}`} />}
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Form area */}
          <div className="xl:col-span-3">
            <Card className="border-border/40 bg-card/80">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = STEPS[step].icon; return <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>; })()}
                  <div>
                    <CardTitle className="text-lg">{STEPS[step].title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{STEPS[step].subtitle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {step === 0 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <FieldLabel required>Nome da empresa</FieldLabel>
                            <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputCls("company_name")} placeholder="Ex: Totum Digital" />
                            <ErrorMessage field="company_name" />
                          </div>
                          <div>
                            <FieldLabel required>CNPJ / CPF</FieldLabel>
                            <Input value={form.cnpj} onChange={(e) => set("cnpj", documentMask(e.target.value))} className={inputCls("cnpj")} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
                            <ErrorMessage field="cnpj" />
                          </div>
                        </div>
                        <div>
                          <FieldLabel required>Nome do responsável</FieldLabel>
                          <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className={inputCls("contact_name")} placeholder="Nome completo" />
                          <ErrorMessage field="contact_name" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <FieldLabel>Email (opcional)</FieldLabel>
                            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls("email")} placeholder="email@empresa.com" />
                            <ErrorMessage field="email" />
                          </div>
                          <div>
                            <FieldLabel required>Telefone</FieldLabel>
                            <Input value={form.phone} onChange={(e) => set("phone", phoneMask(e.target.value))} className={inputCls("phone")} placeholder="(00) 00000-0000" />
                            <ErrorMessage field="phone" />
                          </div>
                        </div>
                        <div>
                          <FieldLabel>Site</FieldLabel>
                          <Input value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls("website")} placeholder="https://www.empresa.com" />
                          <ErrorMessage field="website" />
                        </div>
                      </>
                    )}

                    {step === 1 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><FieldLabel>Ramo de atuação</FieldLabel><Select value={form.industry} onValueChange={(v) => set("industry", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                          <div><FieldLabel>Tempo de mercado</FieldLabel><Select value={form.time_in_market} onValueChange={(v) => set("time_in_market", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{TIME_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div><FieldLabel>Descrição do negócio</FieldLabel><textarea value={form.business_description} onChange={(e) => set("business_description", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="O que a empresa faz?" /></div>
                        <div><FieldLabel>Produtos/Serviços oferecidos</FieldLabel><textarea value={form.products_services} onChange={(e) => set("products_services", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="Liste os principais produtos ou serviços" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><FieldLabel>Tamanho da empresa</FieldLabel><Select value={form.company_size} onValueChange={(v) => set("company_size", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{SIZE_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                          <div><FieldLabel>Faturamento mensal</FieldLabel><Select value={form.monthly_revenue} onValueChange={(v) => set("monthly_revenue", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{REVENUE_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <div><FieldLabel>Nicho principal</FieldLabel><Input value={form.main_niche} onChange={(e) => set("main_niche", e.target.value)} className={inputCls("")} placeholder="Ex: Mães de primeira viagem" /></div>
                        <div><FieldLabel>Dores principais</FieldLabel><textarea value={form.main_pains} onChange={(e) => set("main_pains", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="Liste 3-5 dores do público" /></div>
                        <div><FieldLabel>Desejos/Objetivos</FieldLabel><textarea value={form.desires} onChange={(e) => set("desires", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="O que o público deseja alcançar?" /></div>
                        <div>
                          <FieldLabel>Faixa etária: {form.age_min} - {form.age_max}+</FieldLabel>
                          <div className="mt-2 px-2">
                            <Slider value={[form.age_min, form.age_max]} min={18} max={65} step={1} onValueChange={([min, max]) => { set("age_min", min); set("age_max", max); }} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <FieldLabel>Gênero</FieldLabel>
                            <div className="flex gap-2 mt-1">
                              {["Masculino", "Feminino", "Ambos"].map((g) => (
                                <button key={g} onClick={() => set("gender", g.toLowerCase())} className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.gender === g.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{g}</button>
                              ))}
                            </div>
                          </div>
                          <div><FieldLabel>Localização</FieldLabel><Select value={form.location} onValueChange={(v) => set("location", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{LOCATION_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                          <div><FieldLabel>Classe social</FieldLabel><Select value={form.social_class} onValueChange={(v) => set("social_class", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{SOCIAL_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div><FieldLabel>Tom de voz da marca</FieldLabel><Select value={form.brand_tone} onValueChange={(v) => set("brand_tone", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{TONE_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <FieldLabel>Cor primária</FieldLabel>
                            <div className="flex items-center gap-2 mt-1">
                              <input type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border/40 cursor-pointer bg-transparent" />
                              <Input value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className={`${inputCls("")} flex-1`} />
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Cor secundária</FieldLabel>
                            <div className="flex items-center gap-2 mt-1">
                              <input type="color" value={form.secondary_color} onChange={(e) => set("secondary_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border/40 cursor-pointer bg-transparent" />
                              <Input value={form.secondary_color} onChange={(e) => set("secondary_color", e.target.value)} className={`${inputCls("")} flex-1`} />
                            </div>
                          </div>
                        </div>
                        <div><FieldLabel>Fontes utilizadas</FieldLabel><Input value={form.fonts} onChange={(e) => set("fonts", e.target.value)} className={inputCls("")} placeholder="Ex: Inter, Montserrat" /></div>
                        <div><FieldLabel>Key visual / Elementos gráficos</FieldLabel><textarea value={form.visual_elements} onChange={(e) => set("visual_elements", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="Descreva os elementos visuais" /></div>
                        <div><FieldLabel>Personalidade visual</FieldLabel><textarea value={form.visual_personality} onChange={(e) => set("visual_personality", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="Como a marca deve ser percebida visualmente?" /></div>
                      </>
                    )}

                    {step === 4 && (
                      <>
                        <div>
                          <FieldLabel>Canais de atendimento</FieldLabel>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {CHANNEL_OPTIONS.map((ch) => (
                              <button key={ch} onClick={() => toggleArray("support_channels", ch)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.support_channels.includes(ch) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{ch}</button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><FieldLabel>CRM utilizado</FieldLabel><Select value={form.crm_used} onValueChange={(v) => set("crm_used", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{CRM_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                          <div><FieldLabel>SLA de resposta</FieldLabel><Select value={form.sla_response} onValueChange={(v) => set("sla_response", v)}><SelectTrigger className="bg-secondary border-border/40"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{SLA_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div><FieldLabel>Horário início</FieldLabel><Input type="time" value={form.business_hours_start} onChange={(e) => set("business_hours_start", e.target.value)} className={inputCls("")} /></div>
                          <div><FieldLabel>Horário fim</FieldLabel><Input type="time" value={form.business_hours_end} onChange={(e) => set("business_hours_end", e.target.value)} className={inputCls("")} /></div>
                        </div>
                        <div>
                          <FieldLabel>Dias de atendimento</FieldLabel>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {DAY_OPTIONS.map((d) => (
                              <button key={d} onClick={() => toggleArray("working_days", d)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${form.working_days.includes(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{d}</button>
                            ))}
                          </div>
                        </div>
                        <div><FieldLabel>Informações adicionais</FieldLabel><textarea value={form.additional_info} onChange={(e) => set("additional_info", e.target.value)} className={`w-full rounded-md px-3 py-2 ${textareaCls("")}`} placeholder="Algo mais que devamos saber?" /></div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                          <Checkbox checked={form.terms_accepted} onCheckedChange={(c) => set("terms_accepted", !!c)} />
                          <span className="text-sm text-foreground">Aceito os termos de uso e política de privacidade</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-4 border-t border-border/30">
                  <Button variant="ghost" onClick={prev} disabled={step === 0} className="text-sm">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  {step < 4 ? (
                    <Button onClick={next} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
                      Próximo <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={submit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
                      {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4 mr-1" /> Concluir Cadastro</>}
                    </Button>
                  )}
                </div>
                {draftSavedAt && (
                  <p className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground/60 mt-3">
                    <FileClock className="w-3 h-3" /> Rascunho salvo às {draftSavedAt}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-24">
              <Card className="border-border/40 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Preview do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo placeholder */}
                  <div className="w-16 h-16 rounded-xl mx-auto flex items-center justify-center border-2 border-dashed border-border/60" style={{ backgroundColor: form.primary_color + "20" }}>
                    {form.company_name ? (
                      <span className="text-2xl font-heading font-bold" style={{ color: form.primary_color }}>{form.company_name.charAt(0).toUpperCase()}</span>
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="text-center">
                    <p className="font-heading font-semibold text-foreground text-sm">{form.company_name || "Nome da Empresa"}</p>
                    {form.industry && <Badge variant="outline" className="text-[10px] mt-1 bg-primary/10 text-primary border-primary/30">{form.industry}</Badge>}
                  </div>

                  <div className="text-center">
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">Configurando...</Badge>
                  </div>

                  {/* Mini details */}
                  <div className="space-y-2 text-xs">
                    {form.contact_name && <div className="flex justify-between"><span className="text-muted-foreground">Responsável</span><span className="text-foreground">{form.contact_name}</span></div>}
                    {form.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-foreground truncate ml-2">{form.email}</span></div>}
                    {form.company_size && <div className="flex justify-between"><span className="text-muted-foreground">Porte</span><span className="text-foreground">{form.company_size}</span></div>}
                    {form.brand_tone && <div className="flex justify-between"><span className="text-muted-foreground">Tom</span><span className="text-foreground">{form.brand_tone}</span></div>}
                    {form.crm_used && <div className="flex justify-between"><span className="text-muted-foreground">CRM</span><span className="text-foreground">{form.crm_used}</span></div>}
                  </div>

                  {/* Color preview */}
                  {(form.primary_color || form.secondary_color) && (
                    <div className="flex gap-2 justify-center">
                      <div className="w-8 h-8 rounded-lg border border-border/40" style={{ backgroundColor: form.primary_color }} title="Primária" />
                      <div className="w-8 h-8 rounded-lg border border-border/40" style={{ backgroundColor: form.secondary_color }} title="Secundária" />
                    </div>
                  )}

                  {/* Step indicator */}
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground text-center">Etapa {step + 1} de 5</p>
                    <div className="flex gap-1 mt-1">
                      {STEPS.map((_, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                      Próximo: {step < 4 ? STEPS[step + 1].title : "Concluir"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <AlertDialog open={showDraftPrompt} onOpenChange={(o) => { if (!o) discardDraft(); }}>
          <AlertDialogContent className="bg-card border-border text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
              <AlertDialogDescription>
                Encontramos um rascunho. Deseja continuar de onde parou?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={discardDraft}>Descartar rascunho</AlertDialogCancel>
              <AlertDialogAction onClick={continueDraft}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
