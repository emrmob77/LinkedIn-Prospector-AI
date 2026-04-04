"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, UserPlus, CheckCircle, ArrowRight, Filter, ChevronLeft, ChevronRight,
  Zap, Download, Inbox, AlertCircle, Puzzle, FileText,
} from "lucide-react";

const ACTION_TYPES = [
  { value: "all", label: "Tüm Eylemler" },
  { value: "extension_import", label: "Extension Import" },
  { value: "post_classified", label: "Sınıflandırma" },
  { value: "lead_created", label: "Lead Oluşturuldu" },
  { value: "lead_stage_changed", label: "Aşama Değişti" },
  { value: "message_generated", label: "Mesaj Oluşturuldu" },
  { value: "message_approved", label: "Mesaj Onaylandı" },
  { value: "export_created", label: "Dışa Aktarıldı" },
];

const actionIcons: Record<string, React.ReactNode> = {
  search_started: <Search className="h-3.5 w-3.5 text-blue-500" />,
  search_completed: <Search className="h-3.5 w-3.5 text-green-500" />,
  extension_import: <Puzzle className="h-3.5 w-3.5 text-indigo-500" />,
  post_classified: <FileText className="h-3.5 w-3.5 text-teal-500" />,
  lead_created: <UserPlus className="h-3.5 w-3.5 text-purple-500" />,
  lead_stage_changed: <ArrowRight className="h-3.5 w-3.5 text-orange-500" />,
  message_generated: <Zap className="h-3.5 w-3.5 text-amber-500" />,
  message_approved: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  export_created: <Download className="h-3.5 w-3.5 text-cyan-500" />,
};

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  search_started: { label: "Arama Başladı", variant: "secondary" },
  search_completed: { label: "Arama Tamamlandı", variant: "secondary" },
  extension_import: { label: "Extension Import", variant: "secondary" },
  post_classified: { label: "Sınıflandırma", variant: "outline" },
  lead_created: { label: "Lead Oluşturuldu", variant: "default" },
  lead_stage_changed: { label: "Aşama Değişti", variant: "outline" },
  message_generated: { label: "Mesaj Oluşturuldu", variant: "secondary" },
  message_approved: { label: "Mesaj Onaylandı", variant: "default" },
  export_created: { label: "Dışa Aktarıldı", variant: "outline" },
};

function formatDetails(actionType: string, details: Record<string, unknown>): string {
  if (!details) return "-";
  switch (actionType) {
    case "lead_created":
      return details.name ? `${details.name} lead olarak oluşturuldu` : "Yeni lead oluşturuldu";
    case "lead_stage_changed":
      return `${details.leadName || "Lead"}: ${details.oldStage} → ${details.newStage}`;
    case "post_classified":
      return `${details.classified || 0} post sınıflandırıldı, ${details.relevant || 0} ilgili`;
    case "extension_import":
      return `${details.postsImported || 0} post import edildi`;
    case "message_generated":
      return details.leadName ? `${details.leadName} için mesaj oluşturuldu` : "Mesaj oluşturuldu";
    case "message_approved":
      return details.messageType === "dm" ? "DM mesajı onaylandı" : "Email mesajı onaylandı";
    case "export_created":
      return `${details.count || 0} lead ${details.format || "CSV"} olarak aktarıldı`;
    default:
      return JSON.stringify(details).slice(0, 100);
  }
}

function formatTimestamp(ts: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

interface Activity {
  id: string;
  timestamp: string;
  actionType: string;
  isSystemAction: boolean;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown>;
}

export function ActivityLogTable() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (actionFilter !== "all") params.set("actionType", actionFilter);
      const res = await fetch(`/api/activity-log?${params}`);
      if (!res.ok) throw new Error("Veri alınamadı");
      const data = await res.json();
      setActivities(data.activities || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("Aktivite kayıtları yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  useEffect(() => { setPage(1); }, [actionFilter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Aktivite Kayıtları</CardTitle>
            <CardDescription className="text-xs">
              {total} kayıt
            </CardDescription>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <Filter className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border overflow-x-auto">
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
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-7 w-7" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <Button size="sm" variant="outline" onClick={fetchActivities}>Tekrar Dene</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="h-6 w-6 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Henüz aktivite kaydı yok</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => {
                  const config = actionLabels[activity.actionType];
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center rounded-md bg-muted p-1.5">
                          {actionIcons[activity.actionType] || <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={config?.variant || "outline"} className="text-[10px] h-5 whitespace-nowrap">
                            {config?.label || activity.actionType}
                          </Badge>
                          {activity.isSystemAction && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">SİSTEM</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDetails(activity.actionType, activity.details)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground capitalize">{activity.entityType || "-"}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(activity.timestamp)}
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
            <p className="text-xs text-muted-foreground">Sayfa {page} / {totalPages} ({total} kayıt)</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
