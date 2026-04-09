"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  MessageSquare,
  Building,
  Briefcase,
  Target,
  FileText,
  Loader2,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Swords,
  ThumbsUp,
  MessageCircle,
  Share2,
  Tag,
  Mail,
  Send,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";
import { type LeadData } from "./pipeline-table";

const API_STAGES = [
  { value: "İletişim Kurulacak", label: "İletişim Kurulacak" },
  { value: "İletişim Kuruldu", label: "İletişim Kuruldu" },
  { value: "Cevap Alındı", label: "Cevap Alındı" },
  { value: "Görüşme", label: "Görüşme" },
  { value: "Teklif", label: "Teklif" },
  { value: "Arşiv", label: "Arşiv" },
];

interface LeadPost {
  id: string;
  content: string;
  authorName: string;
  authorCompany: string | null;
  linkedinPostUrl: string;
  engagementLikes: number;
  engagementComments: number;
  engagementShares: number;
  publishedAt: string;
  theme: string | null;
  giftType: string | null;
  competitor: string | null;
  classificationReasoning: string | null;
}

interface LeadDetailPanelProps {
  open: boolean;
  onClose: () => void;
  lead: LeadData | null;
  onStageChange?: (leadId: string, newStage: string) => void;
  onCompetitorChange?: (leadId: string, isCompetitor: boolean) => void;
}

