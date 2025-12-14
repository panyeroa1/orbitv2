import { ai } from './gemini';

export const MODEL_FLASH = 'gemini-2.0-flash-exp';
export const MODEL_PRO = 'gemini-1.5-pro';

export interface TranslationQuality {
  mode: 'speed' | 'balanced' | 'accuracy';
  model: string;
  maxRetries: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

export interface TranslationCacheEntry {
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  contextHash?: string;
  timestamp: number;
  ttl: number;
}

export interface TranslationContext {
  history: Array<{ original: string; translated: string }>;
  glossary?: Record<string, string>;
  domain?: string;
}

const QUALITY_PRESETS: Record<string, TranslationQuality> = {
  speed: { mode: 'speed', model: MODEL_FLASH, maxRetries: 1 },
  balanced: { mode: 'balanced', model: MODEL_FLASH, maxRetries: 2 },
  accuracy: { mode: 'accuracy', model: MODEL_PRO, maxRetries: 3 }
};

class TranslationService {
  private cache: Map<string, TranslationCacheEntry> = new Map();
  private readonly CACHE_SIZE = 100;
  private readonly DEFAULT_TTL = 3600000; // 1 hour

  private getCacheKey(text: string, sourceLang: string, targetLang: string, contextHash?: string): string {
    return `${sourceLang}:${targetLang}:${contextHash || ''}:${text.slice(0, 100)}`;
  }

  private getContextHash(context?: TranslationContext): string {
    if (!context?.history || context.history.length === 0) return '';
    const lastFew = context.history.slice(-3);
    return JSON.stringify(lastFew);
  }

  private async getCachedTranslation(
    text: string,
    sourceLang: string,
    targetLang: string,
    contextHash?: string
  ): Promise<string | null> {
    const key = this.getCacheKey(text, sourceLang, targetLang, contextHash);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.translatedText;
    }
    
    // Remove expired entry
    if (cached) this.cache.delete(key);
    return null;
  }

  private cacheTranslation(
    text: string,
    sourceLang: string,
    targetLang: string,
    translatedText: string,
    contextHash?: string
  ): void {
    // LRU eviction
    if (this.cache.size >= this.CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const key = this.getCacheKey(text, sourceLang, targetLang, contextHash);
    this.cache.set(key, {
      sourceText: text,
      sourceLang,
      targetLang,
      translatedText,
      contextHash,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    });
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    try {
      const prompt = `Detect the language of this text and respond with ONLY the ISO 639-1 language code (e.g., "en", "es", "fr"). Text: "${text}"`;
      const response = await ai.models.generateContent({
        model: MODEL_FLASH,
        contents: prompt
      });
      
      const language = response.text?.trim().toLowerCase() || 'en';
      return { language, confidence: 0.9 }; // Gemini doesn't provide confidence, use fixed value
    } catch (error) {
      console.error('Language detection failed:', error);
      return { language: 'en', confidence: 0.5 };
    }
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    options: {
      quality?: 'speed' | 'balanced' | 'accuracy';
      context?: TranslationContext;
      onProgress?: (status: string) => void;
    } = {}
  ): Promise<{ translation: string; qualityScore: number }> {
    const quality = QUALITY_PRESETS[options.quality || 'balanced'];
    const contextHash = this.getContextHash(options.context);

    // Check cache first
    const cached = await this.getCachedTranslation(text, sourceLang, targetLang, contextHash);
    if (cached) {
      options.onProgress?.('Using cached translation');
      return { translation: cached, qualityScore: 1.0 };
    }

    options.onProgress?.('Translating...');

    // Build context-aware prompt
    let prompt = '';
    if (options.context?.history && options.context.history.length > 0) {
      const contextStr = options.context.history
        .slice(-3)
        .map(h => `Original: "${h.original}" → Translation: "${h.translated}"`)
        .join('\n');
      prompt = `Previous conversation context:\n${contextStr}\n\n`;
    }

    if (options.context?.glossary && Object.keys(options.context.glossary).length > 0) {
      const glossaryStr = Object.entries(options.context.glossary)
        .map(([k, v]) => `"${k}" → "${v}"`)
        .join(', ');
      prompt += `Custom terms: ${glossaryStr}\n\n`;
    }

    prompt += `Translate the following text from ${sourceLang} to ${targetLang}. `;
    prompt += `Maintain the tone, style, and emotion of the original speaker. `;
    prompt += `Output ONLY the translation without any explanations.\n\nText: "${text}"`;

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < quality.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          options.onProgress?.(`Retry ${attempt}/${quality.maxRetries}`);
        }

        const response = await ai.models.generateContent({
          model: quality.model,
          contents: prompt
        });

        const translation = response.text?.trim();
        if (!translation) throw new Error('Empty translation response');

        // Cache the result
        this.cacheTranslation(text, sourceLang, targetLang, translation, contextHash);

        const qualityScore = this.calculateQualityScore(text, translation);
        return { translation, qualityScore };

      } catch (error) {
        lastError = error as Error;
        console.error(`Translation attempt ${attempt + 1} failed:`, error);
      }
    }

    throw lastError || new Error('Translation failed after all retries');
  }

  private calculateQualityScore(original: string, translated: string): number {
    // Simple heuristic: penalize if lengths are drastically different
    const lengthRatio = translated.length / original.length;
    if (lengthRatio < 0.3 || lengthRatio > 3) return 0.6;
    if (lengthRatio < 0.5 || lengthRatio > 2) return 0.8;
    return 0.95;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_SIZE,
      hitRate: 0 // TODO: Track hits/misses
    };
  }
}

export const translationService = new TranslationService();
