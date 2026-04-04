"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState, useCallback } from "react";

interface DailyActivity {
  date: string;
  aramalar: number;
  leadler: number;
}

interface ActivityChartProps {
  loading?: boolean;
}

export function ActivityChart({ loading: parentLoading }: ActivityChartProps) {
  const [data, setData] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/activity-log?limit=50&page=1");
      if (!res.ok) return;
      const json = await res.json();

      // Aktiviteleri son 7 gune gore grupla
      const now = new Date();
      const days: Record<string, { aramalar: number; leadler: number }> = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        days[key] = { aramalar: 0, leadler: 0 };
      }

      for (const activity of json.activities || []) {
        const dateKey = new Date(activity.timestamp).toISOString().split("T")[0];
        if (days[dateKey]) {
          if (
            activity.actionType === "search_started" ||
            activity.actionType === "search_completed" ||
            activity.actionType === "extension_import"
          ) {
            days[dateKey].aramalar++;
          }
          if (activity.actionType === "lead_created") {
            days[dateKey].leadler++;
          }
        }
      }

      const chartData: DailyActivity[] = Object.entries(days).map(
        ([dateStr, counts]) => {
          const d = new Date(dateStr);
          const formatted = d.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
          });
          return { date: formatted, ...counts };
        }
      );

      setData(chartData);
    } catch {
      // Hata durumunda bos veri goster
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const isLoading = parentLoading || loading;
  const isEmpty = data.length === 0 || data.every((d) => d.aramalar === 0 && d.leadler === 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44 mt-1" />
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Haftalık Aktivite</CardTitle>
        <CardDescription className="text-xs">
          Arama ve lead üretim trendi
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isEmpty ? (
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Henüz aktivite verisi yok
            </p>
          </div>
        ) : (
          <>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorAramalar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLeadler" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
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
                  <Area
                    type="monotone"
                    dataKey="leadler"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLeadler)"
                  />
                  <Area
                    type="monotone"
                    dataKey="aramalar"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAramalar)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Aramalar</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Leadler</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
