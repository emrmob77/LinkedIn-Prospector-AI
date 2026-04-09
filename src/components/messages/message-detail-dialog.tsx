"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Check,
  X,
  Send,
  Copy,
  ExternalLink,
  CheckCheck,
  Pencil,
  Loader2,
} from "lucide-react";

export interface MessageWithLead {
  id: string;
  leadId: string;
  messageType: "dm" | "email";
  subject: string | null;
  body: string;
  status: "pending" | "approved" | "rejected" | "sent";
  generatedAt: string;
  approvedAt: string | null;
  sentAt: string | null;
  originalBody: string | null;
  editCount: number;
  createdAt: string;
  lead: {
    id: string;
    name: string;
    title: string | null;
    company: string | null;
    linkedinUrl: string;
    email: string | null;
    profilePicture: string | null;
    stage: string;
  } | null;
}

interface MessageDetailDialogProps {
  message: MessageWithLead | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onSendEmail: (id: string) => Promise<void>;
  onMarkSent: (id: string) => Promise<void>;
  onUpdate: (id: string, data: { subject?: string; body?: string }) => Promise<void>;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Onay Bekliyor", variant: "outline" },
  approved: { label: "Onaylandi", variant: "default" },
  rejected: { label: "Reddedildi", variant: "destructive" },
  sent: { label: "Gonderildi", variant: "secondary" },
};

export function MessageDetailDialog({
  message,
  open,
  onClose,
  onApprove,
  onReject,
  onSendEmail,
  onMarkSent,
  onUpdate,
}: MessageDetailDialogProps) {
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const lead = message.lead;
  const statusInfo = STATUS_LABELS[message.status] || STATUS_LABELS.pending;

  const initials = lead?.name
    ?.split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const handleStartEdit = () => {
    setEditSubject(message.subject || "");
    setEditBody(message.body);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      await onUpdate(message.id, {
        subject: editSubject || undefined,
        body: editBody,
      });
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: (id: string) => Promise<void>) => {
    setLoading(true);
    try {
      await action(message.id);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = message.subject
      ? `Konu: ${message.subject}\n\n${message.body}`
      : message.body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {/* Lead bilgisi */}
            {lead && (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  {lead.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lead.profilePicture}
                      alt={lead.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.title}{lead.company ? ` - ${lead.company}` : ""}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={message.messageType === "email" ? "default" : "secondary"}>
                {message.messageType === "email" ? "Email" : "DM"}
              </Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Konu (email icin) */}
          {editing ? (
            <div className="space-y-3">
              {message.messageType === "email" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Konu
                  </label>
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Email konusu"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Mesaj
                </label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="resize-y"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={loading}
                >
                  Iptal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {message.subject && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Konu
                  </p>
                  <p className="text-sm font-medium">{message.subject}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Mesaj
                </p>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.body}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Meta bilgiler */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t pt-3">
            <span>
              Olusturulma: {new Date(message.createdAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {message.approvedAt && (
              <span>
                Onaylanma: {new Date(message.approvedAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {message.sentAt && (
              <span>
                Gonderilme: {new Date(message.sentAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {message.editCount > 0 && (
              <span>{message.editCount} duzenleme</span>
            )}
          </div>

          {/* Aksiyon butonlari */}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {/* Tum durumlar icin: Kopyala */}
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={loading}>
              {copied ? (
                <CheckCheck className="mr-2 h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="mr-2 h-3.5 w-3.5" />
              )}
              {copied ? "Kopyalandi" : "Kopyala"}
            </Button>

            {/* Duzenle (pending veya approved) */}
            {(message.status === "pending" || message.status === "approved") && !editing && (
              <Button variant="outline" size="sm" onClick={handleStartEdit} disabled={loading}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Duzenle
              </Button>
            )}

            {/* Pending: Onayla / Reddet */}
            {message.status === "pending" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleAction(onApprove)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-3.5 w-3.5" />
                  )}
                  Onayla
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleAction(onReject)}
                  disabled={loading}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Reddet
                </Button>
              </>
            )}

            {/* Approved: Email Gonder / Gonderildi Isaretle / LinkedIn */}
            {message.status === "approved" && (
              <>
                {message.messageType === "email" && lead?.email && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(onSendEmail)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-3.5 w-3.5" />
                    )}
                    Email Gonder
                  </Button>
                )}
                {message.messageType === "dm" && lead?.linkedinUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction(onMarkSent)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="mr-2 h-3.5 w-3.5" />
                  )}
                  Gonderildi Isaretle
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
