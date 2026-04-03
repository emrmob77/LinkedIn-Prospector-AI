"use client";

import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import type { PostCardData } from "@/components/search/post-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Puzzle,
  Bot,
  Eye,
  Loader2,
  Inbox,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ImportHistoryItem {
  id: string;
  keywords: string[] | null;
  source: "apify" | "chrome_extension";
  pageUrl: string | null;
  status: string;
  postsFound: number;
  createdAt: string;
}

export default function SearchPage() {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/search/history");
      if (!res.ok) return [];
      const data = await res.json();
      const items: ImportHistoryItem[] = data.history || [];
      setHistory(items);
      return items;
    } catch {
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadRunPosts = useCallback(
    async (runId: string) => {
      if (loadingRunId) return;
      setLoadingRunId(runId);
      setError(null);

      try {
        const res = await fetch(`/api/search/${runId}/posts`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Hata: ${res.status}`);
        }
        const data = await res.json();
        setPosts(data.posts || []);
        setActiveRunId(runId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Beklenmeyen hata");
      } finally {
        setLoadingRunId(null);
      }
    },
    [loadingRunId]
  );

  useEffect(() => {
    const init = async () => {
      const items = await fetchHistory();
      if (items && items.length > 0) {
        const latest = items.find(
          (h) => h.status !== "failed" && h.postsFound > 0
        );
        if (latest) {
          setLoadingRunId(latest.id);
          try {
            const res = await fetch(`/api/search/${latest.id}/posts`);
            if (res.ok) {
              const data = await res.json();
              setPosts(data.posts || []);
              setActiveRunId(latest.id);
            }
          } catch {
            // sessizce gec
          } finally {
            setLoadingRunId(null);
          }
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeItem = history.find((h) => h.id === activeRunId);
  const visibleHistory = historyExpanded ? history : history.slice(0, 3);

  return (
    <AppLayout
      title="LinkedIn Arama"
      description="Chrome Extension ile LinkedIn gönderilerini içe aktarın"
    >
      <div className="space-y-3">
        {/* Rehber — tek satır */}
        <SearchForm />

        {/* Import History — kompakt */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground">
              Son Import&apos;lar
            </span>
            {activeItem && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground">
                  {activeItem.postsFound} gönderi
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {formatDate(activeItem.createdAt)}
                </span>
              </div>
            )}
          </div>

          <div className="px-2 py-1.5">
            {historyLoading ? (
              <div className="flex gap-2 p-1">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-7 w-32" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
                <Inbox className="h-4 w-4" />
                <span className="text-xs">
                  Henüz import yok — Chrome Extension ile başlayın
                </span>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {visibleHistory.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeRunId === item.id ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[11px] gap-1.5 px-2.5"
                      onClick={() => loadRunPosts(item.id)}
                      disabled={
                        loadingRunId !== null ||
                        item.status === "failed" ||
                        item.postsFound === 0
                      }
                    >
                      {loadingRunId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          {item.source === "chrome_extension" ? (
                            <Puzzle className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <span>{formatDate(item.createdAt)}</span>
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4 ml-0.5"
                          >
                            {item.postsFound}
                          </Badge>
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                {history.length > 3 && (
                  <button
                    onClick={() => setHistoryExpanded(!historyExpanded)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-1 px-1 transition-colors"
                  >
                    {historyExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Daha az
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        {history.length - 3} daha
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {posts.length > 0 && <SearchResults posts={posts} />}
      </div>
    </AppLayout>
  );
}
