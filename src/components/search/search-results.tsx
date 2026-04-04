"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard, PostCardData } from "./post-card";
import {
  Eye,
  EyeOff,
  Sparkles,
  LayoutGrid,
  Columns3,
  Columns4,
  List,
  ThumbsUp,
  MessageCircle,
  Share2,
  ExternalLink,
  Building2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type ViewMode = "2" | "3" | "4" | "list";

interface ClassifyResult {
  classified: number;
  relevant: number;
  irrelevant: number;
}

interface SearchResultsProps {
  posts: PostCardData[];
  searchRunId?: string | null;
  onClassifyComplete?: (result: ClassifyResult) => void;
}

const viewModeOptions: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: "2", label: "Buyuk", icon: <LayoutGrid className="h-4 w-4" /> },
  { value: "3", label: "Orta", icon: <Columns3 className="h-4 w-4" /> },
  { value: "4", label: "Kucuk", icon: <Columns4 className="h-4 w-4" /> },
  { value: "list", label: "Liste", icon: <List className="h-4 w-4" /> },
];

const gridClassMap: Record<ViewMode, string> = {
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  list: "grid-cols-1",
};

function ListItem({ post }: { post: PostCardData }) {
  const initials = post.authorName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const snippet =
    post.content && post.content.trim().length > 0
      ? post.content.length > 120
        ? post.content.slice(0, 120) + "..."
        : post.content
      : "Icerik mevcut degil";

  const postLink =
    post.linkedinPostUrl && post.linkedinPostUrl.trim()
      ? post.linkedinPostUrl
      : null;
  const authorLink =
    post.authorProfileUrl && post.authorProfileUrl.trim()
      ? post.authorProfileUrl
      : null;
  const externalLink = postLink || authorLink;

  const timeDisplay =
    post.timeSincePosted && post.timeSincePosted.trim()
      ? post.timeSincePosted
      : post.publishedAt && post.publishedAt.trim()
        ? new Date(post.publishedAt).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
          })
        : null;

  const [imgError, setImgError] = useState(false);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="flex items-center gap-3 p-3">
        {/* Sol: Gorsel */}
        <div className="shrink-0">
          {post.images.length > 0 && !imgError ? (
            <div className="w-20 h-20 rounded-md overflow-hidden bg-muted relative">
              <Image
                src={post.images[0]}
                alt="Gonderi gorseli"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center">
              <Avatar className="h-10 w-10">
                {post.authorProfilePicture && (
                  <AvatarImage
                    src={post.authorProfilePicture}
                    alt={post.authorName}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>

        {/* Orta: Bilgi */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <a
              href={post.authorProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold truncate hover:text-primary transition-colors"
            >
              {post.authorName}
            </a>
            {post.authorType === "Company" && (
              <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            )}
            <Badge
              className={`text-[10px] px-1.5 py-0 ml-1 ${
                post.isRelevant === true
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                  : post.isRelevant === false
                    ? "bg-red-500 hover:bg-red-600 text-white border-0"
                    : "bg-gray-200 text-gray-600 border-0"
              }`}
            >
              {post.isRelevant === true
                ? "Ilgili"
                : post.isRelevant === false
                  ? "Ilgisiz"
                  : "Siniflandirilmadi"}
              {post.relevanceConfidence != null &&
                post.isRelevant != null &&
                ` %${post.relevanceConfidence}`}
            </Badge>
            {post.theme && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 ml-1 border-blue-200 text-blue-700 bg-blue-50"
              >
                {post.theme}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{snippet}</p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="h-3 w-3" />
              {post.engagementLikes.toLocaleString("tr-TR")}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {post.engagementComments.toLocaleString("tr-TR")}
            </span>
            <span className="flex items-center gap-0.5">
              <Share2 className="h-3 w-3" />
              {post.engagementShares.toLocaleString("tr-TR")}
            </span>
          </div>
        </div>

        {/* Sag: Tarih + Link */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {timeDisplay && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {timeDisplay}
            </span>
          )}
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export function SearchResults({ posts, searchRunId, onClassifyComplete }: SearchResultsProps) {
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("3");
  const [classifying, setClassifying] = useState(false);
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null);

  const relevantCount = posts.filter((p) => p.isRelevant === true).length;
  const irrelevantCount = posts.filter((p) => p.isRelevant === false).length;
  const unclassifiedCount = posts.filter((p) => p.isRelevant == null).length;
  const classifiedCount = relevantCount + irrelevantCount;
  const allClassified = classifiedCount === posts.length && posts.length > 0;
  const totalCount = posts.length;

  const filteredPosts = showOnlyRelevant
    ? posts.filter((p) => p.isRelevant === true)
    : posts;

  const handleClassify = useCallback(async () => {
    if (!searchRunId || classifying) return;
    setClassifying(true);
    setClassifyMessage(null);

    try {
      const res = await fetch("/api/posts/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchRunId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Hata: ${res.status}`);
      }

      const result: ClassifyResult = await res.json();
      setClassifyMessage(
        `${result.classified} post siniflandirildi, ${result.relevant} ilgili bulundu`
      );
      onClassifyComplete?.(result);
    } catch (err) {
      setClassifyMessage(
        err instanceof Error ? err.message : "Siniflandirma hatasi"
      );
    } finally {
      setClassifying(false);
    }
  }, [searchRunId, classifying, onClassifyComplete]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Tarama Sonuclari
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {totalCount} gonderi tarandi
              {relevantCount > 0 && `, ${relevantCount} ilgili bulundu`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* AI Siniflandirma butonu */}
            {searchRunId && (
              <Button
                variant={allClassified ? "outline" : "default"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleClassify}
                disabled={classifying || allClassified}
              >
                {classifying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Siniflandiriliyor...
                  </>
                ) : allClassified ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Siniflandirildi
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    AI ile Siniflandir
                  </>
                )}
              </Button>
            )}

              {/* Ilgili/Ilgisiz/Bekliyor badge'leri */}
            {classifiedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200">{relevantCount} ilgili</Badge>
                <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-600 border-red-200">{irrelevantCount} ilgisiz</Badge>
                {unclassifiedCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5">{unclassifiedCount} bekliyor</Badge>
                )}
              </div>
            )}

            {/* Relevance filter toggle */}
            {relevantCount > 0 && (
              <Button
                variant={showOnlyRelevant ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() => setShowOnlyRelevant(!showOnlyRelevant)}
              >
                {showOnlyRelevant ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {showOnlyRelevant ? "Tümü" : "Sadece İlgili"}
              </Button>
            )}

          {/* View mode toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              {viewModeOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={viewMode === opt.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0 rounded-none"
                  onClick={() => setViewMode(opt.value)}
                  title={opt.label}
                >
                  {opt.icon}
                </Button>
              ))}
            </div>

          </div>
        </div>

        {/* Sınıflandırma Progress Bar */}
        {(classifying || (classifiedCount > 0 && classifiedCount < totalCount)) && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {classifying && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                {classifying ? "AI sınıflandırıyor..." : `${classifiedCount}/${totalCount} tamamlandı`}
              </span>
              <span className="font-mono text-muted-foreground">
                %{totalCount > 0 ? Math.round((classifiedCount / totalCount) * 100) : 0}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (classifiedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Sınıflandırma sonuç mesajı */}
        {classifyMessage && !classifying && (
          <div className="mt-2 rounded-md bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
            {classifyMessage}
          </div>
        )}
      </CardHeader>
      {classifyMessage && (
        <div className="mx-6 mb-3 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {classifyMessage}
        </div>
      )}
      <CardContent className="pt-0">
        {viewMode === "list" ? (
          <div className="flex flex-col gap-2">
            {filteredPosts.map((post) => (
              <ListItem key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div
            className={`grid ${gridClassMap[viewMode]} gap-2 items-start`}
          >
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} onExtractLead={() => {}} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
