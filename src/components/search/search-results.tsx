"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostCard } from "./post-card";
import { Eye, EyeOff, Sparkles } from "lucide-react";

interface DemoPost {
  id: string;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  content: string;
  engagementLikes: number;
  engagementComments: number;
  engagementShares: number;
  publishedAt: string;
  isRelevant: boolean | null;
  relevanceConfidence: number | null;
  theme: string | null;
}

const demoPosts: DemoPost[] = [
  {
    id: "1",
    authorName: "Ahmet Yılmaz",
    authorTitle: "İnsan Kaynakları Direktörü",
    authorCompany: "TechCorp Türkiye",
    content: "Bu yıl çalışan motivasyonu için kurumsal hediye programımızı tamamen yeniledik. 500+ çalışana kişiselleştirilmiş hediye paketleri gönderdik ve geri dönüşler muhteşem oldu. Kurumsal hediye konusunda doğru partneri bulmak gerçekten fark yaratıyor.",
    engagementLikes: 234,
    engagementComments: 45,
    engagementShares: 12,
    publishedAt: "2 saat önce",
    isRelevant: true,
    relevanceConfidence: 92,
    theme: "Kurumsal Hediye",
  },
  {
    id: "2",
    authorName: "Fatma Şahin",
    authorTitle: "Satın Alma Müdürü",
    authorCompany: "Global Lojistik A.Ş.",
    content: "Yılbaşı yaklaşırken müşterilerimize ve iş ortaklarımıza özel hediye setleri hazırlamak istiyoruz. Geçen yıl son dakikaya bırakmıştık ve kalitesiz ürünlerle karşılaştık. Bu yıl erken planlamak istiyoruz. Önerisi olan var mı?",
    engagementLikes: 189,
    engagementComments: 67,
    engagementShares: 8,
    publishedAt: "5 saat önce",
    isRelevant: true,
    relevanceConfidence: 88,
    theme: "Kurumsal Hediye",
  },
  {
    id: "3",
    authorName: "Mehmet Demir",
    authorTitle: "CEO",
    authorCompany: "ABC Teknoloji",
    content: "Startup ekosisteminde networking çok önemli. Geçen hafta katıldığım etkinlikte harika bağlantılar kurdum. Türkiye teknoloji sektörünün geleceği parlak görünüyor.",
    engagementLikes: 567,
    engagementComments: 89,
    engagementShares: 34,
    publishedAt: "1 gün önce",
    isRelevant: false,
    relevanceConfidence: 15,
    theme: null,
  },
  {
    id: "4",
    authorName: "Ayşe Kaya",
    authorTitle: "Pazarlama Direktörü",
    authorCompany: "Mega Holding",
    content: "Bu çeyrekte müşteri sadakat programımız kapsamında VIP müşterilerimize premium hediye kutuları göndereceğiz. Bütçemiz 200K+ ve 1000 paket planlıyoruz. Tedarikçi araştırmasına başladık. Kaliteli kurumsal hediye tedarikçisi önerilerinizi bekliyorum.",
    engagementLikes: 312,
    engagementComments: 78,
    engagementShares: 19,
    publishedAt: "1 gün önce",
    isRelevant: true,
    relevanceConfidence: 95,
    theme: "Kurumsal Hediye",
  },
];

export function SearchResults() {
  const [showIrrelevant, setShowIrrelevant] = useState(false);

  const filteredPosts = showIrrelevant
    ? demoPosts
    : demoPosts.filter((p) => p.isRelevant !== false);

  const relevantCount = demoPosts.filter((p) => p.isRelevant === true).length;
  const totalCount = demoPosts.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Tarama Sonuçları
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {totalCount} gönderi tarandı, {relevantCount} ilgili bulundu
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {relevantCount} ilgili
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              {totalCount - relevantCount} ilgisiz
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIrrelevant(!showIrrelevant)}
              className="text-xs h-7"
            >
              {showIrrelevant ? (
                <>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Filtrele
                </>
              ) : (
                <>
                  <Eye className="mr-1 h-3 w-3" />
                  Tümü
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onExtractLead={() => {}}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
