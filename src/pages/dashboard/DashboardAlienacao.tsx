// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Loader2,
  Package,
  Pencil,
  Trash2,
  Eye,
  Gavel,
  X,
  CheckCircle2,
  Building2,
  TrendingUp,
  FileSignature,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import {
  ALIENACAO_CATEGORIES,
  ALIENACAO_MODALITIES,
  ALIENACAO_STATUSES,
  leasingQuote,
  STATUS_COLORS,
  MODALITY_COLORS,
} from "@/lib/alienacao";
import { ImagePlus, X as XIcon } from "lucide-react";
import { uploadImageToBucket } from "@/components/ImageUploadField";
import MapLocationPicker from "@/components/MapLocationPicker";
import type { AlienacaoCategory, AlienacaoModality, AlienacaoStatus } from "@/lib/alienacao";

type Asset = {
  id: string;
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
  lat?: number | null;
  lng?: number | null;
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

type Offer = {
  id: string;
  asset_id: string;
  offer_type: string;
  amount: number;
  down_payment: number;
  months: number;
  monthly_estimate: number | null;
  name: string;
  phone: string;
  message: string | null;
  status: string;
  created_at: string;
  alienacao_assets?: { title: string } | null;
};

const emptyForm = (category: AlienacaoCategory = "viaturas"): FormState => ({
  title: "",
  category,
  modality: "leasing",
  description: "",
  asset_value: "",
  min_down_payment: "",
  max_months: "36",
  annual_rate: "0.14",
  residual_pct: "0.2",
  auction_deadline: "",
  min_bid: "",
  images: [],
  province: "",
  city: "",
  lat: null,
  lng: null,
  condition: "usado",
  brand: "",
  model: "",
  year: "",
  mileage: "",
  registration: "",
  documents_ready: false,
  warranty_months: "0",
  whatsapp: "",
  status: "disponivel",
  featured: false,
});

type FormState = {
  title: string;
  category: AlienacaoCategory;
  modality: AlienacaoModality;
  description: string;
  asset_value: string;
  min_down_payment: string;
  max_months: string;
  annual_rate: string;
  residual_pct: string;
  auction_deadline: string;
  min_bid: string;
  images: string[];
  province: string;
  city: string;
  lat: number | null;
  lng: number | null;
  condition: string;
  brand: string;
  model: string;
  year: string;
  mileage: string;
  registration: string;
  documents_ready: boolean;
  warranty_months: string;
  whatsapp: string;
  status: AlienacaoStatus;
  featured: boolean;
};

const DashboardAlienacao = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("assets");

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: a }, { data: o }] = await Promise.all([
      supabase.from("alienacao_assets").select("*").eq("business_user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("alienacao_offers")
        .select("*, alienacao_assets!inner(title, business_user_id)")
        .eq("alienacao_assets.business_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setAssets((a as unknown as Asset[]) || []);
    setOffers((o as unknown as Offer[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({
      title: a.title,
      category: a.category as AlienacaoCategory,
      modality: a.modality as AlienacaoModality,
      description: a.description || "",
      asset_value: String(a.asset_value),
      min_down_payment: String(a.min_down_payment),
      max_months: String(a.max_months),
      annual_rate: String(a.annual_rate),
      residual_pct: String(a.residual_pct),
      auction_deadline: a.auction_deadline ? a.auction_deadline.slice(0, 10) : "",
      min_bid: a.min_bid ? String(a.min_bid) : "",
      images: a.images || [],
      province: a.province || "",
      city: a.city || "",
      lat: a.lat ?? null,
      lng: a.lng ?? null,
      condition: a.condition,
      brand: a.brand || "",
      model: a.model || "",
      year: a.year ? String(a.year) : "",
      mileage: a.mileage ? String(a.mileage) : "",
      registration: a.registration || "",
      documents_ready: a.documents_ready,
      warranty_months: String(a.warranty_months),
      whatsapp: a.whatsapp,
      status: a.status as AlienacaoStatus,
      featured: a.featured,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const val = Number(form.asset_value);
    if (form.title.trim().length < 3) return toast.error("Título muito curto");
    if (!val || val <= 0) return toast.error("Valor do bem inválido");
    if (!form.whatsapp.trim()) return toast.error("WhatsApp obrigatório");

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        modality: form.modality,
        description: form.description.trim() || null,
        asset_value: val,
        min_down_payment: Number(form.min_down_payment) || 0,
        max_months: Number(form.max_months) || 36,
        annual_rate: Number(form.annual_rate) || 0.14,
        residual_pct: Number(form.residual_pct) || 0,
        auction_deadline:
          form.modality === "leilao" && form.auction_deadline
            ? new Date(form.auction_deadline).toISOString()
            : null,
        min_bid: form.min_bid ? Number(form.min_bid) : null,
        images: form.images,
        province: form.province.trim() || null,
        city: form.city.trim() || null,
        lat: form.lat,
        lng: form.lng,
        condition: form.condition,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        registration: form.registration.trim() || null,
        documents_ready: form.documents_ready,
        warranty_months: Number(form.warranty_months) || 0,
        whatsapp: form.whatsapp.trim(),
        status: form.status,
        featured: form.featured,
      };

      if (editing) {
        const { error } = await supabase.from("alienacao_assets").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Bem atualizado!");
      } else {
        const { error } = await supabase.from("alienacao_assets").insert({ ...payload, business_user_id: user.id });
        if (error) throw error;
        toast.success("Bem publicado no catálogo! 🎉");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Asset) => {
    if (!confirm(`Remover "${a.title}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("alienacao_assets").delete().eq("id", a.id);
    if (error) return toast.error("Erro ao remover");
    toast.success("Bem removido");
    load();
  };

  const respondOffer = async (offer: Offer, status: "aceite" | "recusada") => {
    const { error } = await supabase.from("alienacao_offers").update({ status }).eq("id", offer.id);
    if (error) return toast.error("Erro ao atualizar proposta");
    toast.success(status === "aceite" ? "Proposta aceite! Contacte o interessado. ✅" : "Proposta recusada");
    load();
  };

  const createContract = async (offer: Offer) => {
    if (!confirm("Gerar contrato de alienação e cronograma de pagamentos?")) return;
    const { data, error } = await supabase.rpc("alienacao_create_lease", {
      p_asset_id: offer.asset_id,
      p_offer_id: offer.id,
      p_modality: offer.offer_type,
      p_asset_value: offer.amount,
      p_down_payment: offer.down_payment,
      p_monthly: offer.monthly_estimate || Math.round(offer.amount / Math.max(offer.months, 1)),
      p_months: offer.months,
      p_annual_rate: 0.14,
      p_residual: 0,
    } as any);
    if (error) return toast.error("Erro ao criar contrato");
    toast.success(`Contrato #${(data as string)?.slice(0, 8)} criado! 📝`);
    load();
  };

  const stats = useMemo(() => {
    const totalValue = assets.reduce((s, a) => s + Number(a.asset_value), 0);
    const views = assets.reduce((s, a) => s + a.views_count, 0);
    const pending = offers.filter((o) => o.status === "pendente").length;
    return { total: assets.length, totalValue, views, pending };
  }, [assets, offers]);

  const pendingOffers = offers.filter((o) => o.status === "pendente");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Alienação de Bens
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Publique bens para venda direta, leasing, rent-to-own ou leilão e gerencie propostas.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Publicar bem
          </Button>
        </div>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Bens publicados", value: stats.total, icon: Package, glow: true },
          { label: "Valor total", value: formatMZN(stats.totalValue), icon: TrendingUp, glow: false },
          { label: "Visualizações", value: stats.views, icon: Eye, glow: false },
          { label: "Propostas pendentes", value: stats.pending, icon: Gavel, glow: stats.pending > 0 },
        ].map((s) => (
          <Card
            key={s.label}
            className={s.glow ? "shadow-[0_0_18px_hsl(var(--primary)/0.2)] border-primary/30" : "shadow-[0_0_12px_hsl(var(--primary)/0.08)]"}
          >
            <CardContent className="p-4">
              <s.icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-lg font-bold leading-tight">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assets">Meus Bens ({assets.length})</TabsTrigger>
          <TabsTrigger value="offers">
            Propostas {pendingOffers.length > 0 && <Badge className="ml-1.5 bg-orange-500 text-white">{pendingOffers.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          {loading ? (
            <Card><CardContent className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></CardContent></Card>
          ) : assets.length === 0 ? (
            <Card className="p-10 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">Nenhum bem publicado ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Publique o primeiro bem para começar a receber propostas.</p>
              <Button onClick={openCreate} className="mt-4"><Plus className="h-4 w-4 mr-2" /> Publicar bem</Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {assets.map((a) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="shadow-[0_0_12px_hsl(var(--primary)/0.06)]">
                    <CardContent className="p-4 flex flex-wrap items-center gap-4">
                      {a.images?.[0] ? (
                        <img src={a.images[0]} alt="" className="h-16 w-20 rounded-lg object-cover" />
                      ) : (
                        <div className="h-16 w-20 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-[180px]">
                        <p className="font-semibold text-sm">{a.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${MODALITY_COLORS[a.modality]}`}>
                            {ALIENACAO_MODALITIES.find((m) => m.id === a.modality)?.label}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[a.status]}`}>
                            {ALIENACAO_STATUSES.find((s) => s.value === a.status)?.label}
                          </span>
                          {a.featured && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500">⭐ Destaque</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatMZN(Number(a.asset_value))}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 justify-end">
                          <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{a.views_count}</span>
                          <span className="inline-flex items-center gap-0.5"><Gavel className="h-3 w-3" />{a.offers_count}</span>
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => remove(a)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          {offers.length === 0 ? (
            <Card className="p-10 text-center">
              <Gavel className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">Sem propostas ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Quando receber propostas elas aparecem aqui.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {offers.map((o) => (
                <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={o.status === "pendente" ? "border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.12)]" : ""}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{o.name}</p>
                            <Badge variant={o.status === "pendente" ? "default" : "secondary"} className="text-[10px]">
                              {o.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{o.offer_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {o.alienacao_assets?.title || "Bem"} · {o.phone}
                          </p>
                          {o.message && <p className="text-xs mt-1.5 italic text-muted-foreground">"{o.message}"</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatMZN(Number(o.amount))}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {o.months}x · entrada {formatMZN(Number(o.down_payment))}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {o.status === "pendente" && (
                            <>
                              <Button size="sm" onClick={() => respondOffer(o, "aceite")}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aceitar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => respondOffer(o, "recusada")}>
                                <X className="h-3.5 w-3.5 mr-1" /> Recusar
                              </Button>
                            </>
                          )}
                          {o.status === "aceite" && (
                            <Button size="sm" variant="secondary" onClick={() => createContract(o)}>
                              <FileSignature className="h-3.5 w-3.5 mr-1" /> Gerar contrato
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG CREATE/EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar bem" : "Publicar bem para alienação"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Toyota Hilux 2022 4x4 — Leasing" />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as AlienacaoCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALIENACAO_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modalidade *</Label>
                <Select value={form.modality} onValueChange={(v) => setForm({ ...form, modality: v as AlienacaoModality })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALIENACAO_MODALITIES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do bem (MZN) *</Label>
                <Input type="number" value={form.asset_value} onChange={(e) => setForm({ ...form, asset_value: e.target.value })} />
              </div>
              <div>
                <Label>Entrada mínima (MZN)</Label>
                <Input type="number" value={form.min_down_payment} onChange={(e) => setForm({ ...form, min_down_payment: e.target.value })} />
              </div>
              <div>
                <Label>Prazo máximo (meses)</Label>
                <Input type="number" value={form.max_months} onChange={(e) => setForm({ ...form, max_months: e.target.value })} />
              </div>
              <div>
                <Label>Taxa anual (0.14 = 14%)</Label>
                <Input type="number" step="0.01" value={form.annual_rate} onChange={(e) => setForm({ ...form, annual_rate: e.target.value })} />
              </div>
              <div>
                <Label>Valor residual (0.2 = 20%)</Label>
                <Input type="number" step="0.05" value={form.residual_pct} onChange={(e) => setForm({ ...form, residual_pct: e.target.value })} />
              </div>
              <div>
                <Label>WhatsApp *</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+258 84..." />
              </div>

              {form.modality === "leilao" && (
                <>
                  <div>
                    <Label>Prazo do leilão</Label>
                    <Input type="date" value={form.auction_deadline} onChange={(e) => setForm({ ...form, auction_deadline: e.target.value })} />
                  </div>
                  <div>
                    <Label>Lance mínimo (MZN)</Label>
                    <Input type="number" value={form.min_bid} onChange={(e) => setForm({ ...form, min_bid: e.target.value })} />
                  </div>
                </>
              )}
              <div>
                <Label>Marca</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="seminovo">Seminovo</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quilometragem</Label>
                <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Província</Label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Localização no mapa (aparece no Mundo Aberto GO)</Label>
                <div className="mt-1.5">
                  <MapLocationPicker
                    lat={form.lat}
                    lng={form.lng}
                    onChange={(v) => setForm({ ...form, lat: v?.lat ?? null, lng: v?.lng ?? null })}
                  />
                </div>
              </div>
              <div>
                <Label>Garantia (meses)</Label>
                <Input type="number" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} />
              </div>
              <div>
                <Label>Matrícula / Registo</Label>
                <Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do bem, condições de leasing, garantias..." />
              </div>
            </div>

            <div>
              <Label>Imagens ({form.images.length}/10)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {form.images.map((img, i) => (
                  <div key={i} className="relative h-20 w-24 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {form.images.length < 10 && (
                  <button
                    type="button"
                    disabled={uploadingImg}
                    onClick={() => galleryRef.current?.click()}
                    className="h-20 w-24 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center text-muted-foreground gap-1 transition-colors"
                  >
                    {uploadingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    <span className="text-[10px]">{uploadingImg ? "A enviar…" : "Adicionar"}</span>
                  </button>
                )}
              </div>
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  setUploadingImg(true);
                  try {
                    const urls: string[] = [];
                    for (const f of files.slice(0, 10 - form.images.length)) {
                      const url = await uploadImageToBucket("alienacao-assets", `assets/${user?.id || "anon"}`, f);
                      urls.push(url);
                    }
                    setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
                    toast.success(`${urls.length} imagem(ns) enviada(s)`);
                  } catch (err: any) {
                    toast.error("Erro no upload: " + (err.message || "desconhecido"));
                  } finally {
                    setUploadingImg(false);
                    if (galleryRef.current) galleryRef.current.value = "";
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.documents_ready} onCheckedChange={(v) => setForm({ ...form, documents_ready: v })} />
                Documentação pronta
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
                ⭐ Bem em destaque
              </label>
            </div>

            <div>
              <Label>Estado da publicação</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AlienacaoStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALIENACAO_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.asset_value && Number(form.asset_value) > 0 && form.modality !== "venda_direta" && form.modality !== "leilao" && (
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-sm">
                <p className="font-semibold text-primary mb-1">Pré-visualização da prestação</p>
                <p>
                  Exemplo 30% entrada, {Math.min(Number(form.max_months) || 36, 36)} meses:{" "}
                  <strong>
                    {formatMZN(
                      leasingQuote({
                        assetValue: Number(form.asset_value),
                        downPayment: Number(form.asset_value) * 0.3,
                        months: Math.min(Number(form.max_months) || 36, 36),
                        annualRate: Number(form.annual_rate) || 0.14,
                        residualPct: Number(form.residual_pct) || 0,
                      }).monthly
                    )}
                    /mês
                  </strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Guardar alterações" : "Publicar bem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardAlienacao;
