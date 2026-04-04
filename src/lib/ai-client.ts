import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from './supabase-admin';
import { decryptApiKey } from './crypto';
import type { AIProvider } from '@/types/models';

// ============================================
// Ortak AI Client arayüzü
// ============================================

export interface AIClientResult {
  text: string;
}

export interface AIClient {
  provider: AIProvider;
  model: string | null;
  /**
   * Sistem prompt + kullanıcı mesajı ile AI çağrısı yapar.
   * Tüm provider'lar için aynı arayüz.
   */
  chat(params: {
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt: string;
    userMessage: string;
  }): Promise<AIClientResult>;
}

// ============================================
// Provider implementasyonları
// ============================================

/** Anthropic Claude (direkt veya OpenRouter üzerinden) */
function createAnthropicClient(apiKey: string, provider: AIProvider, userModel: string | null): AIClient {
  const client = new Anthropic({
    apiKey,
    ...(provider === 'openrouter' ? { baseURL: 'https://openrouter.ai/api/v1' } : {}),
  });

  return {
    provider,
    model: userModel,
    async chat({ model, maxTokens, temperature, systemPrompt, userMessage }) {
      const response = await client.messages.create({
        model: userModel || model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Claude yanıtında text block bulunamadı');
      }
      return { text: textBlock.text };
    },
  };
}

/** OpenAI GPT */
function createOpenAIClient(apiKey: string, userModel: string | null): AIClient {
  const client = new OpenAI({ apiKey });

  return {
    provider: 'openai',
    model: userModel,
    async chat({ model, maxTokens, temperature, systemPrompt, userMessage }) {
      const response = await client.chat.completions.create({
        model: userModel || model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error('OpenAI yanıtında içerik bulunamadı');
      }
      return { text };
    },
  };
}

/** Google Gemini */
function createGoogleClient(apiKey: string, userModel: string | null): AIClient {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    provider: 'google',
    model: userModel,
    async chat({ model, temperature, systemPrompt, userMessage }) {
      const geminiModel = genAI.getGenerativeModel({
        model: userModel || model,
        systemInstruction: systemPrompt,
      });
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature },
      });
      const text = result.response.text();
      if (!text) {
        throw new Error('Gemini yanıtında içerik bulunamadı');
      }
      return { text };
    },
  };
}

// ============================================
// Provider varsayılan modelleri
// ============================================

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
  openrouter: 'anthropic/claude-sonnet-4-20250514',
};

// ============================================
// Kullanıcı AI client resolver
// ============================================

/**
 * Kullanıcının AI client'ını döner.
 * Önce user_settings tablosundan kullanıcının key + provider tercihini arar,
 * bulamazsa env var fallback kullanır.
 */
export async function getUserAIClient(userId: string): Promise<AIClient> {
  try {
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('anthropic_api_key_encrypted, openai_api_key_encrypted, google_api_key_encrypted, openrouter_api_key_encrypted, ai_provider, ai_model')
      .eq('user_id', userId)
      .single();

    if (settings) {
      const provider = (settings.ai_provider as AIProvider) || 'anthropic';
      const userModel = settings.ai_model || null;

      const keyMap: Record<AIProvider, string | null> = {
        anthropic: settings.anthropic_api_key_encrypted,
        openai: settings.openai_api_key_encrypted,
        google: settings.google_api_key_encrypted,
        openrouter: settings.openrouter_api_key_encrypted,
      };

      const encryptedKey = keyMap[provider];
      if (encryptedKey) {
        const key = decryptApiKey(encryptedKey);

        switch (provider) {
          case 'openai':
            return createOpenAIClient(key, userModel);
          case 'google':
            return createGoogleClient(key, userModel);
          case 'openrouter':
            return createAnthropicClient(key, 'openrouter', userModel);
          case 'anthropic':
          default:
            return createAnthropicClient(key, 'anthropic', userModel);
        }
      }
    }
  } catch {
    // Settings tablosu yoksa veya hata olursa fallback'e düş
  }

  // Fallback: env var
  const fallbackKey = process.env.ANTHROPIC_API_KEY;
  if (!fallbackKey) {
    throw new Error('AI API anahtarı bulunamadı. Lütfen Yapılandırma sayfasından API anahtarınızı girin.');
  }

  return createAnthropicClient(fallbackKey, 'anthropic', null);
}
