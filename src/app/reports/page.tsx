"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ActivityLogTable } from "@/components/reports/activity-log-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Activity, Clock, FileText } from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState<{ total: number; lastActivity: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/activity-log?limit=1")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setStats({
            total: data.total || 0,
            lastActivity: data.activities?.[0]?.timestamp || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  const formatRelativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    return `${Math.floor(hours / 24)} gün önce`;
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv" }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <AppLayout
      title="Raporlama"
      description="Tüm sistem aktivitelerinin detaylı kayıtlarını görüntüleyin"
      actions={
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Lead Dışa Aktar
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-950/30 p-2.5">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Toplam Aktivite</p>
                {stats ? <p className="text-lg font-bold">{stats.total}</p> : <Skeleton className="h-6 w-12 mt-1" />}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-100 dark:bg-purple-950/30 p-2.5">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Kayıt Sayısı</p>
                {stats ? <p className="text-lg font-bold">{stats.total}</p> : <Skeleton className="h-6 w-12 mt-1" />}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/30 p-2.5">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Son Aktivite</p>
                {stats ? (
                  <p className="text-lg font-bold">{stats.lastActivity ? formatRelativeTime(stats.lastActivity) : "-"}</p>
                ) : <Skeleton className="h-6 w-20 mt-1" />}
              </div>
            </CardContent>
          </Card>
        </div>

        <ActivityLogTable />
      </div>
    </AppLayout>
  );
}
