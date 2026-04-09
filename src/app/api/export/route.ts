import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { logActivity } from '@/services/activityLogService';
import type { PipelineStage } from '@/types/enums';
import { PIPELINE_STAGES } from '@/types/enums';
import { withRateLimit } from '@/lib/with-rate-limit';

// ------------------------------------------------------------------ //
// CSV Yardimci fonksiyonlari
// ------------------------------------------------------------------ //

/** Virgul veya tirnak iceren alanlari CSV-safe hale getirir */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Tarihi dd.MM.yyyy formatina cevirir */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/** Lead satirini CSV satirina donusturur */
function leadToCsvRow(lead: LeadRow): string {
  const fields = [
    lead.name ?? '',
    lead.title ?? '',
    lead.company ?? '',
    lead.linkedin_url ?? '',
    String(lead.score ?? 0),
    lead.stage ?? '',
    String(lead.post_count ?? 0),
    formatDate(lead.created_at),
  ];
  return fields.map(escapeCsvField).join(',');
}

// ------------------------------------------------------------------ //
// Tipler
// ------------------------------------------------------------------ //

interface ExportRequestBody {
  format: 'csv' | 'json';
  stage?: PipelineStage;
  minScore?: number;
}

/** Supabase'den donen lead satiri (snake_case) */
interface LeadRow {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  linkedin_url: string;
  stage: string;
  score: number;
  post_count: number;
  created_at: string;
}

// ------------------------------------------------------------------ //
// POST /api/export
// ------------------------------------------------------------------ //

const EXPORT_RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

async function handler(request: NextRequest) {
  try {
    // 1. Auth kontrolu
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Oturum bulunamadi. Lutfen giris yapin.' },
        { status: 401 }
      );
    }

    // 2. Request body parse & validasyon
    let body: ExportRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Gecersiz istek govdesi.' },
        { status: 400 }
      );
    }

    const { format, stage, minScore } = body;

    if (!format || !['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'Format alani zorunludur ve "csv" veya "json" olmalidir.' },
        { status: 400 }
      );
    }

    if (stage && !PIPELINE_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Gecersiz asama. Gecerli degerler: ${PIPELINE_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    if (minScore !== undefined && (typeof minScore !== 'number' || minScore < 0 || minScore > 100)) {
      return NextResponse.json(
        { error: 'minScore 0 ile 100 arasinda bir sayi olmalidir.' },
        { status: 400 }
      );
    }

    // 3. Veritabani sorgusu — filtreli
    let query = supabase
      .from('leads')
      .select('id, name, title, company, linkedin_url, stage, score, post_count, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('score', { ascending: false });

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (minScore !== undefined) {
      query = query.gte('score', minScore);
    }

    const { data: leads, error: dbError } = await query;

    if (dbError) {
      console.error('[Export] Veritabani hatasi:', dbError.message);
      return NextResponse.json(
        { error: 'Lead verileri alinirken bir hata olustu.' },
        { status: 500 }
      );
    }

    const rows = (leads ?? []) as LeadRow[];

    // 4. Formata gore yanit olustur
    if (format === 'csv') {
      const BOM = '\uFEFF';
      const header = 'Ad,Unvan,Sirket,LinkedIn URL,Skor,Asama,Gonderi Sayisi,Olusturma Tarihi';
      const csvLines = [header, ...rows.map(leadToCsvRow)];
      const csvContent = BOM + csvLines.join('\r\n');

      // Fire-and-forget activity log
      logActivity({
        supabase,
        actionType: 'export_created',
        userId: user.id,
        entityType: 'export',
        details: { format: 'csv', count: rows.length, stage: stage ?? null, minScore: minScore ?? null },
      });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="leads-export-${Date.now()}.csv"`,
        },
      });
    }

    // JSON format
    const jsonLeads = rows.map((lead) => ({
      id: lead.id,
      ad: lead.name,
      unvan: lead.title,
      sirket: lead.company,
      linkedinUrl: lead.linkedin_url,
      skor: lead.score,
      asama: lead.stage,
      gonderiSayisi: lead.post_count,
      olusturmaTarihi: formatDate(lead.created_at),
    }));

    // Fire-and-forget activity log
    logActivity({
      supabase,
      actionType: 'export_created',
      userId: user.id,
      entityType: 'export',
      details: { format: 'json', count: rows.length, stage: stage ?? null, minScore: minScore ?? null },
    });

    const jsonBody = JSON.stringify({ leads: jsonLeads }, null, 2);

    return new NextResponse(jsonBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-export-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    console.error('[Export] Beklenmeyen hata:', err);
    return NextResponse.json(
      { error: 'Dis aktarma sirasinda beklenmeyen bir hata olustu.' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handler, EXPORT_RATE_LIMIT);
