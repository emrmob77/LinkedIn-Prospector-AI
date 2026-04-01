"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import type { PostCardData } from "@/components/search/post-card";
import type { LeadCandidate } from "@/types/apify";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, Users } from "lucide-react";

interface SearchState {
  posts: PostCardData[];
  leadCandidates: LeadCandidate[];
  postsFound: number;
  leadCandidatesCount: number;
  searchRunId: string | null;
  isSearching: boolean;
  error: string | null;
}

export default function SearchPage() {
  const [search, setSearch] = useState<SearchState>({
    posts: [],
    leadCandidates: [],
    postsFound: 0,
    leadCandidatesCount: 0,
    searchRunId: null,
    isSearching: false,
    error: null,
  });

  const handleSearch = async (params: {
    keywords: string[];
    maxPosts: number;
    dateFilter?: string;
    urls?: string[];
  }) => {
    setSearch((prev) => ({
      ...prev,
      isSearching: true,
      error: null,
    }));

    try {
      const res = await fetch("/api/search/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Hata: ${res.status}`);
      }

      const data = await res.json();

      // API sonuçlarını PostCardData formatına dönüştür
      const posts: PostCardData[] = data.posts.map((post: Record<string, unknown>) => ({
        id: (post.linkedinUrn as string) || String(Math.random()),
        authorName: post.authorName as string || "",
        authorTitle: post.authorTitle as string || "",
        authorCompany: post.authorCompany as string || "",
        authorProfileUrl: post.authorLinkedinUrl as string || "",
        authorProfilePicture: post.authorProfilePicture as string | null,
        authorFollowersCount: post.authorFollowersCount as string | null,
        authorType: (post.authorType as "Person" | "Company") || "Person",
        linkedinPostUrl: post.linkedinPostUrl as string || "",
        content: post.content as string || "",
        images: (post.images as string[]) || [],
        engagementLikes: post.engagementLikes as number || 0,
        engagementComments: post.engagementComments as number || 0,
        engagementShares: post.engagementShares as number || 0,
        publishedAt: post.publishedAt as string || "",
        timeSincePosted: "",
        isRelevant: post.isRelevant as boolean | null,
        relevanceConfidence: post.relevanceConfidence as number | null,
        theme: post.theme as string | null,
      }));

      setSearch({
        posts,
        leadCandidates: data.leadCandidates || [],
        postsFound: data.postsFound || 0,
        leadCandidatesCount: data.leadCandidatesCount || 0,
        searchRunId: data.searchRunId || null,
        isSearching: false,
        error: null,
      });
    } catch (err) {
      setSearch((prev) => ({
        ...prev,
        isSearching: false,
        error: err instanceof Error ? err.message : "Beklenmeyen hata",
      }));
    }
  };

  return (
    <AppLayout
      title="LinkedIn Arama"
      description="Anahtar kelimelerle LinkedIn gönderilerini tarayın ve potansiyel leadleri keşfedin"
    >
      <div className="space-y-6">
        {/* Sonuç özeti */}
        {search.searchRunId && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">
                    Bulunan Gönderi
                  </p>
                  <p className="text-sm font-semibold text-blue-900">
                    {search.postsFound} gönderi
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">
                    İlgili Gönderi
                  </p>
                  <p className="text-sm font-semibold text-emerald-900">
                    {search.posts.filter((p) => p.isRelevant === true).length} /{" "}
                    {search.postsFound} gönderi
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Users className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">
                    Lead Adayı
                  </p>
                  <p className="text-sm font-semibold text-amber-900">
                    {search.leadCandidatesCount} kişi
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <SearchForm onSearch={handleSearch} isSearching={search.isSearching} />

        {search.error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">
              {search.error}
            </CardContent>
          </Card>
        )}

        {search.posts.length > 0 && (
          <SearchResults posts={search.posts} />
        )}
      </div>
    </AppLayout>
  );
}
