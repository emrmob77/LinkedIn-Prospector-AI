"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STAGE_COLORS: Record<string, string> = {
  "İletişim Kurulacak": "#3b82f6",
  "İletişim Kuruldu": "#eab308",
  "Cevap Alındı": "#f97316",
  "Görüşme": "#a855f7",
  "Teklif": "#22c55e",
  "Arşiv": "#9ca3af",
};

const STAGE_SHORT_NAMES: Record<string, string> = {
  "İletişim Kurulacak": "İletişim\nKurulacak",
  "İletişim Kuruldu": "İletişim\nKuruldu",
  "Cevap Alındı": "Cevap\nAlındı",
  "Görüşme": "Görüşme",
  "Teklif": "Teklif",
  "Arşiv": "Arşiv",
};

interface PipelineChartProps {
  pipelineBreakdown: Record<string, number> | null;
  loading?: boolean;
}

export function PipelineChart({ pipelineBreakdown, loading }: PipelineChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 mt-1" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = pipelineBreakdown
    ? Object.entries(pipelineBreakdown).map(([name, value]) => ({
        name: STAGE_SHORT_NAMES[name] || name,
        value,
        color: STAGE_COLORS[name] || "#6b7280",
      }))
    : [];

  const isEmpty = data.every((d) => d.value === 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Pipeline Dağılımı</CardTitle>
        <CardDescription className="text-xs">
          Aşamalara göre lead dağılımı
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty ? (
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Henüz pipeline verisi yok</p>
          </div>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
