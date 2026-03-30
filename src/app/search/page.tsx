"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export default function SearchPage() {
  return (
    <AppLayout
      title="LinkedIn Arama"
      description="Anahtar kelimelerle LinkedIn gönderilerini tarayın ve potansiyel leadleri keşfedin"
    >
      <div className="space-y-6">
        {/* Son arama özeti */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Son Arama</p>
                <p className="text-sm font-semibold text-blue-900">2 saat önce</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">İlgili Gönderi</p>
                <p className="text-sm font-semibold text-emerald-900">3 / 4 gönderi</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-100 p-2">
                <XCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Çıkarılan Lead</p>
                <p className="text-sm font-semibold text-amber-900">3 lead</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <SearchForm />
        <SearchResults />
      </div>
    </AppLayout>
  );
}
