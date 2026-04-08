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

export interface VisionImageInput {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
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

  /**
   * Görsel analiz — sistem prompt + metin + görsel(ler) ile AI çağrısı.
   * Tüm provider'lar vision desteği sunar.
   */
  chatWithVision(params: {
    model: string;
    maxTokens: number;
    temperature: number;
    systemPrompt: string;
    userMessage: string;
    images: VisionImageInput[];
  }): Promise<AIClientResult>;
}

// ============================================
// Provider implementasyonları
// ============================================

/** Anthropic Claude (direkt) */
function createAnthropicClient(apiKey: string, userModel: string | null): AIClient {
  const client = new Anthropic({ apiKey });

  return {
    provider: 'anthropic',
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
    async chatWithVision({ model, maxTokens, temperature, systemPrompt, userMessage, images }) {
      const imageBlocks = images.map((img) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: img.mimeType,
          data: img.base64,
        },
      }));
      const response = await client.messages.create({
        model, // vision'da parametre model kullan
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text' as const, text: userMessage },
          ],
        }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('Claude yanıtında text block bulunamadı');
      }
      return { text: textBlock.text };
    },
  };
}

/** OpenRouter — OpenAI-uyumlu API kullanır */
function createOpenRouterClient(apiKey: string, userModel: string | null): AIClient {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'LinkedIn Prospector AI',
    },
  });

  return {
    provider: 'openrouter',
    model: userModel,
    async chat({ model, maxTokens, temperature, systemPrompt, userMessage }) {
      const modelToUse = userModel || model;
      const response = await client.chat.completions.create({
        model: modelToUse,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });

      // OpenRouter free modellerde choices bos veya content null olabilir
      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error(`OpenRouter yanitinda choices bos — model=${modelToUse}, choices_length=${response.choices?.length ?? 0}`);
      }

      const text = choice.message?.content;
      if (!text) {
        throw new Error(`OpenRouter yanitinda content bos — model=${modelToUse}, finish_reason=${choice.finish_reason}, choices_length=${response.choices?.length}`);
      }
      return { text };
    },
    async chatWithVision({ model, maxTokens, temperature, systemPrompt, userMessage, images }) {
      // Vision'da her zaman parametre model'i kullan — userModel vision desteklemeyebilir
      const imageContent = images.map((img) => ({
        type: 'image_url' as const,
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      }));
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              ...imageContent,
              { type: 'text' as const, text: userMessage },
            ],
          },
        ],
      });

      const choice = response.choices?.[0];
      if (!choice) {
        throw new Error(`OpenRouter yanitinda choices bos — model=${model}`);
      }

      const text = choice.message?.content;
      if (!text) {
        throw new Error(`OpenRouter yanitinda content bos — model=${model}, finish_reason=${choice.finish_reason}`);
      }
      return { text };
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
    async chatWithVision({ model, maxTokens, temperature, systemPrompt, userMessage, images }) {
      const imageContent = images.map((img) => ({
        type: 'image_url' as const,
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      }));
      const response = await client.chat.completions.create({
        model, // vision'da parametre model kullan
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              ...imageContent,
              { type: 'text' as const, text: userMessage },
            ],
          },
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
    async chat({ model, maxTokens, temperature, systemPrompt, userMessage }) {
      const geminiModel = genAI.getGenerativeModel({
        model: userModel || model,
        systemInstruction: systemPrompt,
      });
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      });
      const text = result.response.text();
      if (!text) {
        throw new Error('Gemini yanıtında içerik bulunamadı');
      }
      return { text };
    },
    async chatWithVision({ model: visionModel, maxTokens, temperature, systemPrompt, userMessage, images }) {
      const geminiModel = genAI.getGenerativeModel({
        model: visionModel, // vision'da parametre model kullan
        systemInstruction: systemPrompt,
      });
      const imageParts = images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      }));
      const result = await geminiModel.generateContent({
        contents: [{
          role: 'user',
          parts: [
            ...imageParts,
            { text: userMessage },
          ],
        }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
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
            return createOpenRouterClient(key, userModel);
          case 'anthropic':
          default:
            return createAnthropicClient(key, userModel);
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

  return createAnthropicClient(fallbackKey, null);
}
