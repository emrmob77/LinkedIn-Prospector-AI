"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Users, Search, MessageSquare, Target } from "lucide-react";

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      description="Prospecting aktivitelerinizin genel görünümü"
    >
      <div className="space-y-6">
        {/* Metrik Kartları */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Toplam Lead"
            value="34"
            change={12.5}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-100"
          />
          <MetricCard
            title="Bu Hafta Arama"
            value="31"
            change={8.2}
            icon={Search}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
          />
          <MetricCard
            title="Mesaj Onay Oranı"
            value="%87"
            change={3.1}
            icon={MessageSquare}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
          />
          <MetricCard
            title="Ort. Lead Skoru"
            value="72"
            change={-2.4}
            icon={Target}
            iconColor="text-amber-600"
            iconBg="bg-amber-100"
          />
        </div>

        {/* Grafikler */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityChart />
          <PipelineChart />
        </div>

        {/* Alt bölüm */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <PipelineFunnel />
          </div>
          <div className="lg:col-span-3">
            <RecentActivity />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
