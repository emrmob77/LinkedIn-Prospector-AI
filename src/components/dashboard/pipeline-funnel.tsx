"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STAGE_ORDER = [
  "İletişim Kurulacak",
  "İletişim Kuruldu",
  "Cevap Alındı",
  "Görüşme",
  "Teklif",
];

const STAGE_COLORS: Record<string, string> = {
  "İletişim Kurulacak": "bg-blue-500",
  "İletişim Kuruldu": "bg-yellow-500",
  "Cevap Alındı": "bg-orange-500",
  "Görüşme": "bg-purple-500",
  "Teklif": "bg-emerald-500",
};

interface PipelineFunnelProps {
  pipelineBreakdown: Record<string, number> | null;
  loading?: boolean;
}

export function PipelineFunnel({ pipelineBreakdown, loading }: PipelineFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44 mt-1" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stages = STAGE_ORDER.map((name) => ({
    name,
    count: pipelineBreakdown?.[name] ?? 0,
    color: STAGE_COLORS[name] || "bg-gray-500",
  }));

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const isEmpty = stages.every((s) => s.count === 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Dönüşüm Hunisi</CardTitle>
        <CardDescription className="text-xs">
          Pipeline aşamaları arası dönüşüm
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Henüz huni verisi yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, i) => {
              const convRate =
                i > 0 && stages[i - 1].count > 0
                  ? Math.round((stage.count / stages[i - 1].count) * 100)
                  : 100;
              const widthPercent = Math.max((stage.count / maxCount) * 100, 4);
              return (
                <div key={stage.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{stage.name}</span>
                    <div className="flex items-center gap-2">
                      {i > 0 && (
                        <span className="text-muted-foreground">%{convRate}</span>
                      )}
                      <span className="font-semibold text-sm">{stage.count}</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div
                      className={`${stage.color} h-2 rounded-full transition-all`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
