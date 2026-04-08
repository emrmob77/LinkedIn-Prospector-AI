import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Kullanicinin haric tuttugu marka isimlerini dondurur.
 * user_settings tablosundan excluded_brands + company_name degerlerini birlestirerek tek liste olusturur.
 */
export async function getExcludedBrands(userId: string): Promise<string[]> {
  try {
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('excluded_brands, company_name')
      .eq('user_id', userId)
      .single();

    if (!settings) return [];

    const brands = Array.isArray(settings.excluded_brands)
      ? settings.excluded_brands
      : JSON.parse(settings.excluded_brands || '[]');
    const excludedBrands: string[] = brands.filter((b: unknown) => typeof b === 'string' && b);

    if (settings.company_name && typeof settings.company_name === 'string') {
      const cn = settings.company_name.trim();
      if (cn && !excludedBrands.some((b: string) => b.toLowerCase() === cn.toLowerCase())) {
        excludedBrands.push(cn);
      }
    }

    return excludedBrands;
  } catch {
    return [];
  }
}

/**
 * Supabase sorgusuna haric tutulan marka filtresini uygular.
 * NOT ILIKE NULL satirlari disladigindan, company IS NULL olanlari da dahil eder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyBrandFilter<T extends { or: (...args: any[]) => any }>(query: T, brands: string[]): T {
  let filtered = query;
  for (const brand of brands) {
    const escaped = brand.replace(/%/g, '\\%').replace(/_/g, '\\_');
    filtered = filtered.or(`company.not.ilike.%${escaped}%,company.is.null`);
  }
  return filtered;
}
