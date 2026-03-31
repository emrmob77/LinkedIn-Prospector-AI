"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ExternalLink,
  MessageSquare,
  Building,
  Briefcase,
  Target,
} from "lucide-react";
import { LinkedinIcon } from "@/components/icons";

const PIPELINE_STAGES = [
  "İletişim Kurulacak",
  "İletişim Kuruldu",
  "Cevap Alındı",
  "Görüşme",
  "Teklif",
  "Arşiv",
];

interface LeadDetailPanelProps {
  open: boolean;
  onClose: () => void;
  lead?: {
    id: string;
    name: string;
    title: string;
    company: string;
    linkedinUrl: string;
    stage: string;
    score: number;
    painPoints: string[];
    keyInterests: string[];
  } | null;
}

export function LeadDetailPanel({ open, onClose, lead }: LeadDetailPanelProps) {
  const [currentStage, setCurrentStage] = useState(lead?.stage ?? "");

  if (!lead) return null;

  const initials = lead.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lead Detayı</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profil bilgileri */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{lead.name}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Briefcase className="h-3 w-3" />
                {lead.title}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building className="h-3 w-3" />
                {lead.company}
              </div>
              <Button variant="link" size="sm" className="px-0 h-auto text-xs mt-1">
                <LinkedinIcon className="mr-1 h-3 w-3" />
                LinkedIn Profilini Aç
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Skor ve Aşama */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Lead Skoru</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{lead.score}</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Pipeline Aşaması</p>
              <Select value={currentStage || lead.stage} onValueChange={setCurrentStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Sorun noktaları ve ilgi alanları */}
          {lead.painPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Target className="h-4 w-4 text-red-500" />
                Sorun Noktaları
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

          {lead.keyInterests.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">İlgi Alanları</p>
              <div className="flex flex-wrap gap-1">
                {lead.keyInterests.map((interest, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Mesaj Oluşturma */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Mesaj Oluştur
              </p>
            </div>
            <div className="space-y-3">
              <Button className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                AI ile Mesaj Oluştur
              </Button>

              <div className="rounded-md border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground text-center">
                  Mesaj oluşturmak için yukarıdaki butona tıklayın
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
