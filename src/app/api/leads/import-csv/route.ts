import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface ImportCsvRow {
  email?: string;
  linkedinUrl?: string;
  name?: string;
  company?: string;
  [key: string]: string | undefined;
}

interface ImportRequestBody {
  rows: ImportCsvRow[];
  matchBy: 'linkedin_url' | 'name_company' | 'name';
}

interface RowDetail {
  row: number;
  name: string | null;
  status: 'matched' | 'unmatched' | 'error' | 'skipped';
  leadId?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Auth kontrolu
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Kimlik dogrulama gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json() as ImportRequestBody;
    const { rows, matchBy } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Gecerli CSV satirlari gerekli' },
        { status: 400 }
      );
    }

    if (!matchBy || !['linkedin_url', 'name_company', 'name'].includes(matchBy)) {
      return NextResponse.json(
        { error: 'Gecerli bir eslestirme yontemi gerekli: linkedin_url, name_company, name' },
        { status: 400 }
      );
    }

    // Limit: maks 1000 satir
    if (rows.length > 1000) {
      return NextResponse.json(
        { error: 'Tek seferde en fazla 1000 satir import edilebilir' },
        { status: 400 }
      );
    }

    let matched = 0;
    let unmatched = 0;
    let alreadyHadEmail = 0;
    let updated = 0;
    const errors: string[] = [];
    const details: RowDetail[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const rowName = row.name || row.email || null;

      // Email dogrulama
      if (!row.email || !EMAIL_REGEX.test(row.email)) {
        errors.push(`Satir ${rowNum}: Gecersiz email formati`);
        details.push({ row: rowNum, name: rowName, status: 'error', message: 'Gecersiz email' });
        continue;
      }

      try {
        const lead = await findLead(supabase, user.id, row, matchBy);

        if (!lead) {
          unmatched++;
          details.push({ row: rowNum, name: rowName, status: 'unmatched' });
          continue;
        }

        matched++;

        // Zaten email'i varsa
        if (lead.email && lead.email.trim() !== '') {
          alreadyHadEmail++;
          details.push({
            row: rowNum,
            name: rowName,
            status: 'skipped',
            leadId: lead.id,
            message: `Mevcut email: ${lead.email}`,
          });
          continue;
        }

        // Email guncelle
        const { error: updateError } = await supabase
          .from('leads')
          .update({ email: row.email })
          .eq('id', lead.id)
          .eq('user_id', user.id);

        if (updateError) {
          errors.push(`Satir ${rowNum}: Guncelleme hatasi - ${updateError.message}`);
          details.push({ row: rowNum, name: rowName, status: 'error', leadId: lead.id, message: updateError.message });
          continue;
        }

        updated++;
        details.push({ row: rowNum, name: rowName, status: 'matched', leadId: lead.id });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        errors.push(`Satir ${rowNum}: ${msg}`);
        details.push({ row: rowNum, name: rowName, status: 'error', message: msg });
      }
    }

    return NextResponse.json({
      matched,
      unmatched,
      alreadyHadEmail,
      updated,
      errors,
      details,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findLead(supabase: any, userId: string, row: ImportCsvRow, matchBy: string) {
  switch (matchBy) {
    case 'linkedin_url': {
      if (!row.linkedinUrl) return null;

      const { data } = await supabase
        .from('leads')
        .select('id, email')
        .eq('user_id', userId)
        .eq('linkedin_url', row.linkedinUrl)
        .limit(1)
        .single();

      return data;
    }

    case 'name_company': {
      if (!row.name || !row.company) return null;

      const { data } = await supabase
        .from('leads')
        .select('id, email')
        .eq('user_id', userId)
        .ilike('name', row.name)
        .ilike('company', row.company)
        .limit(1)
        .single();

      return data;
    }

    case 'name': {
      if (!row.name) return null;

      const { data } = await supabase
        .from('leads')
        .select('id, email')
        .eq('user_id', userId)
        .ilike('name', row.name)
        .limit(1)
        .single();

      return data;
    }

    default:
      return null;
  }
}
