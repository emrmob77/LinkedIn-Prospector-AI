import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export function apiError(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ error: message, code } as ApiErrorResponse, { status });
}

export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`[${context}]`, error);

  if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
    return apiError('İstek limiti aşıldı. Lütfen biraz bekleyin.', 429, 'RATE_LIMIT');
  }

  if (error instanceof Error && error.message.includes('JWT')) {
    return apiError('Oturum süresi doldu. Lütfen tekrar giriş yapın.', 401, 'TOKEN_EXPIRED');
  }

  return apiError('Beklenmeyen bir hata oluştu.', 500, 'INTERNAL_ERROR');
}
