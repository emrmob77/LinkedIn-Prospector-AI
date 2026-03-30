"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const stages = [
  { name: "İletişim Kurulacak", count: 12, color: "bg-blue-500", width: "100%" },
  { name: "İletişim Kuruldu", count: 8, color: "bg-yellow-500", width: "67%" },
  { name: "Cevap Alındı", count: 5, color: "bg-orange-500", width: "42%" },
  { name: "Görüşme", count: 3, color: "bg-purple-500", width: "25%" },
  { name: "Teklif", count: 2, color: "bg-emerald-500", width: "17%" },
];

export function PipelineFunnel() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Dönüşüm Hunisi</CardTitle>
        <CardDescription className="text-xs">
          Pipeline aşamaları arası dönüşüm
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const convRate = i > 0 ? Math.round((stage.count / stages[i - 1].count) * 100) : 100;
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
                    style={{ width: stage.width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
