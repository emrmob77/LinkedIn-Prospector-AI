import Papa from 'papaparse';

export interface CsvRow {
  email?: string;
  linkedinUrl?: string;
  name?: string;
  company?: string;
  [key: string]: string | undefined;
}

export interface ParseResult {
  rows: CsvRow[];
  headers: string[];
  errors: string[];
}

/**
 * Kolon isimlerini normalize eder.
 * Ornegin "LinkedIn URL", "linkedin_url", "profile_url" -> "linkedinUrl"
 */
function normalizeHeader(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');

  // linkedinUrl variants
  if (['linkedin_url', 'linkedinurl', 'linkedin', 'profile_url'].includes(key)) {
    return 'linkedinUrl';
  }

  // email variants
  if (['email', 'e_mail', 'e-mail', 'mail'].includes(key)) {
    return 'email';
  }

  // name variants
  if (['name', 'ad', 'isim', 'full_name', 'fullname'].includes(key)) {
    return 'name';
  }

  // company variants
  if (['company', 'sirket', 'şirket', 'firma', 'organization'].includes(key)) {
    return 'company';
  }

  return key;
}

/**
 * CSV string'i parse eder, kolon isimlerini normalize eder.
 */
export function parseCsv(csvText: string): ParseResult {
  const errors: string[] = [];

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => normalizeHeader(header),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      const rowInfo = err.row !== undefined ? `Satir ${err.row + 1}: ` : '';
      errors.push(`${rowInfo}${err.message}`);
    }
  }

  const headers = result.meta.fields || [];

  const rows: CsvRow[] = result.data.map((record) => {
    const row: CsvRow = {};
    for (const [key, value] of Object.entries(record)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        row[key] = String(value).trim();
      }
    }
    return row;
  });

  return { rows, headers, errors };
}
