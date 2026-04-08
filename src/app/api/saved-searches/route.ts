import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, name, description, keywords, max_posts, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Saved searches query error:', error);
      return NextResponse.json(
        { error: 'Kaydedilmis aramalar alinamadi' },
        { status: 500 }
      );
    }

    const searches = (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      keywords: s.keywords,
      maxPosts: s.max_posts,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return NextResponse.json({ searches });
  } catch (error) {
    console.error('Saved searches error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, keywords, maxPosts } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Arama adi zorunludur' },
        { status: 400 }
      );
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'En az bir anahtar kelime gerekli' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        keywords,
        max_posts: maxPosts || 50,
      })
      .select('id, name, description, keywords, max_posts, created_at, updated_at')
      .single();

    if (error) {
      console.error('Save search error:', error);
      return NextResponse.json(
        { error: 'Arama kaydedilemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      search: {
        id: data.id,
        name: data.name,
        description: data.description,
        keywords: data.keywords,
        maxPosts: data.max_posts,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Save search error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
