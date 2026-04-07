"use client";

import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Key,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  Building2,
  Bot,
  RotateCcw,
  Brain,
  Building,
  MessageSquare,
} from "lucide-react";
import { PROVIDER_MODELS } from "@/lib/ai-models";
import type { UserSettingsPublic, AIProvider } from "@/types/models";

type ApiKeyField = "anthropicApiKey" | "openaiApiKey" | "googleApiKey" | "openrouterApiKey";

const PROVIDER_INFO: { id: AIProvider; label: string }[] = [
  { id: "anthropic", label: "Anthropic Claude" },
  { id: "openai", label: "OpenAI GPT" },
  { id: "google", label: "Google Gemini" },
  { id: "openrouter", label: "OpenRouter" },
];

const KEY_CONFIGS: {
  field: ApiKeyField;
  stateKey: "anthropicKey" | "openaiKey" | "googleKey" | "openrouterKey";
  hasKey: keyof UserSettingsPublic;
  hint: keyof UserSettingsPublic;
  label: string;
  placeholder: string;
  description: string;
}[] = [
  {
    field: "anthropicApiKey", stateKey: "anthropicKey",
    hasKey: "hasAnthropicKey", hint: "anthropicKeyHint",
    label: "Anthropic Claude", placeholder: "sk-ant-...",
    description: "console.anthropic.com",
  },
  {
    field: "openaiApiKey", stateKey: "openaiKey",
    hasKey: "hasOpenaiKey", hint: "openaiKeyHint",
    label: "OpenAI", placeholder: "sk-...",
    description: "platform.openai.com",
  },
  {
    field: "googleApiKey", stateKey: "googleKey",
    hasKey: "hasGoogleKey", hint: "googleKeyHint",
    label: "Google Gemini", placeholder: "AIza...",
    description: "aistudio.google.com",
  },
  {
    field: "openrouterApiKey", stateKey: "openrouterKey",
    hasKey: "hasOpenrouterKey", hint: "openrouterKeyHint",
    label: "OpenRouter", placeholder: "sk-or-...",
    description: "openrouter.ai — tek key ile birden fazla model",
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettingsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // AI key state
  const [keys, setKeys] = useState({
    anthropicKey: "", openaiKey: "", googleKey: "", openrouterKey: "",
  });
  const [aiProvider, setAiProvider] = useState<AIProvider>("anthropic");
  const [aiModel, setAiModel] = useState("");
  const [aiTemperature, setAiTemperature] = useState(0.3);
  const [autoClassify, setAutoClassify] = useState(true);

  // Firma bilgileri (eski alanlar - geriye uyumluluk)
  const [companyName, setCompanyName] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  // Haric tutulan markalar
  const [excludedBrands, setExcludedBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");

  // AI Prompt alanları
  const PROMPT_DEFAULTS = {
    classificationPrompt: "Kurumsal hediye, promosyon ürünleri, çalışan motivasyonu, etkinlik organizasyonu ile ilgili postları ilgili olarak işaretle. B2B hediye alımı sinyallerini ve rakip firma aktivitelerini de yakala.",
    companyContext: "Kurumsal hediye ve promosyon sektöründe faaliyet gösteren bir firmayız. Ürünlerimiz: kurumsal hediyeler, promosyon ürünleri, çalışan motivasyon paketleri. Hedef müşterilerimiz: B2B firmalar, İK departmanları, pazarlama ekipleri.",
    messagePrompt: "Samimi ve profesyonel ton kullan. Satış baskısı yapma, değer önerisi sun. Kişinin paylaşımını referans al. Türkçe yaz.",
  };
  const [classificationPrompt, setClassificationPrompt] = useState(PROMPT_DEFAULTS.classificationPrompt);
  const [companyContext, setCompanyContext] = useState(PROMPT_DEFAULTS.companyContext);
  const [messagePrompt, setMessagePrompt] = useState(PROMPT_DEFAULTS.messagePrompt);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: UserSettingsPublic = await res.json();
        setSettings(data);
        setAiProvider(data.aiProvider);
        setAiModel(data.aiModel || "");
        setAiTemperature(data.aiTemperature);
        setAutoClassify(data.autoClassify);
        setCompanyName(data.companyName);
        setCompanySector(data.companySector);
        setProductDescription(data.productDescription);
        setTargetCustomer(data.targetCustomer);
        setCompanyWebsite(data.companyWebsite || "");
        setExcludedBrands(data.excludedBrands || []);
        setClassificationPrompt(data.classificationPrompt || PROMPT_DEFAULTS.classificationPrompt);
        setCompanyContext(data.companyContext || PROMPT_DEFAULTS.companyContext);
        setMessagePrompt(data.messagePrompt || PROMPT_DEFAULTS.messagePrompt);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        aiProvider, aiModel, aiTemperature, autoClassify,
        companyName, companySector, productDescription, targetCustomer, companyWebsite,
        excludedBrands,
        classificationPrompt, companyContext, messagePrompt,
      };
      if (keys.anthropicKey.trim()) body.anthropicApiKey = keys.anthropicKey.trim();
      if (keys.openaiKey.trim()) body.openaiApiKey = keys.openaiKey.trim();
      if (keys.googleKey.trim()) body.googleApiKey = keys.googleKey.trim();
      if (keys.openrouterKey.trim()) body.openrouterApiKey = keys.openrouterKey.trim();

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kaydetme hatası");
      }
      const data: UserSettingsPublic = await res.json();
      setSettings(data);
      setKeys({ anthropicKey: "", openaiKey: "", googleKey: "", openrouterKey: "" });
      setMessage({ type: "success", text: "Ayarlar başarıyla kaydedildi" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Beklenmeyen hata" });
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (keyType: ApiKeyField) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyType]: "" }),
      });
      if (!res.ok) throw new Error("Silme hatası");
      const data: UserSettingsPublic = await res.json();
      setSettings(data);
      setMessage({ type: "success", text: "API anahtarı kaldırıldı" });
    } catch {
      setMessage({ type: "error", text: "Anahtar kaldırılamadı" });
    } finally {
      setSaving(false);
    }
  };

  const currentModels = PROVIDER_MODELS[aiProvider] || [];

  return (
    <AppLayout title="Yapılandırma" description="AI ve firma ayarlarınızı yönetin">
      <div className="max-w-2xl space-y-4">
        {/* Bildirim */}
        {message && (
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {message.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            {message.text}
          </div>
        )}

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              AI Yapılandırması
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              AI Talimatları
            </TabsTrigger>
          </TabsList>

          {/* ============ AI Tab ============ */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            {/* API Keys */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">API Anahtarları</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Anahtarlar AES-256-GCM ile şifreli saklanır
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                ) : (
                  KEY_CONFIGS.map((config, idx) => {
                    const hasKey = settings?.[config.hasKey] as boolean;
                    const hintValue = settings?.[config.hint] as string | null;
                    return (
                      <div key={config.field}>
                        {idx > 0 && <Separator className="mb-4" />}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={config.field} className="text-xs">{config.label}</Label>
                            {hasKey ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 gap-1 h-5">
                                <CheckCircle className="h-2.5 w-2.5" />Aktif
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 h-5">
                                Girilmedi
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              id={config.field}
                              type="password"
                              placeholder={hintValue || config.placeholder}
                              value={keys[config.stateKey]}
                              onChange={(e) => setKeys((p) => ({ ...p, [config.stateKey]: e.target.value }))}
                              className="h-8 text-xs"
                            />
                            {hasKey && (
                              <Button variant="outline" size="icon"
                                className="shrink-0 h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleClearKey(config.field)} disabled={saving}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Model Tercihi */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Model Tercihi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Provider */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Sağlayıcı</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PROVIDER_INFO.map((p) => (
                      <Button key={p.id}
                        variant={aiProvider === p.id ? "default" : "outline"}
                        size="sm" className="h-8 text-xs"
                        onClick={() => { setAiProvider(p.id); setAiModel(""); }}>
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Model Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Varsayılan model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-[10px]">Modeller</SelectLabel>
                        {currentModels.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            <span className="flex items-center justify-between w-full gap-3">
                              {m.label}
                              <Badge variant="outline" className="text-[9px] h-4 px-1 ml-2 shrink-0">
                                {m.tierLabel}
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Boş bırakırsanız önerilen model kullanılır
                  </p>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">AI Sıcaklık (Temperature)</Label>
                    <span className="text-xs font-mono text-muted-foreground">{aiTemperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={aiTemperature}
                    onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Tutarlı (0)</span>
                    <span>Yaratıcı (1)</span>
                  </div>
                </div>

                {/* Auto Classify */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Otomatik Sınıflandırma</Label>
                    <p className="text-[10px] text-muted-foreground">Import sonrası postları otomatik sınıflandır</p>
                  </div>
                  <Switch checked={autoClassify} onCheckedChange={setAutoClassify} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ Firma / AI Talimatları Tab ============ */}
          <TabsContent value="company" className="space-y-4 mt-4">
            {/* Sınıflandırma Talimatı */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Sınıflandırma Talimatı</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  AI hangi LinkedIn postlarını &quot;ilgili&quot; olarak isaretleyecek? Sektorunuze, urunlerinize ve takip etmek istediginiz sinyallere gore talimat verin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  id="classification-prompt"
                  value={classificationPrompt}
                  onChange={(e) => setClassificationPrompt(e.target.value)}
                  placeholder="Ornek: SaaS, bulut bilisim, dijital donusum ile ilgili postlari ilgili olarak isaretle..."
                  className="text-xs min-h-[100px] resize-y"
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-2"
                    onClick={() => setClassificationPrompt(PROMPT_DEFAULTS.classificationPrompt)}
                    disabled={classificationPrompt === PROMPT_DEFAULTS.classificationPrompt}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Varsayilana Sifirla
                  </Button>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {classificationPrompt.length}/1000
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Haric Tutulan Markalar */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Haric Tutulan Markalar</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Kendi markaniz ve pipeline&apos;da gormek istemediginiz markalar. Bu markalardan gelen postlar lead olarak cikarilmaz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Marka adi yazin ve Enter'a basin..."
                    value={brandInput}
                    onChange={(e) => setBrandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && brandInput.trim()) {
                        e.preventDefault();
                        const brand = brandInput.trim();
                        if (!excludedBrands.some((b) => b.toLowerCase() === brand.toLowerCase())) {
                          setExcludedBrands((prev) => [...prev, brand]);
                        }
                        setBrandInput("");
                      }
                    }}
                    className="text-xs"
                  />
                </div>
                {excludedBrands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {excludedBrands.map((brand, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                        {brand}
                        <button
                          type="button"
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                          onClick={() => setExcludedBrands((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {excludedBrands.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Henuz marka eklenmedi. Firma adiniz ({companyName || "belirtilmemis"}) otomatik olarak haric tutulur.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Firma Bağlamı */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Firma Baglami</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  AI&apos;in bilmesi gereken firma bilgileri. Sektorunuz, urunleriniz, hedef kitleniz — ne kadar detay verirseniz AI o kadar isabetli calisir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  id="company-context"
                  value={companyContext}
                  onChange={(e) => setCompanyContext(e.target.value)}
                  placeholder="Ornek: Yazilim sektorunde B2B SaaS urunleri gelistiriyoruz. CRM ve otomasyon araclarimiz var..."
                  className="text-xs min-h-[100px] resize-y"
                  maxLength={1500}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-2"
                    onClick={() => setCompanyContext(PROMPT_DEFAULTS.companyContext)}
                    disabled={companyContext === PROMPT_DEFAULTS.companyContext}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Varsayilana Sifirla
                  </Button>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {companyContext.length}/1500
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Mesaj Oluşturma Talimatı */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Mesaj Olusturma Talimati</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  AI lead&apos;lere mesaj yazarken hangi tonu, yaklasimi ve kurallari kullansin? Dil tercihi, uzunluk, icerik yonergeleri belirtin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  id="message-prompt"
                  value={messagePrompt}
                  onChange={(e) => setMessagePrompt(e.target.value)}
                  placeholder="Ornek: Resmi ama sicak bir ton kullan. Maksimum 3 cumle. Ingilizce yaz..."
                  className="text-xs min-h-[100px] resize-y"
                  maxLength={1000}
                />
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 px-2"
                    onClick={() => setMessagePrompt(PROMPT_DEFAULTS.messagePrompt)}
                    disabled={messagePrompt === PROMPT_DEFAULTS.messagePrompt}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Varsayilana Sifirla
                  </Button>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {messagePrompt.length}/1000
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Bilgi notu */}
            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                Bu talimatlar yalnizca AI siniflandirma ve mesaj olusturma sureclerinde kullanilir.
                Ucuncu taraflarla paylasilmaz. Talimatlarinizi ne kadar detayli yazarsaniz, AI o kadar isabetli calisir.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Global Kaydet */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Ayarları Kaydet</>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
