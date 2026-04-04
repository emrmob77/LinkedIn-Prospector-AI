import type { AIProvider } from '@/types/models';

export interface AIModelOption {
  id: string;
  label: string;
  tier: 'recommended' | 'premium' | 'fast';
  tierLabel: string;
}

export const PROVIDER_MODELS: Record<AIProvider, AIModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', tier: 'recommended', tierLabel: 'Önerilen' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', tier: 'premium', tierLabel: 'Premium' },
    { id: 'claude-haiku-3-5-20241022', label: 'Claude 3.5 Haiku', tier: 'fast', tierLabel: 'Hızlı / Ucuz' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', tier: 'recommended', tierLabel: 'Önerilen' },
    { id: 'gpt-4.1', label: 'GPT-4.1', tier: 'premium', tierLabel: 'Premium' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'fast', tierLabel: 'Hızlı / Ucuz' },
  ],
  google: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'recommended', tierLabel: 'Önerilen' },
    { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro', tier: 'premium', tierLabel: 'Premium' },
    { id: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash', tier: 'fast', tierLabel: 'Hızlı / Ucuz' },
  ],
  openrouter: [
    { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4', tier: 'recommended', tierLabel: 'Önerilen' },
    { id: 'openai/gpt-4o', label: 'GPT-4o', tier: 'recommended', tierLabel: 'Popüler' },
    { id: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'fast', tierLabel: 'Ucuz' },
    { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', tier: 'fast', tierLabel: 'Açık Kaynak' },
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', tier: 'fast', tierLabel: 'Çok Ucuz' },
    { id: 'qwen/qwen3.6-plus:free', label: 'Qwen 3.6 Plus', tier: 'fast', tierLabel: 'Ücretsiz' },
  ],
};
