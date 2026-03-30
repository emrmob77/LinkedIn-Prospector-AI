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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  UserPlus,
  CheckCircle,
  ArrowRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  Zap,
  Download,
} from "lucide-react";

const ACTION_TYPES = [
  { value: "all", label: "Tüm Eylemler" },
  { value: "search_started", label: "Arama Başladı" },
  { value: "search_completed", label: "Arama Tamamlandı" },
  { value: "post_classified", label: "Gönderi Sınıflandı" },
  { value: "lead_created", label: "Lead Oluşturuldu" },
  { value: "lead_stage_changed", label: "Aşama Değişti" },
  { value: "message_generated", label: "Mesaj Oluşturuldu" },
  { value: "message_approved", label: "Mesaj Onaylandı" },
  { value: "export_created", label: "Dışa Aktarıldı" },
];

interface ActivityItem {
  id: string;
  actionType: string;
  title: string;
  details: string;
  entityType: string;
  timestamp: string;
  isSystem: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  search_started: <Search className="h-3.5 w-3.5 text-blue-500" />,
  search_completed: <Search className="h-3.5 w-3.5 text-green-500" />,
  lead_created: <UserPlus className="h-3.5 w-3.5 text-purple-500" />,
  lead_stage_changed: <ArrowRight className="h-3.5 w-3.5 text-orange-500" />,
  message_generated: <Zap className="h-3.5 w-3.5 text-amber-500" />,
  message_approved: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  export_created: <Download className="h-3.5 w-3.5 text-cyan-500" />,
};

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  search_started: { label: "Arama Başladı", variant: "secondary" },
  search_completed: { label: "Arama Tamamlandı", variant: "secondary" },
  post_classified: { label: "Sınıflandırma", variant: "outline" },
  lead_created: { label: "Lead Oluşturuldu", variant: "default" },
  lead_stage_changed: { label: "Aşama Değişti", variant: "outline" },
  message_generated: { label: "Mesaj Oluşturuldu", variant: "secondary" },
  message_approved: { label: "Mesaj Onaylandı", variant: "default" },
  export_created: { label: "Dışa Aktarıldı", variant: "outline" },
};

const demoActivities: ActivityItem[] = [
  { id: "1", actionType: "message_approved", title: "Mesaj onaylandı", details: "Ahmet Yılmaz için iletişim mesajı onaylandı", entityType: "message", timestamp: "30 Mar 2026 14:32", isSystem: false },
  { id: "2", actionType: "message_generated", title: "AI mesaj oluşturdu", details: "Fatma Şahin için DM mesajı oluşturuldu (Skor: 88)", entityType: "message", timestamp: "30 Mar 2026 14:28", isSystem: true },
  { id: "3", actionType: "lead_stage_changed", title: "Aşama değişikliği", details: "Ayşe Kaya: İletişim Kurulacak → İletişim Kuruldu", entityType: "lead", timestamp: "30 Mar 2026 13:45", isSystem: false },
  { id: "4", actionType: "lead_created", title: "Yeni lead", details: "Mehmet Demir - ABC Teknoloji (Skor: 82)", entityType: "lead", timestamp: "30 Mar 2026 12:15", isSystem: true },
  { id: "5", actionType: "lead_created", title: "Yeni lead", details: "Can Özdemir - Anadolu Gıda (Skor: 67)", entityType: "lead", timestamp: "30 Mar 2026 12:14", isSystem: true },
  { id: "6", actionType: "search_completed", title: "Arama tamamlandı", details: '"kurumsal hediye" - 47 gönderi, 12 ilgili', entityType: "search_run", timestamp: "30 Mar 2026 12:10", isSystem: true },
  { id: "7", actionType: "search_started", title: "Arama başladı", details: 'Anahtar kelimeler: "kurumsal hediye", "yılbaşı hediyesi"', entityType: "search_run", timestamp: "30 Mar 2026 12:05", isSystem: false },
  { id: "8", actionType: "message_approved", title: "Mesaj onaylandı", details: "Ali Çelik için email mesajı onaylandı", entityType: "message", timestamp: "29 Mar 2026 17:20", isSystem: false },
  { id: "9", actionType: "lead_stage_changed", title: "Aşama değişikliği", details: "Deniz Yıldız: Görüşme → Teklif", entityType: "lead", timestamp: "29 Mar 2026 15:30", isSystem: false },
  { id: "10", actionType: "export_created", title: "Dışa aktarma", details: "24 lead CSV olarak dışa aktarıldı", entityType: "export", timestamp: "29 Mar 2026 10:00", isSystem: false },
];

export function ActivityLogTable() {
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredActivities = demoActivities.filter(
    (a) => actionFilter === "all" || a.actionType === actionFilter
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Aktivite Kayıtları</CardTitle>
            <CardDescription className="text-xs">
              {filteredActivities.length} kayıt gösteriliyor
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px] h-9"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px] h-9"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Eylem</TableHead>
                <TableHead className="w-[40%]">Detay</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead className="text-right">Zaman</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const config = actionLabels[activity.actionType];
                return (
                  <TableRow key={activity.id}>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center rounded-md bg-muted p-1.5">
                        {actionIcons[activity.actionType] || (
                          <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={config?.variant || "outline"}
                          className="text-[10px] h-5 whitespace-nowrap"
                        >
                          {config?.label || activity.actionType}
                        </Badge>
                        {activity.isSystem && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">
                            SİSTEM
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {activity.details}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">
                        {activity.entityType}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {activity.timestamp}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Sayfa 1 / 1 ({filteredActivities.length} kayıt)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 font-medium">
              1
            </Button>
            <Button variant="outline" size="sm" className="h-8" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
