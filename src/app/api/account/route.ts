import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
    }

    const userId = user.id;

    // Cascade silme sırası (foreign key bağımlılıkları)
    const tables = [
      'messages',
      'lead_posts',
      'leads',
      'posts',
      'search_runs',
      'activity_logs',
      'user_settings',
      'saved_searches',
    ];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error(`Hesap silme hatası (${table}):`, error);
        return NextResponse.json(
          { error: `Veriler silinirken hata oluştu: ${table}` },
          { status: 500 }
        );
      }
    }

    // Auth'dan kullanıcıyı sil
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Kullanıcı silme hatası:', deleteUserError);
      return NextResponse.json(
        { error: 'Kullanıcı hesabı silinemedi' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Hesabınız ve tüm verileriniz silindi',
    });
  } catch (error) {
    console.error('Account delete error:', error);
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 });
  }
}
