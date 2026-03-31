"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Filter, MoreHorizontal } from "lucide-react";

const PIPELINE_STAGES = [
  { value: "all", label: "Tüm Aşamalar" },
  { value: "İletişim Kurulacak", label: "İletişim Kurulacak" },
  { value: "İletişim Kuruldu", label: "İletişim Kuruldu" },
  { value: "Cevap Alındı", label: "Cevap Alındı" },
  { value: "Görüşme", label: "Görüşme" },
  { value: "Teklif", label: "Teklif" },
  { value: "Arşiv", label: "Arşiv" },
];

type StageVariant = "default" | "secondary" | "outline" | "destructive";

const stageConfig: Record<string, { variant: StageVariant; className: string }> = {
  "İletişim Kurulacak": { variant: "secondary", className: "bg-blue-100 text-blue-700 border-blue-200" },
  "İletişim Kuruldu": { variant: "secondary", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "Cevap Alındı": { variant: "secondary", className: "bg-orange-100 text-orange-700 border-orange-200" },
  "Görüşme": { variant: "secondary", className: "bg-purple-100 text-purple-700 border-purple-200" },
  "Teklif": { variant: "secondary", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "Arşiv": { variant: "secondary", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  score: number;
  stage: string;
  lastActivity: string;
  postCount: number;
}

const demoLeads: Lead[] = [
  { id: "1", name: "Ahmet Yılmaz", title: "İK Direktörü", company: "TechCorp Türkiye", score: 85, stage: "İletişim Kurulacak", lastActivity: "2 saat önce", postCount: 2 },
  { id: "2", name: "Fatma Şahin", title: "Satın Alma Müdürü", company: "Global Lojistik A.Ş.", score: 78, stage: "İletişim Kurulacak", lastActivity: "5 saat önce", postCount: 1 },
  { id: "3", name: "Ayşe Kaya", title: "Pazarlama Direktörü", company: "Mega Holding", score: 92, stage: "İletişim Kuruldu", lastActivity: "1 gün önce", postCount: 3 },
  { id: "4", name: "Can Özdemir", title: "Genel Müdür", company: "Anadolu Gıda", score: 67, stage: "Cevap Alındı", lastActivity: "2 gün önce", postCount: 1 },
  { id: "5", name: "Zeynep Arslan", title: "Kurumsal İletişim Md.", company: "Delta Enerji", score: 71, stage: "İletişim Kurulacak", lastActivity: "3 gün önce", postCount: 2 },
  { id: "6", name: "Ali Çelik", title: "Operasyon Direktörü", company: "Star Otomotiv", score: 88, stage: "Görüşme", lastActivity: "1 gün önce", postCount: 1 },
  { id: "7", name: "Deniz Yıldız", title: "CEO", company: "Yıldız Teknoloji", score: 95, stage: "Teklif", lastActivity: "6 saat önce", postCount: 4 },
  { id: "8", name: "Murat Koç", title: "Satın Alma Uzmanı", company: "Koç Holding", score: 56, stage: "Arşiv", lastActivity: "1 hafta önce", postCount: 1 },
];

interface PipelineTableProps {
  onSelectLead?: (leadId: string) => void;
}

export function PipelineTable({ onSelectLead }: PipelineTableProps) {
  const [stageFilter, setStageFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLeads = demoLeads
    .filter((lead) => stageFilter === "all" || lead.stage === stageFilter)
    .filter(
      (lead) =>
        searchQuery === "" ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 60) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Lead Listesi</CardTitle>
            <CardDescription className="text-xs">
              Toplam {filteredLeads.length} lead gösteriliyor
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İsim veya şirket ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px] h-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((stage) => (
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
                <TableHead>Şirket</TableHead>
                <TableHead className="text-center">Skor</TableHead>
                <TableHead>Aşama</TableHead>
                <TableHead className="text-center">Gönderi</TableHead>
                <TableHead>Son Aktivite</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const initials = lead.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();
                const config = stageConfig[lead.stage] || stageConfig["Arşiv"];
                return (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => onSelectLead?.(lead.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.title}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{lead.company}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`font-mono text-xs ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
                        {lead.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {lead.postCount}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.lastActivity}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Seçenekler">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
