import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { processExtensionImport } from '@/services/extensionImportService';
import type { ExtensionImportRequest, ExtensionPostData } from '@/types/extension';

// CORS headers for Chrome Extension requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    // Check for Bearer token from extension first, then fall back to cookies
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
        ...(bearerToken
          ? {
              global: {
                headers: { Authorization: `Bearer ${bearerToken}` },
              },
            }
          : {}),
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Parse and validate request body
    const body: ExtensionImportRequest = await request.json();
    const { posts, source, pageUrl } = body;

    // Validate required fields
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: 'posts array is required and must not be empty' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!pageUrl || typeof pageUrl !== 'string' || pageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: 'pageUrl is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Limit batch size to prevent abuse
    if (posts.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 posts per import request' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate each post has minimum required fields
    // authorName boş olan postları filtrele (hata vermek yerine atla)
    const validPosts = posts.filter((post: ExtensionPostData) =>
      post.authorName && post.authorName.trim().length > 0
    );

    if (validPosts.length === 0) {
      return NextResponse.json(
        { error: 'Geçerli post bulunamadı. Postlarda yazar bilgisi eksik.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Process the import
    const result = await processExtensionImport(
      {
        supabase,
        userId: user.id,
        source: source || 'chrome_extension',
        pageUrl: pageUrl.trim(),
      },
      validPosts
    );

    // Map result fields to match what the extension expects
    const skippedCount = posts.length - validPosts.length;
    const response: Record<string, unknown> = {
      ...result,
      importedCount: result.postsImported,
      skippedInvalid: skippedCount,
      duplicateCount: result.postsDuplicate,
      leadCount: result.leadCandidatesCount,
      message: `${result.postsImported} post basariyla aktarildi.`,
    };

    // Auto-classification artık frontend tarafında yapılıyor (Vercel timeout sorunu)
    // Search sayfası yüklendiğinde sınıflandırılmamış post varsa otomatik başlatılır

    return NextResponse.json(response, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    console.error('Extension import error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';

    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}


