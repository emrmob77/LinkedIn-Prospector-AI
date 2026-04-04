"use client";

import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PipelineTable, type LeadData } from "@/components/pipeline/pipeline-table";
import { LeadDetailPanel } from "@/components/pipeline/lead-detail-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Users, BarChart3, AlertCircle } from "lucide-react";

// Stage renk ve stil konfigurasyonu
const STAGE_CONFIG = [
  { key: "İletişim Kurulacak", label: "İletişim Kurulacak", color: "bg-blue-500", bgLight: "bg-blue-50 dark:bg-blue-950/30", textColor: "text-blue-700 dark:text-blue-300" },
  { key: "İletişim Kuruldu", label: "İletişim Kuruldu", color: "bg-yellow-500", bgLight: "bg-yellow-50 dark:bg-yellow-950/30", textColor: "text-yellow-700 dark:text-yellow-300" },
  { key: "Cevap Alındı", label: "Cevap Alındı", color: "bg-orange-500", bgLight: "bg-orange-50 dark:bg-orange-950/30", textColor: "text-orange-700 dark:text-orange-300" },
  { key: "Görüşme", label: "Görüşme", color: "bg-purple-500", bgLight: "bg-purple-50 dark:bg-purple-950/30", textColor: "text-purple-700 dark:text-purple-300" },
  { key: "Teklif", label: "Teklif", color: "bg-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950/30", textColor: "text-emerald-700 dark:text-emerald-300" },
  { key: "Arşiv", label: "Arşiv", color: "bg-gray-400", bgLight: "bg-gray-50 dark:bg-gray-900/30", textColor: "text-gray-500 dark:text-gray-400" },
];

interface StatsData {
  stages: Record<string, number>;
  total: number;
  avgScore: number;
}

interface LeadsResponse {
  leads: LeadData[];
  total: number;
  page: number;
  totalPages: number;
}

export default function PipelinePage() {
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Leads state
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtreler
  const [stageFilter, setStageFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Istatistikleri cek
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch("/api/leads/stats");
      if (!res.ok) {
        throw new Error(`Istatistikler yuklenemedi (${res.status})`);
      }
      const data: StatsData = await res.json();
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Leadleri cek
  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const params = new URLSearchParams();
      if (stageFilter !== "all") {
        params.set("stage", stageFilter);
      }
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("sort", "score");
      params.set("order", "desc");

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Leadler yuklenemedi (${res.status})`);
      }
      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setLeadsError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setLeadsLoading(false);
    }
  }, [stageFilter, page]);

  // Asama degistir
  const handleStageChange = useCallback(async (leadId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!res.ok) {
        throw new Error(`Asama degistirilemedi (${res.status})`);
      }

      // Basarili: local state'i guncelle (optimistic update)
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, stage: newStage } : lead
        )
      );

      // Secili lead aciksa onu da guncelle
      setSelectedLead((prev) =>
        prev && prev.id === leadId ? { ...prev, stage: newStage } : prev
      );

      // Istatistikleri tekrar cek
      fetchStats();
    } catch (err) {
      console.error("Asama degistirme hatasi:", err);
      // Hata durumunda verileri tekrar cek (rollback)
      fetchLeads();
    }
  }, [fetchStats, fetchLeads]);

  // Sayfa yuklendiginde ve filtre degistiginde veri cek
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Filtre degistiginde sayfayi 1'e sifirla
  const handleStageFilterChange = useCallback((stage: string) => {
    setStageFilter(stage);
    setPage(1);
  }, []);

  return (
    <AppLayout
      title="Iletisim Hatti"
      description="Leadlerinizi 6 asamali pipeline uzerinden yonetin"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-3.5 w-3.5" />
            Disa Aktar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Genel ozet istatistikler */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          {statsLoading ? (
            <>
              <div className="rounded-xl border p-4">
                <Skeleton className="h-3 w-[80px] mb-2" />
                <Skeleton className="h-8 w-[50px]" />
              </div>
              <div className="rounded-xl border p-4">
                <Skeleton className="h-3 w-[100px] mb-2" />
                <Skeleton className="h-8 w-[40px]" />
              </div>
            </>
          ) : statsError ? (
            <div className="col-span-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{statsError}</p>
              </div>
            </div>
          ) : stats ? (
            <>
              <div className="rounded-xl border p-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Lead</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
              <div className="rounded-xl border p-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ort. Skor</p>
                  <p className="text-2xl font-bold">{stats.avgScore}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Pipeline asama kartlari */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statsLoading
            ? STAGE_CONFIG.map((stage) => (
                <div key={stage.key} className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                  <Skeleton className="h-8 w-[30px]" />
                </div>
              ))
            : STAGE_CONFIG.map((stage) => {
                const count = stats?.stages?.[stage.key] ?? 0;
                return (
                  <div
                    key={stage.key}
                    className={`rounded-xl border ${stage.bgLight} p-4 transition-shadow hover:shadow-sm cursor-pointer`}
                    onClick={() => {
                      handleStageFilterChange(stageFilter === stage.key ? "all" : stage.key);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                      <p className={`text-xs font-medium ${stage.textColor}`}>
                        {stage.label}
                      </p>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
        </div>

        {/* Hata durumu */}
        {leadsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm">{leadsError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLeads}>
                Tekrar Dene
              </Button>
            </div>
          </div>
        )}

        {/* Lead tablosu */}
        <PipelineTable
          leads={leads}
          loading={leadsLoading}
          onSelectLead={setSelectedLead}
          onStageChange={handleStageChange}
          total={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          stageFilter={stageFilter}
          onStageFilterChange={handleStageFilterChange}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        {/* Lead detay paneli */}
        <LeadDetailPanel
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onStageChange={handleStageChange}
        />
      </div>
    </AppLayout>
  );
}
