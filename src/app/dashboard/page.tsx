"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, MessageSquare, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardStats {
  totalLeads: number;
  leadsThisWeek: number;
  totalPosts: number;
  postsClassified: number;
  postsRelevant: number;
  avgLeadScore: number;
  messageApprovalRate: number;
  pipelineBreakdown: Record<string, number>;
  recentSearchRuns: Array<{
    id: string;
    source: string;
    keywords: string[] | null;
    status: string;
    postsFound: number;
    postsRelevant: number;
    leadsExtracted: number;
    createdAt: string;
  }>;
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Hata: ${res.status}`);
      }
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Veriler yüklenemedi";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <AppLayout
      title="Dashboard"
      description="Prospecting aktivitelerinizin genel görünümü"
    >
      <div className="space-y-6">
        {/* Hata durumu */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-300"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {/* Metrik Kartlari */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : stats ? (
            <>
              <MetricCard
                title="Toplam Lead"
                value={stats.totalLeads}
                description={`Bu hafta +${stats.leadsThisWeek} yeni`}
                icon={Users}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
              />
              <MetricCard
                title="Sınıflandırılan Post"
                value={stats.postsClassified}
                description={`${stats.totalPosts} toplam, ${stats.postsRelevant} ilgili`}
                icon={Search}
                iconColor="text-purple-600"
                iconBg="bg-purple-100"
              />
              <MetricCard
                title="Mesaj Onay Oranı"
                value={`%${stats.messageApprovalRate}`}
                icon={MessageSquare}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-100"
              />
              <MetricCard
                title="Ort. Lead Skoru"
                value={stats.avgLeadScore}
                icon={Target}
                iconColor="text-amber-600"
                iconBg="bg-amber-100"
              />
            </>
          ) : null}
        </div>

        {/* Grafikler */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityChart loading={loading} />
          <PipelineChart
            pipelineBreakdown={stats?.pipelineBreakdown ?? null}
            loading={loading}
          />
        </div>

        {/* Alt bolum */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <PipelineFunnel
              pipelineBreakdown={stats?.pipelineBreakdown ?? null}
              loading={loading}
            />
          </div>
          <div className="lg:col-span-3">
            <RecentActivity />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
