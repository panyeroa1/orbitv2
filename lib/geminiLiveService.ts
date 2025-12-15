import { ai, MODEL_LIVE } from './gemini';

/**
 * Gemini Live API Service
 * Handles text-to-speech translation with Gemini Live API
 * 
 * CRITICAL: This service uses TEXT-ONLY prompts to prevent audio feedback loops.
 * Never send audio streams to Gemini in the translation flow.
 */

export interface TranslationPromptOptions {
  sourceLang: string;
  targetLang: string;
  targetLocale: string;
  speakerStyle?: string;
  text: string;
}

export class GeminiLiveService {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
    }
  }

  /**
   * Build a translation prompt according to Live Orbits spec
   */
  buildTranslationPrompt(options: TranslationPromptOptions): string {
    const { sourceLang, targetLang, targetLocale, speakerStyle = 'neutral, clear', text } = options;
    
    return `source_lang: ${sourceLang}
target_lang: ${targetLang}
target_locale: ${targetLocale}
speaker_style: "${speakerStyle}"
text: "${text}"`;
  }

  /**
   * Get system instruction for translation
   */
  getTranslationSystemInstruction(): string {
    return `You are a professional real-time interpreter for multilingual meetings.

CRITICAL RULES:
1. Output ONLY speakable translated text - no commentary, no markdown, no explanations
2. Preserve sentence alignment (1-to-1 mapping where possible)
3. Use native idioms appropriate for the target locale
4. Mimic speaker style (pace, emotion, formality) from metadata
5. Maintain accuracy for names, numbers, dates (unchanged)
6. Handle disfluencies naturally (translate "uh", "like", etc. appropriately)
7. Never imitate specific people - use a generic native speaker voice
8. Preserve the emotional tone and urgency of the original speech

When you receive input formatted as:
source_lang: [code]
target_lang: [code]
target_locale: [locale]
speaker_style: "[description]"
text: "[original text]"

Respond with ONLY the translated text in the target language, spoken naturally as if by a native speaker.`;
  }

  /**
   * Send text-only prompt to Gemini and get audio response
   * 
   * @param prompt - The formatted translation prompt
   * @param voice - Gemini voice to use (default: Aoede)
   * @param onProgress - Optional callback for progress updates
   * @returns Promise<string> - The text of the translation
   */
  async translateAndSpeak(
    prompt: string,
    voice: string = 'Aoede',
    onProgress?: (status: string) => void
  ): Promise<string> {
    try {
      onProgress?.('Connecting to Gemini...');

      // Use Gemini's Live API for real-time translation with audio output
      const model = ai.getGenerativeModel({
        model: MODEL_LIVE,
        systemInstruction: this.getTranslationSystemInstruction(),
        generationConfig: {
          responseModalities: ['AUDIO'], // Critical: Audio output for natural speech
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      });

      onProgress?.('Translating...');

      // Send TEXT-ONLY prompt (critical for anti-feedback)
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      });

      // Extract text and audio from response
      const response = result.response;
      const translatedText = response.text() || '';

      onProgress?.('Playing translation...');

      // Play audio if available
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            await this.playAudioData(part.inlineData.data);
          }
        }
      }

      onProgress?.('Complete');
      return translatedText;

    } catch (error) {
      console.error('Gemini Live translation error:', error);
      throw error;
    }
  }

  /**
   * Play base64-encoded audio data
   */
  private async playAudioData(base64Data: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Create and play source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      // Wait for playback to complete
      await new Promise<void>(resolve => {
        source.onended = () => resolve();
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Cleanup audio context
   */
  async cleanup(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
export const geminiLiveService = new GeminiLiveService();
