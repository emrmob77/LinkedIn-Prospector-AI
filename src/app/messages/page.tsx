"use client";

import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  MessageDetailDialog,
  type MessageWithLead,
} from "@/components/messages/message-detail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Search,
  Mail,
  MessageSquare,
  Check,
  X,
  Send,
  Copy,
  ExternalLink,
  CheckCheck,
  Loader2,
  Inbox,
} from "lucide-react";

// ============================================
// Tipler
// ============================================

interface MessagesResponse {
  messages: MessageWithLead[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// Sabitler
// ============================================

const STATUS_OPTIONS = [
  { value: "all", label: "Tum Durumlar" },
  { value: "pending", label: "Onay Bekliyor" },
  { value: "approved", label: "Onaylandi" },
  { value: "sent", label: "Gonderildi" },
  { value: "rejected", label: "Reddedildi" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Tum Tipler" },
  { value: "email", label: "Email" },
  { value: "dm", label: "DM" },
];

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Onay Bekliyor", variant: "outline" },
  approved: { label: "Onaylandi", variant: "default" },
  rejected: { label: "Reddedildi", variant: "destructive" },
  sent: { label: "Gonderildi", variant: "secondary" },
};

// ============================================
// Stats kartlari
// ============================================

function StatsCards({ messages }: { messages: MessageWithLead[] }) {
  const pending = messages.filter((m) => m.status === "pending").length;
  const approved = messages.filter((m) => m.status === "approved").length;
  const sent = messages.filter((m) => m.status === "sent").length;
  const rejected = messages.filter((m) => m.status === "rejected").length;

  const cards = [
    {
      label: "Onay Bekliyor",
      count: pending,
      color: "bg-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      text: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Onaylandi",
      count: approved,
      color: "bg-green-500",
      bg: "bg-green-50 dark:bg-green-950/20",
      text: "text-green-700 dark:text-green-300",
    },
    {
      label: "Gonderildi",
      count: sent,
      color: "bg-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      text: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Reddedildi",
      count: rejected,
      color: "bg-red-500",
      bg: "bg-red-50 dark:bg-red-950/20",
      text: "text-red-700 dark:text-red-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.bg} p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-2 w-2 rounded-full ${c.color}`} />
            <p className={`text-xs font-medium ${c.text}`}>{c.label}</p>
          </div>
          <p className="text-2xl font-bold">{c.count}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Ana Sayfa
// ============================================

export default function MessagesPage() {
  // Data state
  const [messages, setMessages] = useState<MessageWithLead[]>([]);
  const [allMessages, setAllMessages] = useState<MessageWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filtreler
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog
  const [selectedMessage, setSelectedMessage] = useState<MessageWithLead | null>(null);

  // Inline action loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mesajlari cek
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "100");

      const res = await fetch(`/api/messages?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Mesajlar yuklenemedi (${res.status})`);
      }
      const data: MessagesResponse = await res.json();
      setMessages(data.messages);
      setTotal(data.total);

      // Ilk yuklemede tum mesajlari kaydet (stats icin)
      if (statusFilter === "all" && typeFilter === "all" && !searchQuery) {
        setAllMessages(data.messages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ============================================
  // Aksiyonlar
  // ============================================

  const handleApprove = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}/approve`, { method: "POST" });
    if (!res.ok) throw new Error("Onaylama basarisiz");
    const data = await res.json();
    // Optimistic update
    const updater = (prev: MessageWithLead[]) =>
      prev.map((m) => (m.id === id ? { ...m, ...data.message } : m));
    setMessages(updater);
    setAllMessages(updater);
    setSelectedMessage((prev) =>
      prev?.id === id ? { ...prev, ...data.message } : prev
    );
  }, []);

  const handleReject = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}/reject`, { method: "POST" });
    if (!res.ok) throw new Error("Reddetme basarisiz");
    const data = await res.json();
    const updater = (prev: MessageWithLead[]) =>
      prev.map((m) => (m.id === id ? { ...m, ...data.message } : m));
    setMessages(updater);
    setAllMessages(updater);
    setSelectedMessage((prev) =>
      prev?.id === id ? { ...prev, ...data.message } : prev
    );
  }, []);

  const handleSendEmail = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}/send`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Email gonderilemedi");
    }
    // Reload to get fresh data
    const updater = (prev: MessageWithLead[]) =>
      prev.map((m) => (m.id === id ? { ...m, status: "sent" as const, sentAt: new Date().toISOString() } : m));
    setMessages(updater);
    setAllMessages(updater);
    setSelectedMessage((prev) =>
      prev?.id === id ? { ...prev, status: "sent", sentAt: new Date().toISOString() } : prev
    );
  }, []);

  const handleMarkSent = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}/mark-sent`, { method: "PATCH" });
    if (!res.ok) throw new Error("Isaretleme basarisiz");
    const data = await res.json();
    const updater = (prev: MessageWithLead[]) =>
      prev.map((m) => (m.id === id ? { ...m, ...data.message } : m));
    setMessages(updater);
    setAllMessages(updater);
    setSelectedMessage((prev) =>
      prev?.id === id ? { ...prev, ...data.message } : prev
    );
  }, []);

  const handleUpdate = useCallback(async (id: string, updateData: { subject?: string; body?: string }) => {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) throw new Error("Guncelleme basarisiz");
    const data = await res.json();
    const updater = (prev: MessageWithLead[]) =>
      prev.map((m) => (m.id === id ? { ...m, ...data.message } : m));
    setMessages(updater);
    setAllMessages(updater);
    setSelectedMessage((prev) =>
      prev?.id === id ? { ...prev, ...data.message } : prev
    );
  }, []);

  // Inline aksiyonlar (tablodaki butonlar)
  const handleInlineApprove = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await handleApprove(id);
    } catch (err) {
      console.error("Onaylama hatasi:", err);
    } finally {
      setActionLoadingId(null);
    }
  }, [handleApprove]);

  const handleInlineReject = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await handleReject(id);
    } catch (err) {
      console.error("Reddetme hatasi:", err);
    } finally {
      setActionLoadingId(null);
    }
  }, [handleReject]);

  const handleInlineCopy = useCallback((msg: MessageWithLead) => {
    const text = msg.subject ? `Konu: ${msg.subject}\n\n${msg.body}` : msg.body;
    navigator.clipboard.writeText(text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleInlineMarkSent = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await handleMarkSent(id);
    } catch (err) {
      console.error("Isaretleme hatasi:", err);
    } finally {
      setActionLoadingId(null);
    }
  }, [handleMarkSent]);

  const handleInlineSendEmail = useCallback(async (id: string) => {
    setActionLoadingId(id);
    try {
      await handleSendEmail(id);
    } catch (err) {
      console.error("Email gonderme hatasi:", err);
    } finally {
      setActionLoadingId(null);
    }
  }, [handleSendEmail]);

  // ============================================
  // Render
  // ============================================

  return (
    <AppLayout
      title="Mesajlar"
      description="Lead mesajlarini yonetin, onaylayin ve gonderin"
    >
      <div className="space-y-6">
        {/* Istatistik kartlari */}
        {allMessages.length > 0 && <StatsCards messages={allMessages} />}

        {/* Filtreler */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Lead adi veya sirket ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tip" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="h-9 px-3 text-xs shrink-0">
            {loading ? "..." : `${messages.length} / ${total} mesaj`}
          </Badge>
        </div>

        {/* Hata durumu */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchMessages}>
                Tekrar Dene
              </Button>
            </div>
          </div>
        )}

        {/* Yukleniyor */}
        {loading && (
          <div className="rounded-xl border">
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-[140px]" />
                    <Skeleton className="h-3 w-[200px]" />
                  </div>
                  <Skeleton className="h-6 w-[70px] rounded-full" />
                  <Skeleton className="h-6 w-[60px] rounded-full" />
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bos durum */}
        {!loading && !error && messages.length === 0 && (
          <div className="rounded-xl border p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Mesaj bulunamadi</h3>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== "all" || typeFilter !== "all" || searchQuery
                ? "Filtreleri degistirmeyi deneyin."
                : "Henuz mesaj olusturulmamis. Lead detaylarindan mesaj olusturabilirsiniz."}
            </p>
          </div>
        )}

        {/* Tablo */}
        {!loading && messages.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Lead</TableHead>
                  <TableHead className="w-[80px]">Tip</TableHead>
                  <TableHead className="w-[110px]">Durum</TableHead>
                  <TableHead className="min-w-[200px]">Konu / Mesaj</TableHead>
                  <TableHead className="w-[110px]">Tarih</TableHead>
                  <TableHead className="w-[200px] text-right">Aksiyonlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => {
                  const lead = msg.lead;
                  const initials = lead?.name
                    ?.split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?";
                  const statusInfo = STATUS_BADGE[msg.status] || STATUS_BADGE.pending;
                  const isLoading = actionLoadingId === msg.id;

                  return (
                    <TableRow
                      key={msg.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedMessage(msg)}
                    >
                      {/* Lead */}
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 shrink-0">
                            {lead?.profilePicture ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={lead.profilePicture}
                                alt={lead.name || ""}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {initials}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {lead?.name || "Bilinmeyen"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lead?.company || lead?.title || ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Tip */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {msg.messageType === "email" ? (
                            <Mail className="h-3.5 w-3.5" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5" />
                          )}
                          <span>{msg.messageType === "email" ? "Email" : "DM"}</span>
                        </div>
                      </TableCell>

                      {/* Durum */}
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                      </TableCell>

                      {/* Konu / Mesaj */}
                      <TableCell>
                        <div className="min-w-0">
                          {msg.subject && (
                            <p className="text-sm font-medium truncate mb-0.5">
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {msg.body.substring(0, 100)}
                            {msg.body.length > 100 ? "..." : ""}
                          </p>
                        </div>
                      </TableCell>

                      {/* Tarih */}
                      <TableCell>
                        <p className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </TableCell>

                      {/* Aksiyonlar */}
                      <TableCell>
                        <div
                          className="flex items-center gap-1 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Kopyala — her durumda */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleInlineCopy(msg)}
                            title="Kopyala"
                          >
                            {copiedId === msg.id ? (
                              <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Pending: Onayla / Reddet */}
                          {msg.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={() => handleInlineApprove(msg.id)}
                                disabled={isLoading}
                                title="Onayla"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleInlineReject(msg.id)}
                                disabled={isLoading}
                                title="Reddet"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}

                          {/* Approved: Email Gonder / LinkedIn / Gonderildi Isaretle */}
                          {msg.status === "approved" && (
                            <>
                              {msg.messageType === "email" && msg.lead?.email && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                  onClick={() => handleInlineSendEmail(msg.id)}
                                  disabled={isLoading}
                                  title="Email Gonder"
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                              {msg.messageType === "dm" && msg.lead?.linkedinUrl && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  asChild
                                  title="LinkedIn'de Ac"
                                >
                                  <a
                                    href={msg.lead.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                onClick={() => handleInlineMarkSent(msg.id)}
                                disabled={isLoading}
                                title="Gonderildi Isaretle"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </>
                          )}

                          {/* Sent: badge */}
                          {msg.status === "sent" && (
                            <span className="text-xs text-muted-foreground px-1">
                              {msg.sentAt
                                ? new Date(msg.sentAt).toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mesaj detay dialog */}
        <MessageDetailDialog
          message={selectedMessage}
          open={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onSendEmail={handleSendEmail}
          onMarkSent={handleMarkSent}
          onUpdate={handleUpdate}
        />
      </div>
    </AppLayout>
  );
}
