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
import { Search, X, Bookmark } from "lucide-react";

export function SearchForm() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [maxPosts, setMaxPosts] = useState("50");
  const [isSearching, setIsSearching] = useState(false);

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

  const handleSearch = async () => {
    if (keywords.length === 0) return;
    setIsSearching(true);
    // TODO: API çağrısı yapılacak
    setTimeout(() => setIsSearching(false), 2000);
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
            />
            <Button variant="outline" onClick={addKeyword} type="button">
              Ekle
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button onClick={() => removeKeyword(keyword)}>
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
            <Select value={maxPosts} onValueChange={setMaxPosts}>
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
            <Label>Kaydedilmiş Aramalar</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seçiniz..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kayıtlı arama yok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={keywords.length === 0 || isSearching}
            className="flex-1"
          >
            {isSearching ? (
              <>
                <Search className="mr-2 h-4 w-4 animate-spin" />
                Taranıyor...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Aramayı Başlat
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" title="Aramayı Kaydet">
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
