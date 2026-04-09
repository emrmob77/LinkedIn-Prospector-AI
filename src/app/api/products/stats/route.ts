import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Gorsel analizden cikan urun ve marka verilerini aggregate eder
interface ImageAnalysis {
  products?: string[];
  brands?: string[];
  eventType?: string | null;
  qualityAssessment?: string;
  relevanceScore?: number;
  relevanceSummary?: string;
}

interface PostWithAnalysis {
  image_analysis: ImageAnalysis;
  author_name: string | null;
}

interface ProductStat {
  name: string;
  count: number;
  percentage: number;
}

interface EventTypeStat {
  name: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Auth kontrolu
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Oturum bulunamadi. Lutfen giris yapin.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Query parametrelerini al
    const { searchParams } = new URL(request.url);
    const minCount = Math.max(1, parseInt(searchParams.get('minCount') || '1', 10) || 1);
    const filterBrand = searchParams.get('brand')?.toLowerCase().trim() || null;
    const filterAuthor = searchParams.get('author')?.trim() || null;

    // 1. Adim: Kullanicinin search_run id'lerini al
    const { data: searchRuns, error: searchRunError } = await supabase
      .from('search_runs')
      .select('id')
      .eq('user_id', userId);

    if (searchRunError) {
      console.error('Search runs sorgu hatasi:', searchRunError);
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Arama gecmisi yuklenirken hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    const searchRunIds = (searchRuns || []).map((sr) => sr.id);

    const emptyResponse = {
      totalAnalyzedPosts: 0,
      totalProducts: 0,
      uniqueProductCount: 0,
      products: [],
      brands: [],
      eventTypes: [],
      avgRelevanceScore: 0,
      filters: { availableBrands: [] as string[], availableAuthors: [] as string[] },
    };

    // Kullanicinin hic search_run'i yoksa bos sonuc don
    if (searchRunIds.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // 2. Adim: image_analysis dolu olan postlari cek (supabaseAdmin ile RLS bypass)
    const { data: rawPosts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('image_analysis, author_name')
      .in('search_run_id', searchRunIds)
      .not('image_analysis', 'is', null);

    if (postsError) {
      console.error('Posts sorgu hatasi:', postsError);
      return NextResponse.json(
        {
          error: {
            code: 'QUERY_ERROR',
            message: 'Post verileri yuklenirken hata olustu.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 500 }
      );
    }

    const allPosts = (rawPosts || []) as PostWithAnalysis[];

    // Filtre secenekleri icin tum markalar ve yazarlari topla (filtreleme oncesi)
    const allBrandsSet = new Set<string>();
    const allAuthorsSet = new Set<string>();
    for (const post of allPosts) {
      const analysis = post.image_analysis;
      if (Array.isArray(analysis?.brands)) {
        for (const b of analysis.brands) {
          const n = b.toLowerCase().trim();
          if (n) allBrandsSet.add(n);
        }
      }
      if (post.author_name?.trim()) {
        allAuthorsSet.add(post.author_name.trim());
      }
    }

    // 3. Adim: Filtreleme uygula
    const filteredPosts = allPosts.filter((post) => {
      const analysis = post.image_analysis;

      // Marka filtresi: post'un brands array'inde secilen marka olmali
      if (filterBrand) {
        const postBrands = (analysis?.brands || []).map((b) => b.toLowerCase().trim());
        if (!postBrands.includes(filterBrand)) return false;
      }

      // Yazar filtresi: post'un author_name'i secilen yazar olmali
      if (filterAuthor) {
        if (post.author_name?.trim() !== filterAuthor) return false;
      }

      return true;
    });

    // 4. Adim: Server-side aggregation (filtrelenmis postlar uzerinde)
    const productCounts = new Map<string, number>();
    const brandCounts = new Map<string, number>();
    const eventTypeCounts = new Map<string, number>();
    let totalProducts = 0;
    let totalBrands = 0;
    let relevanceScoreSum = 0;
    let relevanceScoreCount = 0;

    for (const post of filteredPosts) {
      const analysis = post.image_analysis;
      if (!analysis) continue;

      // Urunleri say
      if (Array.isArray(analysis.products)) {
        for (const product of analysis.products) {
          const normalized = product.toLowerCase().trim();
          if (!normalized) continue;
          totalProducts++;
          productCounts.set(normalized, (productCounts.get(normalized) || 0) + 1);
        }
      }

      // Markalari say
      if (Array.isArray(analysis.brands)) {
        for (const brand of analysis.brands) {
          const normalized = brand.toLowerCase().trim();
          if (!normalized) continue;
          totalBrands++;
          brandCounts.set(normalized, (brandCounts.get(normalized) || 0) + 1);
        }
      }

      // Etkinlik turlerini say
      if (analysis.eventType && typeof analysis.eventType === 'string') {
        const normalized = analysis.eventType.toLowerCase().trim();
        if (normalized) {
          eventTypeCounts.set(normalized, (eventTypeCounts.get(normalized) || 0) + 1);
        }
      }

      // Uygunluk skoru
      if (typeof analysis.relevanceScore === 'number' && !isNaN(analysis.relevanceScore)) {
        relevanceScoreSum += analysis.relevanceScore;
        relevanceScoreCount++;
      }
    }

    // Urun istatistiklerini olustur (count DESC, minCount filtresi)
    const products: ProductStat[] = Array.from(productCounts.entries())
      .filter(([, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalProducts > 0
          ? Math.round((count / totalProducts) * 100 * 10) / 10
          : 0,
      }));

    // Marka istatistiklerini olustur (count DESC, minCount filtresi)
    const brands: ProductStat[] = Array.from(brandCounts.entries())
      .filter(([, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalBrands > 0
          ? Math.round((count / totalBrands) * 100 * 10) / 10
          : 0,
      }));

    // Etkinlik turleri (count DESC)
    const eventTypes: EventTypeStat[] = Array.from(eventTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Ortalama uygunluk skoru
    const avgRelevanceScore = relevanceScoreCount > 0
      ? Math.round((relevanceScoreSum / relevanceScoreCount) * 10) / 10
      : 0;

    return NextResponse.json({
      totalAnalyzedPosts: filteredPosts.length,
      totalProducts,
      uniqueProductCount: productCounts.size,
      products,
      brands,
      eventTypes,
      avgRelevanceScore,
      filters: {
        availableBrands: Array.from(allBrandsSet).sort(),
        availableAuthors: Array.from(allAuthorsSet).sort(),
      },
    });
  } catch (error) {
    console.error('Product stats hatasi:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Urun istatistikleri yuklenirken bir hata olustu.',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
