"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import type { PostCardData } from "@/components/search/post-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Puzzle,
  Bot,
  Loader2,
  Inbox,
  ChevronDown,
  ChevronUp,
  Star,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Search,
} from "lucide-react";

interface ImportHistoryItem {
  id: string;
  keywords: string[] | null;
  source: string;
  pageUrl: string | null;
  status: string;
  postsFound: number;
  createdAt: string;
}

interface SavedSearchItem {
  id: string;
  name: string;
  description: string | null;
  keywords: string[];
  maxPosts: number;
  createdAt: string;
  updatedAt: string;
}

export default function SearchPage() {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Kaydedilmis Aramalar state
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [savedSearchesLoading, setSavedSearchesLoading] = useState(true);
  const [savedSearchesExpanded, setSavedSearchesExpanded] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogRunId, setSaveDialogRunId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // localStorage'dan favorileri yukle
  useEffect(() => {
    try {
      const stored = localStorage.getItem("search_favorites");
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // localStorage bos veya bozuk — sessizce gec
    }
  }, []);

  const toggleFavorite = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        localStorage.setItem("search_favorites", JSON.stringify(Array.from(next)));
        return next;
      });
    },
    []
  );

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

  // Kaydedilmis aramalari cek
  const fetchSavedSearches = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-searches");
      if (!res.ok) return;
      const data = await res.json();
      setSavedSearches(data.searches || []);
    } catch {
      // sessizce gec
    } finally {
      setSavedSearchesLoading(false);
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

  // Siniflandirilmamis postlar varsa otomatik classify baslat
  const autoClassifyRef = useRef(false);

  const triggerAutoClassify = useCallback(async (runId: string, loadedPosts: PostCardData[]) => {
    if (autoClassifyRef.current) return;
    const unclassified = loadedPosts.filter(p => p.isRelevant == null);
    if (unclassified.length === 0) return;

    autoClassifyRef.current = true;

    // Polling baslat
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/search/${runId}/posts`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch { /* sessiz */ }
    }, 5000);

    // Siniflandirmayi tetikle (arka planda)
    try {
      await fetch("/api/posts/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchRunId: runId }),
      });
    } catch { /* sessiz */ }

    // Polling durdur, son veriyi cek
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    try {
      const res = await fetch(`/api/search/${runId}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* sessiz */ }
    autoClassifyRef.current = false;
  }, []);

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
              const loadedPosts = data.posts || [];
              setPosts(loadedPosts);
              setActiveRunId(latest.id);

              // Siniflandirilmamis post varsa otomatik baslat
              triggerAutoClassify(latest.id, loadedPosts);
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
    fetchSavedSearches();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
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

  // Kaydetme dialog'unu ac
  const openSaveDialog = useCallback((runId: string) => {
    const item = history.find((h) => h.id === runId);
    setSaveDialogRunId(runId);
    setSaveName(
      item?.keywords?.join(", ") || ""
    );
    setSaveDescription("");
    setSaveDialogOpen(true);
  }, [history]);

  // Arama kaydet
  const handleSaveSearch = useCallback(async () => {
    if (!saveDialogRunId || !saveName.trim()) return;
    setSaving(true);

    const item = history.find((h) => h.id === saveDialogRunId);
    const keywords = item?.keywords || saveName.split(",").map((k) => k.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDescription.trim() || null,
          keywords,
          maxPosts: 50,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSavedSearches((prev) => [data.search, ...prev]);
        setSaveDialogOpen(false);
        setSaveName("");
        setSaveDescription("");
      }
    } catch {
      // sessiz
    } finally {
      setSaving(false);
    }
  }, [saveDialogRunId, saveName, saveDescription, history]);

  // Kaydedilmis aramayi sil
  const handleDeleteSavedSearch = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);

    try {
      const res = await fetch(`/api/saved-searches/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // sessiz
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Kaydedilmis aramaya tiklaninca ilgili import'u bul ve postlari yukle
  const handleSavedSearchClick = useCallback(
    (savedSearch: SavedSearchItem) => {
      // Keyword'leri eslesen en son import'u bul
      const matchingRun = history.find((h) => {
        if (!h.keywords || h.postsFound === 0 || h.status === "failed") return false;
        const savedKws = new Set(savedSearch.keywords.map((k) => k.toLowerCase()));
        return h.keywords.some((k) => savedKws.has(k.toLowerCase()));
      });

      if (matchingRun) {
        loadRunPosts(matchingRun.id);
      }
    },
    [history, loadRunPosts]
  );

  const activeItem = history.find((h) => h.id === activeRunId);

  // Favoriler en uste, geri kalanlar orijinal sirada
  const sortedHistory = [...history].sort((a, b) => {
    const aFav = favorites.has(a.id) ? 1 : 0;
    const bFav = favorites.has(b.id) ? 1 : 0;
    return bFav - aFav;
  });
  const visibleHistory = historyExpanded
    ? sortedHistory
    : sortedHistory.slice(0, 3);

  return (
    <AppLayout
      title="LinkedIn Arama"
      description="Chrome Extension ile LinkedIn gönderilerini içe aktarın"
    >
      <div className="space-y-3">
        {/* Rehber — tek satir */}
        <SearchForm />

        {/* Kaydedilmis Aramalar */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <button
              onClick={() => setSavedSearchesExpanded(!savedSearchesExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Kaydedilmis Aramalar
              {savedSearches.length > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                  {savedSearches.length}
                </Badge>
              )}
              {savedSearchesExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {activeRunId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1 px-2"
                onClick={() => openSaveDialog(activeRunId)}
              >
                <BookmarkPlus className="h-3 w-3" />
                Aramayi Kaydet
              </Button>
            )}
          </div>

          {savedSearchesExpanded && (
            <div className="px-2 py-1.5">
              {savedSearchesLoading ? (
                <div className="flex gap-2 p-1">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-7 w-32" />
                  ))}
                </div>
              ) : savedSearches.length === 0 ? (
                <div className="flex items-center gap-2 py-2 justify-center text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    Henuz kaydedilmis arama yok
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {savedSearches.map((item) => (
                    <div key={item.id} className="flex items-center gap-0.5 group">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1.5 px-2.5"
                        onClick={() => handleSavedSearchClick(item)}
                        disabled={loadingRunId !== null}
                        title={item.description || item.name}
                      >
                        <Bookmark className="h-3 w-3 text-blue-500" />
                        <span className="max-w-[120px] truncate">{item.name}</span>
                        {item.keywords.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4 ml-0.5"
                          >
                            {item.keywords.length} kw
                          </Badge>
                        )}
                      </Button>
                      <button
                        onClick={(e) => handleDeleteSavedSearch(item.id, e)}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="Sil"
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-red-500" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
                    <div key={item.id} className="flex items-center gap-0.5">
                      <Button
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
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                        title={
                          favorites.has(item.id)
                            ? "Favorilerden cikar"
                            : "Favorilere ekle"
                        }
                      >
                        <Star
                          className={`h-3.5 w-3.5 transition-colors ${
                            favorites.has(item.id)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40 hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    </div>
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

        {posts.length > 0 && (
          <SearchResults
            posts={posts}
            searchRunId={activeRunId}
            onClassifyStart={() => {
              // Her 5 saniyede postlari yenile (progress bar guncellenir)
              if (pollingRef.current) clearInterval(pollingRef.current);
              pollingRef.current = setInterval(async () => {
                if (!activeRunId) return;
                try {
                  const res = await fetch(`/api/search/${activeRunId}/posts`);
                  if (res.ok) {
                    const data = await res.json();
                    setPosts(data.posts || []);
                  }
                } catch { /* sessiz */ }
              }, 5000);
            }}
            onClassifyComplete={() => {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              if (activeRunId) {
                loadRunPosts(activeRunId);
              }
            }}
          />
        )}
      </div>

      {/* Arama Kaydetme Dialog'u */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aramayi Kaydet</DialogTitle>
            <DialogDescription>
              Bu aramayi kaydederek daha sonra kolayca erisebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Arama Adi *
              </label>
              <Input
                placeholder="ör. React Gelistiriciler"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Aciklama (opsiyonel)
              </label>
              <Input
                placeholder="ör. Freelance React gelisitircileri ariyorum"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {/* Keyword'leri goster */}
            {saveDialogRunId && (() => {
              const item = history.find((h) => h.id === saveDialogRunId);
              if (!item?.keywords?.length) return null;
              return (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Anahtar Kelimeler
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {item.keywords.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saving}
            >
              Iptal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSearch}
              disabled={saving || !saveName.trim()}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