export function LeadDetailPanel({ open, onClose, lead, onStageChange, onCompetitorChange }: LeadDetailPanelProps) {
  const [currentStage, setCurrentStage] = useState(lead?.stage ?? "");
  const [saving, setSaving] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string; messageType: string; subject: string | null; body: string; status: string;
    deliveryStatus?: string; deliveryError?: string | null; sentAt?: string | null;
  }>>([]);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [leadPosts, setLeadPosts] = useState<LeadPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [competitorToggling, setCompetitorToggling] = useState(false);
  const [leadEmail, setLeadEmail] = useState(lead?.email || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    setCurrentStage(lead?.stage ?? "");
    setLeadEmail(lead?.email || "");
    setEditingEmail(false);
    setMessages([]);
    setMessageError(null);
    setLeadPosts([]);

    if (!lead?.id) return;

    const controller = new AbortController();
    const { signal } = controller;

    // Mesajlari cek
    fetch(`/api/leads/${lead.id}/messages`, { signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.messages && !signal.aborted) setMessages(data.messages); })
      .catch(() => {});

    // Post'lari cek
    setPostsLoading(true);
    fetch(`/api/leads/${lead.id}`, { signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.posts && !signal.aborted) setLeadPosts(data.posts); })
      .catch(() => {})
      .finally(() => { if (!signal.aborted) setPostsLoading(false); });

    return () => controller.abort();
  }, [lead?.id, lead?.stage, lead?.email]);

  const handleToggleCompetitor = async () => {
    if (!lead) return;
    setCompetitorToggling(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/competitor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompetitor: !lead.isCompetitor }),
      });
      if (res.ok) {
        onCompetitorChange?.(lead.id, !lead.isCompetitor);
      }
    } catch {} finally {
      setCompetitorToggling(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!lead) return;
    setGeneratingMessage(true);
    setMessageError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-message`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Mesaj oluşturulamadı");
      }
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Beklenmeyen hata");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleApproveMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages/${msgId}/approve`, { method: "POST" });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "approved" } : m));
      }
    } catch {}
  };

  const handleRejectMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages/${msgId}/reject`, { method: "POST" });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "rejected" } : m));
      }
    } catch {}
  };

  const handleSaveEmail = async () => {
    if (!lead) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: leadEmail }),
      });
      if (res.ok) {
        lead.email = leadEmail;
        setEditingEmail(false);
      }
    } catch {} finally {
      setSavingEmail(false);
    }
  };

  const handleSendEmail = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages/${msgId}/send`, { method: "POST" });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "sent", deliveryStatus: "sent", sentAt: new Date().toISOString() } : m));
      } else {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deliveryStatus: "failed", deliveryError: data.error || "Gonderim basarisiz" } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deliveryStatus: "failed", deliveryError: "Ag hatasi" } : m));
    }
  };

  const handleMarkSent = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages/${msgId}/mark-sent`, { method: "PATCH" });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "sent", sentAt: new Date().toISOString() } : m));
      }
    } catch {}
  };

  if (!lead) return null;

  const initials = lead.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleStageChange = async (newStage: string) => {
    setCurrentStage(newStage);
    if (onStageChange) {
      setSaving(true);
      try {
        await onStageChange(lead.id, newStage);
      } finally {
        setSaving(false);
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lead Detayi</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profil bilgileri */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              {lead.profilePicture && (
                <AvatarImage src={lead.profilePicture} alt={lead.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{lead.name}</h3>
              {lead.title && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Briefcase className="h-3 w-3" />
                  {lead.title}
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building className="h-3 w-3" />
                  {lead.company}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {lead.projectType && (
                  <Badge variant="outline" className="text-[10px]">
                    <Tag className="mr-1 h-3 w-3" />
                    {lead.projectType}
                  </Badge>
                )}
                <Button
                  variant={lead.isCompetitor ? "destructive" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={handleToggleCompetitor}
                  disabled={competitorToggling}
                >
                  <Swords className="mr-1 h-3 w-3" />
                  {lead.isCompetitor ? "Rakip" : "Rakip Isaretle"}
                </Button>
              </div>
              {lead.linkedinUrl && (
                <a
                  href={lead.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-blue-600 hover:underline mt-1"
                >
                  <LinkedinIcon className="mr-1 h-3 w-3" />
                  LinkedIn Profilini Ac
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              )}
              {/* Email alani */}
              <div className="mt-2">
                {!leadEmail || editingEmail ? (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Input
                      type="email"
                      placeholder="Email adresi ekle..."
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      className="h-7 text-[11px] px-2"
                      onClick={handleSaveEmail}
                      disabled={savingEmail || !leadEmail.trim()}
                    >
                      {savingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : "Kaydet"}
                    </Button>
                    {editingEmail && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] px-2"
                        onClick={() => { setEditingEmail(false); setLeadEmail(lead?.email || ""); }}
                      >
                        Iptal
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{leadEmail}</span>
                    <button
                      className="ml-1 hover:text-foreground"
                      onClick={() => setEditingEmail(true)}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Skor ve Asama */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Lead Skoru</p>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold ${getScoreColor(lead.score)}`}>{lead.score}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Pipeline Asamasi</p>
              <Select value={currentStage || lead.stage} onValueChange={handleStageChange} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {API_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skor kirilimi */}
          {lead.scoreBreakdown && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Skor Kirilimi</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(lead.scoreBreakdown).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      companySize: "Sirket Buyuklugu",
                      projectClarity: "Proje Netligi",
                      industryFit: "Sektor Uyumu",
                      timing: "Zamanlama",
                      competitorStatus: "Rakip Durumu",
                    };
                    return (
                      <div key={key} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                        <span className="text-xs text-muted-foreground">{labels[key] || key}</span>
                        <span className="text-xs font-medium">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Sorun noktalari ve ilgi alanlari */}
          {lead.painPoints && lead.painPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Target className="h-4 w-4 text-red-500" />
                Sorun Noktalari
              </p>
              <div className="flex flex-wrap gap-1">
                {lead.painPoints.map((point, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {lead.keyInterests && lead.keyInterests.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Ilgi Alanlari</p>
              <div className="flex flex-wrap gap-1">
                {lead.keyInterests.map((interest, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Gonderiler ve Analiz */}
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <FileText className="h-4 w-4 text-blue-500" />
              Gonderiler ve Analiz ({leadPosts.length})
            </p>
            {postsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : leadPosts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Gonderi bulunamadi</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {leadPosts.map((post) => (
                  <div key={post.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <p className="text-sm line-clamp-3">{post.content}</p>
                    {/* Tema / Hediye Tipi / Rakip badge'leri */}
                    <div className="flex flex-wrap gap-1">
                      {post.giftType && (
                        <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200">
                          {post.giftType}
                        </Badge>
                      )}
                      {post.theme && (
                        <Badge variant="secondary" className="text-[9px]">
                          {post.theme}
                        </Badge>
                      )}
                      {post.competitor && (
                        <Badge className="text-[9px] bg-red-100 text-red-700 border-red-200">
                          <Swords className="mr-0.5 h-2.5 w-2.5" />
                          {post.competitor}
                        </Badge>
                      )}
                    </div>
                    {/* Engagement */}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <ThumbsUp className="h-3 w-3" />{post.engagementLikes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3" />{post.engagementComments}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Share2 className="h-3 w-3" />{post.engagementShares}
                      </span>
                      {post.linkedinPostUrl && (
                        <a
                          href={post.linkedinPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-auto flex items-center gap-0.5"
                        >
                          Orijinal <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {/* AI Analiz Aciklamasi */}
                    {post.classificationReasoning && (
                      <details className="text-[10px]">
                        <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                          AI Analiz Aciklamasi
                        </summary>
                        <p className="mt-1 text-muted-foreground whitespace-pre-line">
                          {post.classificationReasoning}
                        </p>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Ek bilgiler */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Gonderi Sayisi</p>
              <p className="text-sm font-medium">{lead.postCount}</p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Kaynak</p>
              <p className="text-sm font-medium">
                {lead.source === "post_author" ? "Yazar" : lead.source === "commenter" ? "Yorum Yapan" : "Begenen"}
              </p>
            </div>
          </div>

          {/* Mesaj Olusturma */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Mesajlar
              </p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleGenerateMessage}
                disabled={generatingMessage}
              >
                {generatingMessage ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mesaj Oluşturuluyor...</>
                ) : (
                  <><MessageSquare className="mr-2 h-4 w-4" />AI ile Mesaj Oluştur</>
                )}
              </Button>

              {messageError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {messageError}
                </div>
              )}

              {messages.length === 0 && !generatingMessage && !messageError && (
                <div className="rounded-md border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Mesaj oluşturmak için yukarıdaki butona tıklayın
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {msg.messageType === "dm" ? "LinkedIn DM" : "E-posta"}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${
                        msg.status === "approved" ? "bg-emerald-500 text-white" :
                        msg.status === "rejected" ? "bg-red-500 text-white" :
                        "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {msg.status === "approved" ? "Onaylandı" :
                       msg.status === "rejected" ? "Reddedildi" : "Onay Bekliyor"}
                    </Badge>
                  </div>
                  {msg.subject && (
                    <p className="text-xs font-medium">Konu: {msg.subject}</p>
                  )}
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{msg.body}</p>
                  {msg.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-[11px] flex-1" onClick={() => handleApproveMessage(msg.id)}>
                        <CheckCircle className="mr-1 h-3 w-3" />Onayla
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1" onClick={() => handleRejectMessage(msg.id)}>
                        <XCircle className="mr-1 h-3 w-3" />Reddet
                      </Button>
                    </div>
                  )}
                  {msg.status === "approved" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Email Gönder — lead'de email varsa her mesaj tipi için */}
                      {leadEmail ? (
                        <Button size="sm" className="h-7 text-[11px]"
                          onClick={() => handleSendEmail(msg.id)}>
                          <Send className="mr-1 h-3 w-3" />Email Gönder
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Önce Email Ekle
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-[11px]"
                        onClick={() => { navigator.clipboard.writeText(msg.body); }}>
                        <Copy className="mr-1 h-3 w-3" />Kopyala
                      </Button>
                      {lead.linkedinUrl && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                          <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" />LinkedIn
                          </a>
                        </Button>
                      )}
                      {msg.messageType === "dm" && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]"
                          onClick={() => handleMarkSent(msg.id)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />Gönderildi İşaretle
                        </Button>
                      )}
                    </div>
                  )}
                  {msg.status === "sent" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Gonderildi
                      </Badge>
                      {msg.sentAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.sentAt).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>
                  )}
                  {msg.deliveryStatus === "failed" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Basarisiz
                      </Badge>
                      {msg.deliveryError && (
                        <span className="text-[10px] text-red-500">{msg.deliveryError}</span>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-[11px] ml-auto"
                        onClick={() => handleSendEmail(msg.id)}>
                        <Send className="mr-1 h-3 w-3" />Tekrar Dene
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
