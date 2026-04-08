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
    // Not: posts ve lead_posts tablolarında user_id kolonu yok.
    // posts -> search_runs.user_id üzerinden, lead_posts -> leads.user_id üzerinden bağlı.
    // Bu yüzden önce alt tabloları ilişki üzerinden silmeliyiz.

    // 1. messages (user_id var)
    {
      const { error } = await supabaseAdmin.from('messages').delete().eq('user_id', userId);
      if (error) {
        console.error('Hesap silme hatası (messages):', error);
        return NextResponse.json({ error: 'Veriler silinirken hata oluştu: messages' }, { status: 500 });
      }
    }

    // 2. lead_posts — leads.user_id üzerinden (lead_posts'ta user_id yok)
    {
      const { data: userLeads } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('user_id', userId);
      const leadIds = (userLeads || []).map((l: { id: string }) => l.id);
      if (leadIds.length > 0) {
        const { error } = await supabaseAdmin.from('lead_posts').delete().in('lead_id', leadIds);
        if (error) {
          console.error('Hesap silme hatası (lead_posts):', error);
          return NextResponse.json({ error: 'Veriler silinirken hata oluştu: lead_posts' }, { status: 500 });
        }
      }
    }

    // 3. leads (user_id var)
    {
      const { error } = await supabaseAdmin.from('leads').delete().eq('user_id', userId);
      if (error) {
        console.error('Hesap silme hatası (leads):', error);
        return NextResponse.json({ error: 'Veriler silinirken hata oluştu: leads' }, { status: 500 });
      }
    }

    // 4. posts — search_runs.user_id üzerinden (posts'ta user_id yok)
    {
      const { data: userRuns } = await supabaseAdmin
        .from('search_runs')
        .select('id')
        .eq('user_id', userId);
      const runIds = (userRuns || []).map((r: { id: string }) => r.id);
      if (runIds.length > 0) {
        const { error } = await supabaseAdmin.from('posts').delete().in('search_run_id', runIds);
        if (error) {
          console.error('Hesap silme hatası (posts):', error);
          return NextResponse.json({ error: 'Veriler silinirken hata oluştu: posts' }, { status: 500 });
        }
      }
    }

    // 5. Doğrudan user_id kolonu olan tablolar
    const directTables = ['search_runs', 'activity_logs', 'user_settings', 'saved_searches'];
    for (const table of directTables) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
      if (error) {
        console.error(`Hesap silme hatası (${table}):`, error);
        return NextResponse.json({ error: `Veriler silinirken hata oluştu: ${table}` }, { status: 500 });
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
