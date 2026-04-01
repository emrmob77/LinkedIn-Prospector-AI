"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostCard, PostCardData } from "./post-card";
import { Eye, EyeOff, Sparkles } from "lucide-react";

interface SearchResultsProps {
  posts: PostCardData[];
}

export function SearchResults({ posts }: SearchResultsProps) {
  const [showIrrelevant, setShowIrrelevant] = useState(false);

  const filteredPosts = showIrrelevant
    ? posts
    : posts.filter((p) => p.isRelevant !== false);

  const relevantCount = posts.filter((p) => p.isRelevant === true).length;
  const totalCount = posts.length;

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
              {totalCount} gönderi tarandı
              {relevantCount > 0 && `, ${relevantCount} ilgili bulundu`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {relevantCount > 0 && (
              <Badge variant="default" className="gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {relevantCount} ilgili
              </Badge>
            )}
            {totalCount - relevantCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                {totalCount - relevantCount} diğer
              </Badge>
            )}
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
        <div className="grid grid-cols-4 gap-2 items-start">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} onExtractLead={() => {}} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
