"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, TrendingUp, BarChart3, Tag, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProductStats {
  totalAnalyzedPosts: number;
  totalProducts: number;
  uniqueProductCount: number;
  products: Array<{ name: string; count: number; percentage: number }>;
  brands: Array<{ name: string; count: number; percentage: number }>;
  eventTypes: Array<{ name: string; count: number }>;
  avgRelevanceScore: number;
  filters: {
    availableBrands: string[];
    availableAuthors: string[];
  };
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const ALL_VALUE = "__all__";

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ProductsPage() {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>(ALL_VALUE);
  const [selectedAuthor, setSelectedAuthor] = useState<string>(ALL_VALUE);

  const fetchStats = useCallback(async (brand?: string, author?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (brand) params.set("brand", brand);
      if (author) params.set("author", author);
      const qs = params.toString();
      const res = await fetch(`/api/products/stats${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errorMessage = body.error?.message || (typeof body.error === 'string' ? body.error : null) || `Hata: ${res.status}`;
        throw new Error(errorMessage);
      }
      const data: ProductStats = await res.json();
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Veriler yüklenemedi";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(
      selectedBrand !== ALL_VALUE ? selectedBrand : undefined,
      selectedAuthor !== ALL_VALUE ? selectedAuthor : undefined
    );
  }, [fetchStats, selectedBrand, selectedAuthor]);

  const hasActiveFilter = selectedBrand !== ALL_VALUE || selectedAuthor !== ALL_VALUE;
  const clearFilters = () => {
    setSelectedBrand(ALL_VALUE);
    setSelectedAuthor(ALL_VALUE);
  };

  const isEmpty =
    !loading &&
    !error &&
    stats &&
    stats.uniqueProductCount === 0 &&
    stats.totalProducts === 0;

  const chartData = (stats?.products.slice(0, 10) ?? []).map((p) => ({
    ...p,
    name: capitalize(p.name),
  }));

  return (
    <AppLayout
      title="Ürün Analizi"
      description="Görsel analizden tespit edilen ürün ve marka istatistikleri"
    >
      <div className="space-y-6">
        {/* Hata durumu */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => fetchStats(selectedBrand !== ALL_VALUE ? selectedBrand : undefined, selectedAuthor !== ALL_VALUE ? selectedAuthor : undefined)}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-300"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {/* Boş durum */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Henüz görsel analiz yapılmış post yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Arama sonuçlarından görselleri analiz edin.
            </p>
          </div>
        )}

        {/* Filtreler */}
        {stats && (stats.filters.availableBrands.length > 0 || stats.filters.availableAuthors.length > 0) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filtrele:</span>

                {stats.filters.availableBrands.length > 0 && (
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="w-[200px] h-9">
                      <SelectValue placeholder="Marka seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Tüm Markalar</SelectItem>
                      {stats.filters.availableBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {stats.filters.availableAuthors.length > 0 && (
                  <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                    <SelectTrigger className="w-[220px] h-9">
                      <SelectValue placeholder="Kullanıcı seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>Tüm Kullanıcılar</SelectItem>
                      {stats.filters.availableAuthors.map((author) => (
                        <SelectItem key={author} value={author}>
                          {author}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {hasActiveFilter && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                    <X className="h-4 w-4 mr-1" />
                    Temizle
                  </Button>
                )}

                {hasActiveFilter && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.totalAnalyzedPosts} post filtrelendi
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Özet Kartları */}
        {(loading || (stats && !isEmpty)) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {loading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : stats && !isEmpty ? (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Benzersiz Ürün</p>
                      <p className="text-2xl font-bold mt-1">{stats.uniqueProductCount}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Tespit</p>
                      <p className="text-2xl font-bold mt-1">{stats.totalProducts}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                      <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ortalama Uygunluk</p>
                      <p className="text-2xl font-bold mt-1">
                        %{stats.avgRelevanceScore.toFixed(0)}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
        )}

        {/* Bar Chart - En Popüler Ürünler */}
        {!loading && stats && !isEmpty && chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">En Popüler Ürünler</CardTitle>
              <CardDescription>İlk 10 ürün (tespit sayısına göre)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={160}
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} adet`, "Tespit"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ürün ve Marka Tabloları */}
        {!loading && stats && !isEmpty && (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Ürün Tablosu */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Tespit Edilen Ürünler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Henüz görsel analiz yapılmış post yok
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead className="text-right w-20">Adet</TableHead>
                        <TableHead className="text-right w-24">Yüzde (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.products.map((product, index) => (
                        <TableRow key={product.name}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{capitalize(product.name)}</TableCell>
                          <TableCell className="text-right">{product.count}</TableCell>
                          <TableCell className="text-right">
                            %{product.percentage.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Marka Tablosu */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tespit Edilen Markalar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.brands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Henüz marka tespiti yapılmamış
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Marka</TableHead>
                        <TableHead className="text-right w-20">Adet</TableHead>
                        <TableHead className="text-right w-24">Yüzde (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.brands.map((brand, index) => (
                        <TableRow key={brand.name}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{capitalize(brand.name)}</TableCell>
                          <TableCell className="text-right">{brand.count}</TableCell>
                          <TableCell className="text-right">
                            %{brand.percentage.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Etkinlik Türleri */}
        {!loading && stats && !isEmpty && stats.eventTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etkinlik Türleri</CardTitle>
              <CardDescription>Postlarda tespit edilen etkinlik türleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.eventTypes.map((event) => (
                  <Badge key={event.name} variant="secondary" className="text-sm px-3 py-1">
                    {capitalize(event.name)}
                    <span className="ml-1.5 font-bold">{event.count}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading tablolar */}
        {loading && (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
