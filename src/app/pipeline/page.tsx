"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PipelineTable } from "@/components/pipeline/pipeline-table";
import { LeadDetailPanel } from "@/components/pipeline/lead-detail-panel";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const stageSummary = [
  { label: "İletişim Kurulacak", count: 12, color: "bg-blue-500", bgLight: "bg-blue-50", textColor: "text-blue-700" },
  { label: "İletişim Kuruldu", count: 8, color: "bg-yellow-500", bgLight: "bg-yellow-50", textColor: "text-yellow-700" },
  { label: "Cevap Alındı", count: 5, color: "bg-orange-500", bgLight: "bg-orange-50", textColor: "text-orange-700" },
  { label: "Görüşme", count: 3, color: "bg-purple-500", bgLight: "bg-purple-50", textColor: "text-purple-700" },
  { label: "Teklif", count: 2, color: "bg-emerald-500", bgLight: "bg-emerald-50", textColor: "text-emerald-700" },
  { label: "Arşiv", count: 4, color: "bg-gray-400", bgLight: "bg-gray-50", textColor: "text-gray-500" },
];

export default function PipelinePage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <AppLayout
      title="İletişim Hattı"
      description="Leadlerinizi 6 aşamalı pipeline üzerinden yönetin"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-3.5 w-3.5" />
            Dışa Aktar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Pipeline özet kartları */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stageSummary.map((stage) => (
            <div
              key={stage.label}
              className={`rounded-xl border ${stage.bgLight} p-4 transition-shadow hover:shadow-sm`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${stage.color}`} />
                <p className={`text-xs font-medium ${stage.textColor}`}>
                  {stage.label}
                </p>
              </div>
              <p className="text-2xl font-bold">{stage.count}</p>
            </div>
          ))}
        </div>

        <PipelineTable onSelectLead={setSelectedLeadId} />

        <LeadDetailPanel
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          lead={
            selectedLeadId
              ? {
                  id: selectedLeadId,
                  name: "Ahmet Yılmaz",
                  title: "İK Direktörü",
                  company: "TechCorp Türkiye",
                  linkedinUrl: "https://linkedin.com/in/ahmetyilmaz",
                  stage: "İletişim Kurulacak",
                  score: 85,
                  painPoints: ["Çalışan motivasyonu", "Hediye tedariki"],
                  keyInterests: ["Kurumsal hediye", "Çalışan bağlılığı"],
                }
              : null
          }
        />
      </div>
    </AppLayout>
  );
}
