"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2 } from "lucide-react";

interface SearchFormProps {
  onSearch: (params: {
    keywords: string[];
    maxPosts: number;
    dateFilter?: string;
  }) => void;
  isSearching: boolean;
}

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [maxPosts, setMaxPosts] = useState("50");
  const [dateFilter, setDateFilter] = useState("none");

  const addKeyword = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setInputValue("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSearch = () => {
    if (keywords.length === 0 || isSearching) return;
    onSearch({
      keywords,
      maxPosts: parseInt(maxPosts, 10),
      dateFilter: dateFilter !== "none" ? dateFilter : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" />
          LinkedIn Arama
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="keywords">Anahtar Kelimeler</Label>
          <div className="flex gap-2">
            <Input
              id="keywords"
              placeholder="Anahtar kelime girin ve Enter'a basın..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSearching}
            />
            <Button
              variant="outline"
              onClick={addKeyword}
              type="button"
              disabled={isSearching}
            >
              Ekle
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    disabled={isSearching}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Maksimum Gönderi</Label>
            <Select
              value={maxPosts}
              onValueChange={setMaxPosts}
              disabled={isSearching}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 gönderi</SelectItem>
                <SelectItem value="50">50 gönderi</SelectItem>
                <SelectItem value="100">100 gönderi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tarih Filtresi</Label>
            <Select
              value={dateFilter}
              onValueChange={setDateFilter}
              disabled={isSearching}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tümü</SelectItem>
                <SelectItem value="past-24h">Son 24 saat</SelectItem>
                <SelectItem value="past-week">Son hafta</SelectItem>
                <SelectItem value="past-month">Son ay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={keywords.length === 0 || isSearching}
          className="w-full"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Apify taranıyor... (bu işlem 1-2 dakika sürebilir)
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Aramayı Başlat
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
