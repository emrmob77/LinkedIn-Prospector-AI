"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, ChevronRight, ChevronLeft, FileText, Swords } from "lucide-react";

// DB'deki stage değerleri (Türkçe)
const API_STAGES = [
  { value: "İletişim Kurulacak", label: "İletişim Kurulacak" },
  { value: "İletişim Kuruldu", label: "İletişim Kuruldu" },
  { value: "Cevap Alındı", label: "Cevap Alındı" },
  { value: "Görüşme", label: "Görüşme" },
  { value: "Teklif", label: "Teklif" },
  { value: "Arşiv", label: "Arşiv" },
];

const STAGE_FILTER_OPTIONS = [
  { value: "all", label: "Tüm Aşamalar" },
  ...API_STAGES,
];

// Stage -> Label mapping (DB değerleri zaten Türkçe)
export const STAGE_LABELS: Record<string, string> = {
  "İletişim Kurulacak": "İletişim Kurulacak",
  "İletişim Kuruldu": "İletişim Kuruldu",
  "Cevap Alındı": "Cevap Alındı",
  "Görüşme": "Görüşme",
  "Teklif": "Teklif",
  "Arşiv": "Arşiv",
};

type StageVariant = "default" | "secondary" | "outline" | "destructive";

const stageConfig: Record<string, { variant: StageVariant; className: string }> = {
  "İletişim Kurulacak": { variant: "secondary", className: "bg-blue-100 text-blue-700 border-blue-200" },
  "İletişim Kuruldu": { variant: "secondary", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "Cevap Alındı": { variant: "secondary", className: "bg-orange-100 text-orange-700 border-orange-200" },
  "Görüşme": { variant: "secondary", className: "bg-purple-100 text-purple-700 border-purple-200" },
  "Teklif": { variant: "secondary", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "Arşiv": { variant: "secondary", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

// Sıradaki aşamalar
const STAGE_ORDER = ["İletişim Kurulacak", "İletişim Kuruldu", "Cevap Alındı", "Görüşme", "Teklif", "Arşiv"];

export interface LeadData {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedinUrl: string;
  stage: string;
  score: number;
  scoreBreakdown: Record<string, number> | null;
  painPoints: string[];
  keyInterests: string[];
  firstPostId: string | null;
  postCount: number;
  isActive: boolean;
  source: string;
  profilePicture: string | null;
  projectType: string | null;
  isCompetitor: boolean;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
  firstPost?: {
    content: string;
    authorName: string;
  } | null;
}

interface PipelineTableProps {
  leads: LeadData[];
  loading: boolean;
  onSelectLead?: (lead: LeadData) => void;
  onStageChange?: (leadId: string, newStage: string) => void;
  total: number;
  page: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  stageFilter: string;
  onStageFilterChange?: (stage: string) => void;
  searchQuery: string;
  onSearchQueryChange?: (query: string) => void;
}

export function PipelineTable({
  leads,
  loading,
  onSelectLead,
  onStageChange,
  total,
  page,
  totalPages,
  onPageChange,
  stageFilter,
  onStageFilterChange,
  searchQuery,
  onSearchQueryChange,
}: PipelineTableProps) {

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 60) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const getNextStage = (current: string) => {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[idx + 1];
  };

  const getPrevStage = (current: string) => {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx <= 0) return null;
    return STAGE_ORDER[idx - 1];
  };

  // Client-side arama filtresi (API'den gelen veriler uzerinde ek filtreleme)
  const filteredLeads = leads.filter(
    (lead) =>
      searchQuery === "" ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Az once";
    if (diffHours < 24) return `${diffHours} saat once`;
    if (diffDays < 7) return `${diffDays} gun once`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta once`;
    return `${Math.floor(diffDays / 30)} ay once`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Lead Listesi</CardTitle>
            <CardDescription className="text-xs">
              Toplam {total} lead{filteredLeads.length !== total ? ` (${filteredLeads.length} gosteriliyor)` : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Isim veya sirket ara..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange?.(e.target.value)}
                className="pl-8 w-[200px] h-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={(v) => onStageFilterChange?.(v)}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_FILTER_OPTIONS.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[250px]">Lead</TableHead>
                <TableHead>Sirket</TableHead>
                <TableHead>Proje Amaci</TableHead>
                <TableHead className="text-center">Skor</TableHead>
                <TableHead>Asama</TableHead>
                <TableHead className="text-center">Gonderi</TableHead>
                <TableHead>Guncelleme</TableHead>
                <TableHead className="w-[100px] text-center">Tasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-3 w-[80px]" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[80px] mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Henuz lead yok -- LinkedIn Arama sayfasindan postlari siniflandirin
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const initials = lead.name
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const config = stageConfig[lead.stage] || stageConfig["Arşiv"];
                  const nextStage = getNextStage(lead.stage);
                  const prevStage = getPrevStage(lead.stage);

                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => onSelectLead?.(lead)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {lead.profilePicture && (
                              <AvatarImage src={lead.profilePicture} alt={lead.name} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.title || "-"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          {lead.company || "-"}
                          {lead.isCompetitor && (
                            <span title="Rakip"><Swords className="h-3.5 w-3.5 text-red-500 shrink-0" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.projectType ? (
                          <Badge variant="outline" className="text-xs font-normal">
                            {lead.projectType}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`font-mono text-xs ${getScoreColor(lead.score)}`}>
                          {lead.score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className={`text-xs ${config.className}`}>
                          {STAGE_LABELS[lead.stage] || lead.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {lead.postCount}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(lead.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {prevStage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={`${STAGE_LABELS[prevStage]} asamasina tasi`}
                              onClick={() => onStageChange?.(lead.id, prevStage)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          )}
                          {nextStage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={`${STAGE_LABELS[nextStage]} asamasina tasi`}
                              onClick={() => onStageChange?.(lead.id, nextStage)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Sayfa {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
              >
                Onceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange?.(page + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
