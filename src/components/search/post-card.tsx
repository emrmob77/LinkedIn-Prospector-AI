"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThumbsUp, MessageCircle, Share2, UserPlus, ExternalLink } from "lucide-react";

interface PostCardProps {
  post: {
    id: string;
    authorName: string;
    authorTitle: string;
    authorCompany: string;
    content: string;
    engagementLikes: number;
    engagementComments: number;
    engagementShares: number;
    publishedAt: string;
    isRelevant?: boolean | null;
    relevanceConfidence?: number | null;
    theme?: string | null;
  };
  onExtractLead?: (postId: string) => void;
}

export function PostCard({ post, onExtractLead }: PostCardProps) {
  const initials = post.authorName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Yazar bilgisi */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {post.authorTitle}
                {post.authorCompany && ` · ${post.authorCompany}`}
              </p>
            </div>
          </div>

          {/* AI Sınıflandırma rozeti */}
          <div className="flex gap-1">
            {post.isRelevant !== null && post.isRelevant !== undefined && (
              <Badge
                variant={post.isRelevant ? "default" : "secondary"}
                className="text-xs"
              >
                {post.isRelevant ? "İlgili" : "İlgisiz"}
                {post.relevanceConfidence !== null &&
                  post.relevanceConfidence !== undefined &&
                  ` %${post.relevanceConfidence}`}
              </Badge>
            )}
            {post.theme && (
              <Badge variant="outline" className="text-xs">
                {post.theme}
              </Badge>
            )}
          </div>
        </div>

        {/* Gönderi içeriği */}
        <p className="mt-3 text-sm leading-relaxed line-clamp-4">
          {post.content}
        </p>

        {/* Tarih */}
        <p className="mt-2 text-xs text-muted-foreground">{post.publishedAt}</p>

        {/* Etkileşim metrikleri ve aksiyonlar */}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {post.engagementLikes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {post.engagementComments}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              {post.engagementShares}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs">
              <ExternalLink className="mr-1 h-3 w-3" />
              Gönderiyi Aç
            </Button>
            {post.isRelevant && onExtractLead && (
              <Button
                size="sm"
                className="text-xs"
                onClick={() => onExtractLead(post.id)}
              >
                <UserPlus className="mr-1 h-3 w-3" />
                Lead Çıkar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
