"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  UserPlus,
  ExternalLink,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface PostCardData {
  id: string;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  authorProfileUrl: string;
  authorProfilePicture: string | null;
  authorFollowersCount: string | null;
  authorType: "Person" | "Company";
  linkedinPostUrl: string;
  content: string;
  images: string[];
  engagementLikes: number;
  engagementComments: number;
  engagementShares: number;
  publishedAt: string;
  timeSincePosted: string;
  isRelevant?: boolean | null;
  relevanceConfidence?: number | null;
  theme?: string | null;
}

interface PostCardProps {
  post: PostCardData;
  onExtractLead?: (postId: string) => void;
}

export function PostCard({ post, onExtractLead }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const initials = post.authorName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasContent = post.content && post.content.trim().length > 0;
  const isLongContent = hasContent && post.content.length > 100;
  const displayContent = !hasContent
    ? ""
    : expanded || !isLongContent
      ? post.content
      : post.content.slice(0, 100) + "...";

  const postLink = post.linkedinPostUrl && post.linkedinPostUrl.trim()
    ? post.linkedinPostUrl
    : null;
  const authorLink = post.authorProfileUrl && post.authorProfileUrl.trim()
    ? post.authorProfileUrl
    : null;
  const externalLink = postLink || authorLink;

  const timeDisplay = post.timeSincePosted && post.timeSincePosted.trim()
    ? post.timeSincePosted
    : post.publishedAt && post.publishedAt.trim()
      ? new Date(post.publishedAt).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        })
      : null;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg group">
      {/* Görsel — kompakt */}
      {post.images.length > 0 && !imageError && (
        <a
          href={externalLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full overflow-hidden bg-muted ${!externalLink ? "pointer-events-none" : ""}`}
        >
          <Image
            src={post.images[0]}
            alt="Gönderi görseli"
            width={800}
            height={800}
            className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
            unoptimized
            onError={() => setImageError(true)}
          />
          {post.images.length > 1 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              +{post.images.length - 1}
            </div>
          )}
          {/* İlgililik rozeti — görsel üstünde */}
          {post.isRelevant !== null && post.isRelevant !== undefined && (
            <div className="absolute top-1.5 left-1.5">
              <Badge
                className={`text-[10px] px-1.5 py-0 ${
                  post.isRelevant
                    ? "bg-emerald-500/90 hover:bg-emerald-600 text-white border-0"
                    : "bg-gray-500/70 text-white border-0"
                }`}
              >
                {post.isRelevant ? "İlgili" : "İlgisiz"}
                {post.relevanceConfidence != null &&
                  ` %${post.relevanceConfidence}`}
              </Badge>
            </div>
          )}
        </a>
      )}

      <div className="p-2">
        {/* İlgililik rozeti — görselsiz kartlar için */}
        {post.images.length === 0 &&
          post.isRelevant !== null &&
          post.isRelevant !== undefined && (
            <div className="mb-2">
              <Badge
                className={`text-[10px] px-1.5 py-0 ${
                  post.isRelevant
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                    : "bg-gray-200 text-gray-600 border-0"
                }`}
              >
                {post.isRelevant ? "İlgili" : "İlgisiz"}
                {post.relevanceConfidence != null &&
                  ` %${post.relevanceConfidence}`}
              </Badge>
            </div>
          )}

        {/* Yazar */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6 shrink-0">
            {post.authorProfilePicture && (
              <AvatarImage
                src={post.authorProfilePicture}
                alt={post.authorName}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <a
                href={post.authorProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold truncate hover:text-primary transition-colors"
              >
                {post.authorName}
              </a>
              {post.authorType === "Company" && (
                <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {timeDisplay && <span>{timeDisplay}</span>}
              {timeDisplay && post.authorFollowersCount && <span>·</span>}
              {post.authorFollowersCount && (
                <span>{post.authorFollowersCount} takipçi</span>
              )}
            </div>
          </div>
        </div>

        {/* Tema */}
        {post.theme && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 mb-1.5 border-blue-200 text-blue-700 bg-blue-50"
          >
            {post.theme}
          </Badge>
        )}

        {/* İçerik */}
        {hasContent ? (
          <p className="text-[11px] leading-snug text-foreground/80 whitespace-pre-line">
            {displayContent}
          </p>
        ) : (
          <p className="text-[11px] leading-snug text-muted-foreground italic">
            İçerik mevcut değil
          </p>
        )}
        {isLongContent && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5 mt-0.5"
          >
            {expanded ? (
              <>
                Kapat <ChevronUp className="h-2.5 w-2.5" />
              </>
            ) : (
              <>
                devamı <ChevronDown className="h-2.5 w-2.5" />
              </>
            )}
          </button>
        )}

        {/* Etkileşim + Aksiyonlar */}
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t">
          <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
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
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Lead Çıkar butonu */}
        {post.isRelevant && onExtractLead && (
          <Button
            size="sm"
            className="w-full mt-1.5 text-[10px] h-6"
            onClick={() => onExtractLead(post.id)}
          >
            <UserPlus className="mr-1 h-3 w-3" />
            Lead Olarak Kaydet
          </Button>
        )}
      </div>
    </Card>
  );
}
