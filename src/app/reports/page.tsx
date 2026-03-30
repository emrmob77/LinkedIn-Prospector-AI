"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { ActivityLogTable } from "@/components/reports/activity-log-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Activity, Clock } from "lucide-react";

export default function ReportsPage() {
  return (
    <AppLayout
      title="Raporlama"
      description="Tüm sistem aktivitelerinin detaylı kayıtlarını görüntüleyin"
      actions={
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-3.5 w-3.5" />
          Rapor İndir
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Özet kartları */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2.5">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Toplam Aktivite</p>
                <p className="text-lg font-bold">156</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-100 p-2.5">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Bu Hafta</p>
                <p className="text-lg font-bold">42</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-100 p-2.5">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Son Aktivite</p>
                <p className="text-lg font-bold">2 dk önce</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <ActivityLogTable />
      </div>
    </AppLayout>
  );
}
