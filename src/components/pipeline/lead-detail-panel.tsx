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
import {
  ExternalLink,
  MessageSquare,
  Building,
  Briefcase,
  Target,
  FileText,
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";
import { type LeadData } from "./pipeline-table";

const API_STAGES = [
  { value: "to_contact", label: "Iletisim Kurulacak" },
  { value: "contacted", label: "Iletisim Kuruldu" },
  { value: "replied", label: "Cevap Alindi" },
  { value: "meeting", label: "Gorusme" },
  { value: "proposal", label: "Teklif" },
  { value: "archived", label: "Arsiv" },
];

interface LeadDetailPanelProps {
  open: boolean;
  onClose: () => void;
  lead: LeadData | null;
  onStageChange?: (leadId: string, newStage: string) => void;
}

export function LeadDetailPanel({ open, onClose, lead, onStageChange }: LeadDetailPanelProps) {
  const [currentStage, setCurrentStage] = useState(lead?.stage ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentStage(lead?.stage ?? "");
  }, [lead?.id, lead?.stage]);

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

          {/* Ilk post bilgisi */}
          {lead.firstPost && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Ilk Yakalanan Gonderi
                </p>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {lead.firstPost.authorName} tarafindan
                  </p>
                  <p className="text-sm line-clamp-4">
                    {lead.firstPost.content}
                  </p>
                </div>
              </div>
            </>
          )}

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
                Mesaj Olustur
              </p>
            </div>
            <div className="space-y-3">
              <Button className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                AI ile Mesaj Olustur
              </Button>

              <div className="rounded-md border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground text-center">
                  Mesaj olusturmak icin yukaridaki butona tiklayin
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
