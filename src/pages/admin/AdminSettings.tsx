// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Clock, Globe, Bell, Shield, Save, Loader2, Eye, EyeOff, Megaphone, CreditCard, Smartphone, Wallet, PlugZap, KeyRound, FlaskConical, CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase: any = _supabase;
import { logAudit } from "@/lib/audit";
import { toast } from "@/hooks/use-toast";
import {
  loadDebitApiConfig,
  saveDebitApiConfig,
  testDebitConnection,
  maskKey,
  type DebitApiConfig,
  type DebitTestResult,
} from "@/lib/adminApi";

import { Palette } from "lucide-react";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";

export default function AdminSettings() {
  const { rt, region, reload } = useRegionalTheme();
  const [themeConfig, setThemeConfig] = useState({
    primary: "#9b87f5",
    secondary: "#7E69AB",
    accent: "#F2FCE2",
    tagline: "",
    logo_url: ""
  });

  useEffect(() => {
    if (region) {
      setThemeConfig({
        primary: (region.theme_colors as any)?.primary || "#9b87f5",
        secondary: (region.theme_colors as any)?.secondary || "#7E69AB",
        accent: (region.theme_colors as any)?.accent || "#F2FCE2",
        tagline: region.tagline || "",
        logo_url: region.logo_url || ""
      });
    }
  }, [region]);

  const handleSaveTheme = async () => {
    try {
      const { error } = await supabase
        .from("regions")
        .update({
          theme_colors: {
            primary: themeConfig.primary,
            secondary: themeConfig.secondary,
            accent: themeConfig.accent
          },
          tagline: themeConfig.tagline,
          logo_url: themeConfig.logo_url
        })
        .eq("id", region?.id);

      if (error) throw error;
      toast({ title: "Identidade visual atualizada!" });
      reload();
    } catch (err: any) {
      toast({ title: "Erro ao guardar", description: err.message, variant: "destructive" });
    }
  };

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuredRaffleId, setFeaturedRaffleId] = useState("");
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [raffles, setRaffles] = useState<any[]>([]);
  const [general, setGeneral] = useState({
    platformName: "Bateu",
    platformTagline: "Sorteios que inspiram",
    supportEmail: "suporte@bateu.co.mz",
  });
  const [business, setBusiness] = useState({
    maxTicketsPerUser: 10,
    commissionRate: 5,
    autoApprovePayments: false,
    minTicketPrice: 10,
    maxRafflesPerBusiness: 20,
    requirePaymentProof: true,
  });
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "Estamos em manutenção. Voltamos em breve!" });
  const [debitApi, setDebitApi] = useState<DebitApiConfig>({
    mode: "gateway",
    gateway_url: "",
    gateway_key: "",
    mpesa_sp_code: "",
    mpesa_portal_key: "",
    mpesa_public_key: "",
    mpesa_base_url: "",
    providers_enabled: { mpesa: true, emola: true, conta_movel: false, tkash: false },
    configured_at: null,
  });
  const [debitLoading, setDebitLoading] = useState(true);
  const [debitSaving, setDebitSaving] = useState(false);
  const [debitTesting, setDebitTesting] = useState(false);
  const [showGatewayKey, setShowGatewayKey] = useState(false);
  const [showPortalKey, setShowPortalKey] = useState(false);
  const [testResult, setTestResult] = useState<DebitTestResult | null>(null);
  const [announcements, setAnnouncements] = useState({
    enabled: false,
    message: "",
    type: "info" as "info" | "warning" | "success",
  });
  const [payments, setPayments] = useState({
    // Moçambique
    mpesaEnabled: true,
    mpesaNumber: "",
    emolaEnabled: true,
    emolaNumber: "",
    paysuiteEnabled: false,
    paysuiteApiKey: "",
    paysuiteEntityId: "",
    paysuiteWebhookSecret: "",
    // Angola
    multicaixaEnabled: false,
    multicaixaNumber: "",
    multicaixaMerchantId: "",
    multicaixaApiKey: "",
    multicaixaTerminalId: "",
    unitelMoneyEnabled: false,
    unitelMoneyMerchantId: "",
    unitelMoneyApiKey: "",
    unitelMoneyNumber: "",
    africellMoneyEnabled: false,
    africellMoneyNumber: "",
    baiTransferEnabled: false,
    baiIban: "",
    baiHolder: "",
    bfaTransferEnabled: false,
    bfaIban: "",
    bfaHolder: "",
    // Brasil
    pixEnabled: false,
    pixKey: "",
    pixHolder: "",
    boletoEnabled: false,
    boletoInstructions: "",
    cardBREnabled: false,
    cardBRGateway: "" as "" | "stripe" | "mercadopago" | "pagseguro",
    cardBRApiKey: "",
    // Internacional
    paypalEnabled: false,
    paypalClientId: "",
    paypalSecret: "",
    paypalMode: "sandbox" as "sandbox" | "live",
  });

  useEffect(() => {
    const load = async () => {
      const [{ data: settings }, { data: activeRaffles }] = await Promise.all([
        supabase.from("platform_settings").select("key, value"),
        supabase.from("raffles").select("id, title, status, end_date, prize_title").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      if (settings) {
        const map = new Map(settings.map((s: any) => [s.key, s.value]));
        if (map.has("general")) setGeneral(prev => ({ ...prev, ...(map.get("general") as any) }));
        if (map.has("business")) setBusiness(prev => ({ ...prev, ...(map.get("business") as any) }));
        if (map.has("maintenance")) setMaintenance(prev => ({ ...prev, ...(map.get("maintenance") as any) }));
        if (map.has("announcements")) setAnnouncements(prev => ({ ...prev, ...(map.get("announcements") as any) }));
        if (map.has("payments")) setPayments(prev => ({ ...prev, ...(map.get("payments") as any) }));
        if (map.has("featured")) {
          const f = map.get("featured") as any;
          setFeaturedRaffleId(f?.raffleId || "");
          setCountdownEnabled(f?.countdownEnabled === true);
        }
      }
      if (activeRaffles) setRaffles(activeRaffles);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    loadDebitApiConfig()
      .then(setDebitApi)
      .catch(() => undefined)
      .finally(() => setDebitLoading(false));
  }, []);

  const handleSaveDebitApi = async () => {
    setDebitSaving(true);
    try {
      await saveDebitApiConfig(debitApi);
      await logAudit("debit_api_updated", "platform_settings", undefined, { mode: debitApi.mode });
      toast({ title: "APIs guardadas", description: "O débito direto MPesa/e-Mola passa a usar estas credenciais imediatamente." });
    } catch (err: any) {
      toast({ title: "Erro ao guardar APIs", description: err.message, variant: "destructive" });
    } finally {
      setDebitSaving(false);
    }
  };

  const handleTestDebitApi = async () => {
    setDebitTesting(true);
    setTestResult(null);
    try {
      const res = await testDebitConnection("mpesa");
      setTestResult(res);
      if (res.success) {
        toast({ title: "Ligação OK", description: `Teste concluído em ${res.latency_ms}ms.` });
      } else {
        toast({ title: "Ligação com problemas", description: "Veja os detalhes do teste abaixo.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro no teste", description: err.message, variant: "destructive" });
    } finally {
      setDebitTesting(false);
    }
  };

  const upsertSetting = async (key: string, value: any) => {
    const { data: existing } = await supabase.from("platform_settings").select("id").eq("key", key).maybeSingle();
    if (existing) {
      await supabase.from("platform_settings").update({ value: value as any, updated_at: new Date().toISOString() }).eq("key", key);
    } else {
      await supabase.from("platform_settings").insert({ key, value: value as any });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      upsertSetting("general", general),
      upsertSetting("business", business),
      upsertSetting("maintenance", maintenance),
      upsertSetting("announcements", announcements),
      upsertSetting("payments", payments),
      upsertSetting("featured", { raffleId: featuredRaffleId, countdownEnabled }),
    ]);
    await logAudit("settings_updated", "settings", undefined, { countdownEnabled, maintenance: maintenance.enabled });
    setSaving(false);
    toast({ title: "Configurações guardadas", description: "As alterações foram aplicadas com sucesso." });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedRaffle = raffles.find(r => r.id === featuredRaffleId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Configurações gerais da plataforma</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          <TabsTrigger value="apis">APIs Débito</TabsTrigger>
          <TabsTrigger value="business">Negócio</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
            <Card className="glass border-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Identidade Visual Regional
                </CardTitle>
                <CardDescription>Personalize as cores e a marca para a sua região</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 border rounded-xl p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">Cores da Marca</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Primária</label>
                        <input 
                          type="color" 
                          value={themeConfig.primary} 
                          onChange={(e) => setThemeConfig({...themeConfig, primary: e.target.value})}
                          className="w-full h-10 rounded cursor-pointer border-none bg-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Secundária</label>
                        <input 
                          type="color" 
                          value={themeConfig.secondary} 
                          onChange={(e) => setThemeConfig({...themeConfig, secondary: e.target.value})}
                          className="w-full h-10 rounded cursor-pointer border-none bg-transparent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Acento</label>
                        <input 
                          type="color" 
                          value={themeConfig.accent} 
                          onChange={(e) => setThemeConfig({...themeConfig, accent: e.target.value})}
                          className="w-full h-10 rounded cursor-pointer border-none bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border rounded-xl p-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">Marca e Slogan</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Slogan Regional</Label>
                        <Input 
                          value={themeConfig.tagline} 
                          onChange={(e) => setThemeConfig({...themeConfig, tagline: e.target.value})}
                          placeholder="Ex: Os melhores sorteios de Moçambique"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL do Logótipo</Label>
                        <Input 
                          value={themeConfig.logo_url} 
                          onChange={(e) => setThemeConfig({...themeConfig, logo_url: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveTheme} className="w-full md:w-auto">Guardar Identidade Visual</Button>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass border-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Temporizador Destaque
                  </CardTitle>
                  <CardDescription>Controla o temporizador da página inicial</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3 border border-primary/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">Ativar Temporizador</p>
                      <p className="text-xs text-muted-foreground">
                        {countdownEnabled ? "Visível na homepage" : "Oculto na homepage"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {countdownEnabled ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20"><Eye className="h-3 w-3 mr-1" /> Online</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground"><EyeOff className="h-3 w-3 mr-1" /> Offline</Badge>
                      )}
                      <Switch checked={countdownEnabled} onCheckedChange={setCountdownEnabled} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sorteio em Destaque</Label>
                    <Select value={featuredRaffleId || "none"} onValueChange={(v) => setFeaturedRaffleId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione um sorteio..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {raffles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.title} — {r.prize_title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedRaffle && (
                    <div className="rounded-lg bg-secondary/50 p-3 text-xs space-y-1">
                      <p className="font-medium text-foreground">{selectedRaffle.title}</p>
                      <p className="text-muted-foreground">Prémio: {selectedRaffle.prize_title}</p>
                      <p className="text-muted-foreground">Termina: {selectedRaffle.end_date ? new Date(selectedRaffle.end_date).toLocaleDateString("pt-MZ") : "Sem data"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="glass border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-accent" />
                    Banner de Anúncio
                  </CardTitle>
                  <CardDescription>Mensagem visível no topo de todas as páginas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-accent/5 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Ativar Banner</p>
                      <p className="text-xs text-muted-foreground">Exibir anúncio global</p>
                    </div>
                    <Switch checked={announcements.enabled} onCheckedChange={(v) => setAnnouncements({ ...announcements, enabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea value={announcements.message} onChange={(e) => setAnnouncements({ ...announcements, message: e.target.value })} placeholder="Ex: Grande sorteio este fim de semana! 🎉" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={announcements.type} onValueChange={(v: any) => setAnnouncements({ ...announcements, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">ℹ️ Informação</SelectItem>
                        <SelectItem value="warning">⚠️ Aviso</SelectItem>
                        <SelectItem value="success">✅ Sucesso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Plataforma
                  </CardTitle>
                  <CardDescription>Informações gerais da plataforma</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Plataforma</Label>
                    <Input value={general.platformName} onChange={(e) => setGeneral({ ...general, platformName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slogan</Label>
                    <Input value={general.platformTagline} onChange={(e) => setGeneral({ ...general, platformTagline: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email de Suporte</Label>
                    <Input type="email" value={general.supportEmail} onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass border-[#E21B1B]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-[#E21B1B]" />
                    M-Pesa
                    <Badge variant="outline" className="ml-auto text-[10px]">🇲🇿 Moçambique</Badge>
                  </CardTitle>
                  <CardDescription>Pagamento via Vodacom M-Pesa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#E21B1B]/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar M-Pesa</p>
                    <Switch checked={payments.mpesaEnabled} onCheckedChange={(v) => setPayments({ ...payments, mpesaEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número M-Pesa</Label>
                    <Input value={payments.mpesaNumber} onChange={(e) => setPayments({ ...payments, mpesaNumber: e.target.value })} placeholder="84XXXXXXX" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="glass border-[#FF6600]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#FF6600]" />
                    e-Mola
                    <Badge variant="outline" className="ml-auto text-[10px]">🇲🇿 Moçambique</Badge>
                  </CardTitle>
                  <CardDescription>Pagamento via Movitel e-Mola</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#FF6600]/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar e-Mola</p>
                    <Switch checked={payments.emolaEnabled} onCheckedChange={(v) => setPayments({ ...payments, emolaEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número e-Mola</Label>
                    <Input value={payments.emolaNumber} onChange={(e) => setPayments({ ...payments, emolaNumber: e.target.value })} placeholder="86XXXXXXX" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    PaySuite
                    <Badge variant="outline" className="ml-auto text-[10px]">🇲🇿 Moçambique</Badge>
                  </CardTitle>
                  <CardDescription>Gateway de pagamentos PaySuite API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar PaySuite</p>
                    <Switch checked={payments.paysuiteEnabled} onCheckedChange={(v) => setPayments({ ...payments, paysuiteEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={payments.paysuiteApiKey} onChange={(e) => setPayments({ ...payments, paysuiteApiKey: e.target.value })} placeholder="pk_live_..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Entity ID</Label>
                    <Input value={payments.paysuiteEntityId} onChange={(e) => setPayments({ ...payments, paysuiteEntityId: e.target.value })} placeholder="ID da entidade PaySuite" />
                  </div>
                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <Input type="password" value={payments.paysuiteWebhookSecret} onChange={(e) => setPayments({ ...payments, paysuiteWebhookSecret: e.target.value })} placeholder="whsec_..." />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass border-[#0066CC]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-[#0066CC]" />
                    Multicaixa Express
                    <Badge variant="outline" className="ml-auto text-[10px]">🇦🇴 Angola</Badge>
                  </CardTitle>
                  <CardDescription>Pagamento móvel via Multicaixa Express (MCX)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#0066CC]/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Multicaixa Express</p>
                    <Switch checked={payments.multicaixaEnabled} onCheckedChange={(v) => setPayments({ ...payments, multicaixaEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número Comerciante (instruções)</Label>
                    <Input value={payments.multicaixaNumber} onChange={(e) => setPayments({ ...payments, multicaixaNumber: e.target.value })} placeholder="9XXXXXXXX (mostrado ao cliente)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <Input value={payments.multicaixaMerchantId} onChange={(e) => setPayments({ ...payments, multicaixaMerchantId: e.target.value })} placeholder="ID do comerciante" />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={payments.multicaixaApiKey} onChange={(e) => setPayments({ ...payments, multicaixaApiKey: e.target.value })} placeholder="Chave API Multicaixa" />
                  </div>
                  <div className="space-y-2">
                    <Label>Terminal ID</Label>
                    <Input value={payments.multicaixaTerminalId} onChange={(e) => setPayments({ ...payments, multicaixaTerminalId: e.target.value })} placeholder="ID do terminal" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass border-[#FF0000]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#FF0000]" />
                    Unitel Money
                    <Badge variant="outline" className="ml-auto text-[10px]">🇦🇴 Angola</Badge>
                  </CardTitle>
                  <CardDescription>Pagamento móvel via Unitel Money</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#FF0000]/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Unitel Money</p>
                    <Switch checked={payments.unitelMoneyEnabled} onCheckedChange={(v) => setPayments({ ...payments, unitelMoneyEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <Input value={payments.unitelMoneyMerchantId} onChange={(e) => setPayments({ ...payments, unitelMoneyMerchantId: e.target.value })} placeholder="ID do comerciante Unitel" />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={payments.unitelMoneyApiKey} onChange={(e) => setPayments({ ...payments, unitelMoneyApiKey: e.target.value })} placeholder="Chave API Unitel Money" />
                  </div>
                  <div className="space-y-2">
                    <Label>Número Comerciante</Label>
                    <Input value={payments.unitelMoneyNumber} onChange={(e) => setPayments({ ...payments, unitelMoneyNumber: e.target.value })} placeholder="9XXXXXXXX" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <Card className="glass border-pink-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-pink-600" />
                    Africell Money
                    <Badge variant="outline" className="ml-auto text-[10px]">🇦🇴 Angola</Badge>
                  </CardTitle>
                  <CardDescription>Carteira móvel Africell Angola</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-pink-500/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Africell Money</p>
                    <Switch checked={payments.africellMoneyEnabled} onCheckedChange={(v) => setPayments({ ...payments, africellMoneyEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número Comerciante</Label>
                    <Input value={payments.africellMoneyNumber} onChange={(e) => setPayments({ ...payments, africellMoneyNumber: e.target.value })} placeholder="9XXXXXXXX (mostrado ao cliente)" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <Card className="glass border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    Transferência BAI
                    <Badge variant="outline" className="ml-auto text-[10px]">🇦🇴 Angola</Badge>
                  </CardTitle>
                  <CardDescription>Transferência bancária IBAN Banco BAI</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Transferência BAI</p>
                    <Switch checked={payments.baiTransferEnabled} onCheckedChange={(v) => setPayments({ ...payments, baiTransferEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN</Label>
                    <Input value={payments.baiIban} onChange={(e) => setPayments({ ...payments, baiIban: e.target.value })} placeholder="AO06 0040 0000 ..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Titular da conta</Label>
                    <Input value={payments.baiHolder} onChange={(e) => setPayments({ ...payments, baiHolder: e.target.value })} placeholder="Nome do titular" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <Card className="glass border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                    Transferência BFA
                    <Badge variant="outline" className="ml-auto text-[10px]">🇦🇴 Angola</Badge>
                  </CardTitle>
                  <CardDescription>Transferência bancária IBAN Banco BFA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-amber-500/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Transferência BFA</p>
                    <Switch checked={payments.bfaTransferEnabled} onCheckedChange={(v) => setPayments({ ...payments, bfaTransferEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN</Label>
                    <Input value={payments.bfaIban} onChange={(e) => setPayments({ ...payments, bfaIban: e.target.value })} placeholder="AO06 0006 0000 ..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Titular da conta</Label>
                    <Input value={payments.bfaHolder} onChange={(e) => setPayments({ ...payments, bfaHolder: e.target.value })} placeholder="Nome do titular" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <Card className="glass border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-emerald-600" />
                    Pix
                    <Badge variant="outline" className="ml-auto text-[10px]">🇧🇷 Brasil</Badge>
                  </CardTitle>
                  <CardDescription>Pagamento instantâneo brasileiro via chave Pix</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Pix</p>
                    <Switch checked={payments.pixEnabled} onCheckedChange={(v) => setPayments({ ...payments, pixEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Chave Pix</Label>
                    <Input value={payments.pixKey} onChange={(e) => setPayments({ ...payments, pixKey: e.target.value })} placeholder="CPF/CNPJ, e-mail, telefone ou aleatória" />
                  </div>
                  <div className="space-y-2">
                    <Label>Titular da chave</Label>
                    <Input value={payments.pixHolder} onChange={(e) => setPayments({ ...payments, pixHolder: e.target.value })} placeholder="Nome do titular" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glass border-slate-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-600" />
                    Boleto Bancário
                    <Badge variant="outline" className="ml-auto text-[10px]">🇧🇷 Brasil</Badge>
                  </CardTitle>
                  <CardDescription>Boleto com vencimento em 1-3 dias úteis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-slate-500/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Boleto</p>
                    <Switch checked={payments.boletoEnabled} onCheckedChange={(v) => setPayments({ ...payments, boletoEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Instruções/observações</Label>
                    <Textarea value={payments.boletoInstructions} onChange={(e) => setPayments({ ...payments, boletoInstructions: e.target.value })} placeholder="Texto de instruções para o cliente (ex.: emissão manual, prazo, contacto)" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Cartão (Brasil)
                    <Badge variant="outline" className="ml-auto text-[10px]">🇧🇷 Brasil</Badge>
                  </CardTitle>
                  <CardDescription>Crédito ou débito com parcelamento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar Cartão (BR)</p>
                    <Switch checked={payments.cardBREnabled} onCheckedChange={(v) => setPayments({ ...payments, cardBREnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gateway</Label>
                    <Select value={payments.cardBRGateway || ""} onValueChange={(v: any) => setPayments({ ...payments, cardBRGateway: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o gateway" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                        <SelectItem value="pagseguro">PagSeguro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" value={payments.cardBRApiKey} onChange={(e) => setPayments({ ...payments, cardBRApiKey: e.target.value })} placeholder="Chave secreta do gateway" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="glass border-[#003087]/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-[#003087]" />
                    PayPal
                    <Badge variant="outline" className="ml-auto text-[10px]">🌍 Internacional</Badge>
                  </CardTitle>
                  <CardDescription>Pagamentos internacionais via PayPal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-[#003087]/5 p-3">
                    <p className="text-sm font-medium text-foreground">Ativar PayPal</p>
                    <Switch checked={payments.paypalEnabled} onCheckedChange={(v) => setPayments({ ...payments, paypalEnabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input value={payments.paypalClientId} onChange={(e) => setPayments({ ...payments, paypalClientId: e.target.value })} placeholder="Client ID do PayPal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret</Label>
                    <Input type="password" value={payments.paypalSecret} onChange={(e) => setPayments({ ...payments, paypalSecret: e.target.value })} placeholder="Secret do PayPal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Modo</Label>
                    <Select value={payments.paypalMode} onValueChange={(v: any) => setPayments({ ...payments, paypalMode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">🧪 Sandbox (Teste)</SelectItem>
                        <SelectItem value="live">🔴 Live (Produção)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Regras de Negócio
                  </CardTitle>
                  <CardDescription>Limites, comissões e regras</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Máx. bilhetes/utilizador</Label>
                      <Input type="number" value={business.maxTicketsPerUser} onChange={(e) => setBusiness({ ...business, maxTicketsPerUser: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Comissão (%)</Label>
                      <Input type="number" value={business.commissionRate} onChange={(e) => setBusiness({ ...business, commissionRate: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço mín. bilhete (MZN)</Label>
                      <Input type="number" value={business.minTicketPrice} onChange={(e) => setBusiness({ ...business, minTicketPrice: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Máx. sorteios/empresa</Label>
                      <Input type="number" value={business.maxRafflesPerBusiness} onChange={(e) => setBusiness({ ...business, maxRafflesPerBusiness: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Aprovar pagamentos automaticamente</p>
                      <p className="text-xs text-muted-foreground">Sem revisão manual</p>
                    </div>
                    <Switch checked={business.autoApprovePayments} onCheckedChange={(v) => setBusiness({ ...business, autoApprovePayments: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Exigir comprovativo de pagamento</p>
                      <p className="text-xs text-muted-foreground">Upload obrigatório de recibo</p>
                    </div>
                    <Switch checked={business.requirePaymentProof} onCheckedChange={(v) => setBusiness({ ...business, requirePaymentProof: v })} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Manutenção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-destructive/10 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Modo Manutenção</p>
                      <p className="text-xs text-muted-foreground">Desativa o acesso público temporariamente</p>
                    </div>
                    <Switch checked={maintenance.enabled} onCheckedChange={(v) => setMaintenance({ ...maintenance, enabled: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem de manutenção</Label>
                    <Input value={maintenance.message} onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })} placeholder="Estamos em manutenção..." />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
        <TabsContent value="apis" className="space-y-6">
          {debitLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlugZap className="h-5 w-5 text-primary" />
                    APIs de Débito Direto — MPesa & e-Mola
                    <Badge className={debitApi.gateway_url || debitApi.mpesa_sp_code ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ml-auto" : "bg-amber-500/15 text-amber-400 border-amber-500/30 ml-auto"}>
                      {debitApi.gateway_url || debitApi.mpesa_sp_code ? "Configurado" : "Por configurar"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    As credenciais aqui guardadas têm prioridade sobre os segredos do servidor. O débito direto empurra um pedido de PIN para o telemóvel do jogador.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Modo */}
                  <div className="space-y-2">
                    <Label>Modo de integração</Label>
                    <Select value={debitApi.mode} onValueChange={(v) => setDebitApi({ ...debitApi, mode: v as DebitApiConfig["mode"] })}>
                      <SelectTrigger className="w-full md:w-[420px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gateway">Gateway agregador (debito pay / e-Mola) — recomendado</SelectItem>
                        <SelectItem value="mpesa_official">API oficial Vodacom MPesa (C2B)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      No modo oficial, o MPesa usa as credenciais abaixo; a e-Mola continua pelo gateway.
                    </p>
                  </div>

                  {/* Gateway */}
                  <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><PlugZap className="h-4 w-4 text-primary" /> Gateway Agregador</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>URL do Gateway</Label>
                        <Input
                          value={debitApi.gateway_url}
                          onChange={(e) => setDebitApi({ ...debitApi, gateway_url: e.target.value })}
                          placeholder="https://api.debitopay.co.mz/v1/debit"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Key do Gateway</Label>
                        <div className="relative">
                          <Input
                            type={showGatewayKey ? "text" : "password"}
                            value={debitApi.gateway_key}
                            onChange={(e) => setDebitApi({ ...debitApi, gateway_key: e.target.value })}
                            placeholder="sk_live_..."
                            className="pr-10"
                          />
                          <button type="button" onClick={() => setShowGatewayKey(!showGatewayKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Mostrar/ocultar chave">
                            {showGatewayKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {debitApi.gateway_key && <p className="text-[10px] text-muted-foreground">Atual: {maskKey(debitApi.gateway_key)}</p>}
                      </div>
                    </div>
                  </div>

                  {/* MPesa oficial */}
                  <div className="rounded-xl border border-[#E21B1B]/20 bg-[#E21B1B]/5 p-4 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-[#E21B1B]"><Smartphone className="h-4 w-4" /> API Oficial Vodacom MPesa <Badge variant="outline" className="text-[10px]">opcional</Badge></h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>SP Code (Service Provider)</Label>
                        <Input
                          value={debitApi.mpesa_sp_code}
                          onChange={(e) => setDebitApi({ ...debitApi, mpesa_sp_code: e.target.value })}
                          placeholder="Ex: 604973"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Base URL</Label>
                        <Input
                          value={debitApi.mpesa_base_url}
                          onChange={(e) => setDebitApi({ ...debitApi, mpesa_base_url: e.target.value })}
                          placeholder="https://api.sandbox.vm.co.mz:18352"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Portal Key (API Key)</Label>
                        <div className="relative">
                          <Input
                            type={showPortalKey ? "text" : "password"}
                            value={debitApi.mpesa_portal_key}
                            onChange={(e) => setDebitApi({ ...debitApi, mpesa_portal_key: e.target.value })}
                            className="pr-10"
                          />
                          <button type="button" onClick={() => setShowPortalKey(!showPortalKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Mostrar/ocultar chave">
                            {showPortalKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {debitApi.mpesa_portal_key && <p className="text-[10px] text-muted-foreground">Atual: {maskKey(debitApi.mpesa_portal_key)}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Public Key</Label>
                        <Input
                          value={debitApi.mpesa_public_key}
                          onChange={(e) => setDebitApi({ ...debitApi, mpesa_public_key: e.target.value })}
                          placeholder="Chave pública do portal developer.mpesa.vm.co.mz"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Métodos ativos */}
                  <div className="rounded-xl border border-primary/15 p-4 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Métodos de Débito Ativos</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { key: "mpesa", label: "MPesa (Vodacom)", hint: "84/85" },
                        { key: "emola", label: "e-Mola (Movitel)", hint: "86/87" },
                        { key: "conta_movel", label: "Conta Móvel", hint: "84/85" },
                        { key: "tkash", label: "TkaX (Tmcel)", hint: "86/87" },
                      ].map((p) => (
                        <div key={p.key} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 border border-border/50">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.label}</p>
                            <p className="text-[10px] text-muted-foreground">Prefixos {p.hint}</p>
                          </div>
                          <Switch
                            checked={debitApi.providers_enabled?.[p.key] !== false}
                            onCheckedChange={(v) => setDebitApi({ ...debitApi, providers_enabled: { ...debitApi.providers_enabled, [p.key]: v } })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleSaveDebitApi} disabled={debitSaving} className="min-w-40">
                      {debitSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar Credenciais
                    </Button>
                    <Button onClick={handleTestDebitApi} disabled={debitTesting} variant="outline" className="min-w-40">
                      {debitTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                      Testar Ligação
                    </Button>
                    {debitApi.configured_at && (
                      <span className="text-xs text-muted-foreground self-center">
                        Última gravação: {new Date(debitApi.configured_at).toLocaleString("pt-PT")}
                      </span>
                    )}
                  </div>

                  {/* Resultado do teste */}
                  {testResult && (
                    <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        {testResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <p className="font-semibold text-sm">
                          {testResult.success ? "Ligação funcional" : "Problemas detetados"}
                          <span className="ml-2 font-normal text-muted-foreground">({testResult.latency_ms}ms, modo {testResult.mode})</span>
                        </p>
                      </div>
                      {testResult.checks.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {c.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-medium text-foreground">{c.name}: </span>
                            <span className="text-muted-foreground">{c.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Configurações
        </Button>
      </div>
    </div>
  );
}
