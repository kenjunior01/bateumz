import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Eye,
  BadgeCheck,
  Gavel,
  Calendar,
  ShieldCheck,
  Fuel,
  Gauge,
  FileCheck,
  Loader2,
  Send,
  Calculator,
  CheckCircle2,
  Building2,
  Wrench,
  MessageCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import {
  leasingQuote,
  paymentSchedule,
  MODALITY_COLORS,
} from "@/lib/alienacao";
import OptimizedImage from "@/components/OptimizedImage";

type Asset = {
  id: string;
  business_user_id: string | null;
  title: string;
  category: string;
  modality: string;
  description: string | null;
  asset_value: number;
  min_down_payment: number;
  max_months: number;
  annual_rate: number;
  residual_pct: number;
  auction_deadline: string | null;
  min_bid: number | null;
  images: string[];
  province: string | null;
  city: string | null;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  registration: string | null;
  documents_ready: boolean;
  warranty_months: number;
  whatsapp: string;
  status: string;
  featured: boolean;
  views_count: number;
  offers_count: number;
  slug: string | null;
};

const MODALITY_LABELS: Record<string, string> = {
  venda_direta: "Venda Direta",
  leasing: "Leasing",
  rent_to_own: "Rent-to-Own",
  leilao: "Leilão / Propostas",
};

const CONDITION_LABELS: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
};

const AlienacaoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  // Simulador
  const [downPct, setDownPct] = useState(20);
  const [months, setMonths] = useState(36);
  const [residualOn, setResidualOn] = useState(true);

  // Proposta
  const [offerAmount, setOfferAmount] = useState("");
  const [offerName, setOfferName] = useState("");
  const [offerPhone, setOfferPhone] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [sending, setSending] = useState(false);

  useSEO({
    title: asset ? `${asset.title} — Alienação Bateu` : "Alienação | Bateu",
    description: asset?.description || "Bem em alienação na plataforma Bateu.",
    canonicalPath: null,
  });

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("alienacao_assets")
      .select("*")
      .eq("slug", id)
      .maybeSingle();

    let loaded: Asset | null = (data as unknown as Asset) || null;
    if (!loaded) {
      const byId = await supabase.from("alienacao_assets").select("*").eq("id", id).maybeSingle();
      loaded = (byId.data as unknown as Asset) || null;
    }
    setAsset(loaded);

    // Incrementa views (fire and forget)
    if (loaded) {
      supabase.rpc("alienacao_increment_view", { asset_id: loaded.id } as any);
    }
    setLoading(false);
  };

  const quote = useMemo(() => {
    if (!asset) return null;
    const useResidual = residualOn && Number(asset.residual_pct) > 0;
    return leasingQuote({
      assetValue: Number(asset.asset_value),
      downPayment: Math.max(Number(asset.asset_value) * (downPct / 100), Number(asset.min_down_payment)),
      months,
      annualRate: Number(asset.annual_rate),
      residualPct: useResidual ? Number(asset.residual_pct) : 0,
    });
  }, [asset, downPct, months, residualOn]);

  const schedule = useMemo(() => {
    if (!asset || !quote) return [];
    return paymentSchedule({
      assetValue: Number(asset.asset_value),
      downPayment: Math.max(Number(asset.asset_value) * (downPct / 100), Number(asset.min_down_payment)),
      months,
      annualRate: Number(asset.annual_rate),
      residualPct: residualOn ? Number(asset.residual_pct) : 0,
    }).slice(0, 12);
  }, [asset, quote, downPct, months, residualOn]);

  const submitOffer = async () => {
    if (!asset) return;
    if (!user) {
      toast.error("Inicie sessão para enviar propostas");
      navigate("/login");
      return;
    }
    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      toast.error("Indique o valor da proposta");
      return;
    }
    if (offerName.trim().length < 2 || !offerPhone.trim()) {
      toast.error("Preencha nome e telefone");
      return;
    }
    setSending(true);
    try {
      const q = leasingQuote({
        assetValue: Number(asset.asset_value),
        downPayment: Math.max(Number(asset.asset_value) * (downPct / 100), Number(asset.min_down_payment)),
        months,
        annualRate: Number(asset.annual_rate),
        residualPct: residualOn ? Number(asset.residual_pct) : 0,
      });
      const offerType =
        asset.modality === "leilao"
          ? "leilao"
          : asset.modality === "rent_to_own"
          ? "rent_to_own"
          : asset.modality === "leasing"
          ? "leasing"
          : "compra";

      const { error } = await supabase.from("alienacao_offers").insert({
        asset_id: asset.id,
        user_id: user.id,
        offer_type: offerType,
        amount,
        down_payment: Math.round(Number(asset.asset_value) * (downPct / 100)),
        months,
        monthly_estimate: q.monthly,
        name: offerName.trim(),
        phone: offerPhone.trim(),
        message: offerMsg.trim() || null,
      });
      if (error) throw error;
      toast.success("Proposta enviada com sucesso! A empresa vai contactá-lo. 🎉");
      setOfferAmount("");
      setOfferMsg("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar proposta");
    } finally {
      setSending(false);
    }
  };

  const waLink = () => {
    if (!asset) return "#";
    const msg = encodeURIComponent(
      `Olá! Vi o bem "${asset.title}" em alienação na Bateu (${formatMZN(Number(asset.asset_value))}) e gostaria de mais informações.`
    );
    return `https://wa.me/${asset.whatsapp.replace(/[^0-9]/g, "")}?text=${msg}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Bem não encontrado</h1>
          <p className="text-muted-foreground mt-2">Este bem pode ter sido concluído ou removido.</p>
          <Button asChild className="mt-6">
            <Link to="/alienacao">← Voltar ao catálogo</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const deadline = asset.auction_deadline ? new Date(asset.auction_deadline) : null;
  const daysLeft = deadline ? Math.max(0, Math.ceil((+deadline - Date.now()) / 86400000)) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 lg:py-10 pb-24">
        <button
          onClick={() => navigate("/alienacao")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar à alienação
        </button>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
          {/* GALERIA */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted aspect-[4/3]">
              {asset.images?.[activeImg] ? (
                <OptimizedImage src={asset.images[activeImg]} alt={asset.title} optimizeWidth={1080} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur ${MODALITY_COLORS[asset.modality]}`}>
                  {MODALITY_LABELS[asset.modality]}
                </span>
                {asset.status === "reservado" && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-white">Reservado</span>
                )}
              </div>
              {asset.modality === "leilao" && daysLeft !== null && (
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-xs font-semibold flex items-center gap-1.5">
                  <Gavel className="h-3.5 w-3.5" /> Encerra em {daysLeft} dias
                </div>
              )}
            </div>
            {asset.images && asset.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {asset.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 h-16 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                      i === activeImg ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <OptimizedImage src={img} alt="" optimizeWidth={160} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* SPECS */}
            <Card className="mt-4 shadow-[0_0_15px_hsl(var(--primary)/0.08)]">
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {asset.brand && (
                  <Spec icon={Wrench} label="Marca" value={asset.brand} />
                )}
                {asset.model && <Spec icon={FileCheck} label="Modelo" value={asset.model} />}
                {asset.year && <Spec icon={Calendar} label="Ano" value={String(asset.year)} />}
                {asset.mileage !== null && asset.mileage !== undefined && (
                  <Spec icon={Gauge} label="Quilometragem" value={`${asset.mileage.toLocaleString("pt-PT")} km`} />
                )}
                <Spec icon={BadgeCheck} label="Estado" value={CONDITION_LABELS[asset.condition] || asset.condition} />
                {asset.warranty_months > 0 && (
                  <Spec icon={ShieldCheck} label="Garantia" value={`${asset.warranty_months} meses`} />
                )}
                {asset.registration && (
                  <Spec icon={FileCheck} label="Matrícula" value={asset.registration} />
                )}
                <Spec
                  icon={FileCheck}
                  label="Documentos"
                  value={asset.documents_ready ? "Prontos ✅" : "Em processo"}
                />
                <Spec icon={MapPin} label="Localização" value={`${asset.city || ""}${asset.city && asset.province ? ", " : ""}${asset.province || ""}` || "—"} />
              </CardContent>
            </Card>

            {asset.description && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Descrição</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {asset.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* INFO + SIMULADOR */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Eye className="h-3.5 w-3.5" /> {asset.views_count} visualizações
              {asset.offers_count > 0 && (
                <>
                  <span>·</span>
                  <Gavel className="h-3.5 w-3.5" /> {asset.offers_count} propostas
                </>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold leading-tight">{asset.title}</h1>
            <p className="mt-3 text-3xl font-bold text-primary">
              {formatMZN(Number(asset.asset_value))}
              {asset.modality === "leilao" && asset.min_bid && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (lance mín. {formatMZN(Number(asset.min_bid))})
                </span>
              )}
            </p>

            {/* SIMULADOR */}
            {(asset.modality === "leasing" || asset.modality === "rent_to_own") && (
              <Card className="mt-5 shadow-[0_0_20px_hsl(var(--primary)/0.12)] border-primary/20">
                <CardContent className="p-5">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <Calculator className="h-4 w-4 text-primary" /> Simulador de {asset.modality === "leasing" ? "Leasing" : "Rent-to-Own"}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <Label>Entrada</Label>
                        <span className="font-semibold text-primary">
                          {downPct}% · {formatMZN(Number(asset.asset_value) * (downPct / 100))}
                        </span>
                      </div>
                      <Slider
                        value={[downPct]}
                        min={Math.round((Number(asset.min_down_payment) / Number(asset.asset_value)) * 100) || 0}
                        max={80}
                        step={5}
                        onValueChange={(v) => setDownPct(v[0])}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <Label>Prazo</Label>
                        <span className="font-semibold text-primary">{months} meses</span>
                      </div>
                      <Slider
                        value={[months]}
                        min={6}
                        max={asset.max_months}
                        step={6}
                        onValueChange={(v) => setMonths(v[0])}
                      />
                    </div>
                    {Number(asset.residual_pct) > 0 && (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={residualOn}
                          onChange={(e) => setResidualOn(e.target.checked)}
                          className="accent-primary h-4 w-4"
                        />
                        Incluir valor residual (balão) de {formatMZN(Number(asset.asset_value) * Number(asset.residual_pct))} no final
                      </label>
                    )}
                  </div>

                  {quote && (
                    <>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-primary/10 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Mensalidade</p>
                          <p className="text-lg font-bold text-primary">{formatMZN(quote.monthly)}</p>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor final</p>
                          <p className="text-sm font-bold mt-0.5">{formatMZN(quote.residual)}</p>
                        </div>
                        <div className="rounded-xl bg-muted p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                          <p className="text-sm font-bold mt-0.5">{formatMZN(quote.totalPaid)}</p>
                        </div>
                      </div>

                      <Tabs defaultValue="resumo" className="mt-4">
                        <TabsList className="w-full">
                          <TabsTrigger value="resumo" className="flex-1 text-xs">Resumo</TabsTrigger>
                          <TabsTrigger value="cronograma" className="flex-1 text-xs">Cronograma</TabsTrigger>
                        </TabsList>
                        <TabsContent value="resumo" className="text-xs text-muted-foreground space-y-1.5 pt-3">
                          <p>• Capital financiado: <strong className="text-foreground">{formatMZN(quote.financed)}</strong></p>
                          <p>• Juros totais no período: <strong className="text-foreground">{formatMZN(quote.totalInterest)}</strong></p>
                          <p>• Taxa anual: <strong className="text-foreground">{(Number(asset.annual_rate) * 100).toFixed(1)}%</strong></p>
                          {asset.modality === "rent_to_own" && (
                            <p className="text-emerald-500">• Cada prestação conta 100% para a aquisição do bem ✅</p>
                          )}
                        </TabsContent>
                        <TabsContent value="cronograma" className="pt-3">
                          <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                            <div className="grid grid-cols-4 gap-2 font-semibold text-muted-foreground pb-1 border-b border-border">
                              <span>Mês</span><span className="text-right">Juros</span><span className="text-right">Capital</span><span className="text-right">Dívida</span>
                            </div>
                            {schedule.map((r) => (
                              <div key={r.month} className="grid grid-cols-4 gap-2 py-0.5">
                                <span>{r.month}</span>
                                <span className="text-right">{formatMZN(r.interest)}</span>
                                <span className="text-right">{formatMZN(r.principal)}</span>
                                <span className="text-right">{formatMZN(r.balance)}</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PROPOSTA */}
            <Card className="mt-5 shadow-[0_0_15px_hsl(var(--primary)/0.08)]">
              <CardContent className="p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <Send className="h-4 w-4 text-primary" />
                  {asset.modality === "leilao" ? "Enviar lance" : "Fazer proposta"}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {asset.modality === "leilao"
                    ? "A melhor proposta dentro do prazo leva o bem."
                    : "A empresa analisa e responde em até 48h."}
                </p>
                <div className="space-y-3">
                  <div>
                    <Label>Valor da proposta (MZN)</Label>
                    <Input
                      type="number"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder={String(Math.round(Number(asset.asset_value) * 0.9))}
                      min={0}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={offerName} onChange={(e) => setOfferName(e.target.value)} placeholder="O seu nome" />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input value={offerPhone} onChange={(e) => setOfferPhone(e.target.value)} placeholder="+258 84..." />
                    </div>
                  </div>
                  <div>
                    <Label>Mensagem (opcional)</Label>
                    <Textarea
                      value={offerMsg}
                      onChange={(e) => setOfferMsg(e.target.value)}
                      rows={2}
                      placeholder="Condições, dúvidas, prazo desejado..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={submitOffer} disabled={sending} className="flex-1">
                      {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Enviar proposta
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={waLink()} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TRUST */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border p-3">
                <ShieldCheck className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-[10px] text-muted-foreground">Contrato seguro</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <CheckCircle2 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-[10px] text-muted-foreground">Bem verificado</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <FileCheck className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-[10px] text-muted-foreground">Documentação ok</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Spec = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  </div>
);

export default AlienacaoDetalhe;
