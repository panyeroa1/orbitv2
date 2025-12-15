import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { geminiLiveService, TranslationPromptOptions } from '../lib/geminiLiveService';
import { CaptionSegment } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseTranslationListenerProps {
  /** Current meeting/session ID */
  sessionId: string;
  /** Current user's speaker ID (to filter out own speech) */
  speakerId: string;
  /** Target language code (e.g., 'es', 'fr', 'de') */
  targetLanguage: string;
  /** Target locale (e.g., 'es-MX', 'fr-FR') */
  targetLocale: string;
  /** Gemini voice to use for TTS */
  voice?: string;
  /** Translation quality mode */
  quality?: 'speed' | 'balanced' | 'accuracy';
  /** Enable/disable translation */
  enabled?: boolean;
  /** Callback when translation starts */
  onTranslationStart?: (segment: CaptionSegment) => void;
  /** Callback when translation completes */
  onTranslationComplete?: (segment: CaptionSegment, translatedText: string) => void;
  /** Callback for translation errors */
  onError?: (error: Error) => void;
}

export interface UseTranslationListenerReturn {
  isTranslating: boolean;
  translationStatus: string;
  error: string | null;
  lastTranslation: string | null;
}

/**
 * Hook for real-time translation listening
 * 
 * This hook subscribes to Supabase Realtime for new caption segments
 * and triggers AI-powered translation with speech synthesis.
 * 
 * CRITICAL ANTI-FEEDBACK MECHANISM:
 * - Filters out own speaker_id to prevent self-translation
 * - Sends TEXT-ONLY prompts to Gemini (no audio input)
 * - Uses Gemini Live API for natural speech output
 */
export function useTranslationListener({
  sessionId,
  speakerId,
  targetLanguage,
  targetLocale,
  voice = 'Aoede',
  quality = 'balanced',
  enabled = true,
  onTranslationStart,
  onTranslationComplete,
  onError
}: UseTranslationListenerProps): UseTranslationListenerReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState('Idle');
  const [error, setError] = useState<string | null>(null);
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const processingRef = useRef<Set<string>>(new Set()); // Track processed segments

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    // Subscribe to caption_segments for this session
    const channel = supabase
      .channel(`translation:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'caption_segments',
          filter: `meeting_id=eq.${sessionId}`
        },
        async (payload) => {
          const newSegment = payload.new as CaptionSegment;

          // CRITICAL FILTER: Skip own speech to prevent self-translation
          if (newSegment.speaker_peer_id === speakerId) {
            console.log('[TranslationListener] Skipping own speech');
            return;
          }

          // Check if already processing this segment
          if (processingRef.current.has(newSegment.id)) {
            console.log('[TranslationListener] Already processing segment:', newSegment.id);
            return;
          }

          // Skip if target language matches source language
          if (newSegment.source_lang === targetLanguage) {
            console.log('[TranslationListener] Source and target languages match, skipping');
            return;
          }

          console.log('[TranslationListener] New segment detected:', {
            id: newSegment.id,
            speaker: newSegment.speaker_name,
            text: newSegment.text_final,
            sourceLang: newSegment.source_lang
          });

          // Mark as processing
          processingRef.current.add(newSegment.id);

          try {
            await handleNewSegment(newSegment);
          } finally {
            // Allow reprocessing after 5 seconds (in case of failures)
            setTimeout(() => {
              processingRef.current.delete(newSegment.id);
            }, 5000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, speakerId, targetLanguage, targetLocale, enabled, voice, quality]);

  /**
   * Handle a new caption segment
   */
  const handleNewSegment = async (segment: CaptionSegment) => {
    try {
      setIsTranslating(true);
      setError(null);
      setTranslationStatus('Processing...');

      onTranslationStart?.(segment);

      // Build translation prompt
      const promptOptions: TranslationPromptOptions = {
        sourceLang: segment.source_lang || 'auto',
        targetLang: targetLanguage,
        targetLocale: targetLocale,
        speakerStyle: 'neutral, clear', // TODO: Extract from segment metadata
        text: segment.text_final
      };

      const prompt = geminiLiveService.buildTranslationPrompt(promptOptions);

      console.log('[TranslationListener] Sending translation request:', {
        sourceLang: promptOptions.sourceLang,
        targetLang: promptOptions.targetLang,
        textLength: segment.text_final.length
      });

      // Translate and speak (TEXT-ONLY prompt, audio output)
      const translatedText = await geminiLiveService.translateAndSpeak(
        prompt,
        voice,
        (status) => setTranslationStatus(status)
      );

      console.log('[TranslationListener] Translation complete:', translatedText);

      setLastTranslation(translatedText);

      // Save translation to database for other participants
      const { error: dbError } = await supabase
        .from('caption_translations')
        .upsert(
          {
            meeting_id: segment.meeting_id,
            segment_id: segment.id,
            target_lang: targetLanguage,
            translated_text: translatedText,
            quality_score: quality === 'accuracy' ? 0.95 : quality === 'balanced' ? 0.85 : 0.75
          },
          { onConflict: 'segment_id,target_lang' }
        );

      if (dbError) {
        console.error('[TranslationListener] Database error:', dbError);
      }

      onTranslationComplete?.(segment, translatedText);
      setTranslationStatus('Complete');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      console.error('[TranslationListener] Error:', err);
      setError(errorMessage);
      setTranslationStatus('Error');
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    isTranslating,
    translationStatus,
    error,
    lastTranslation
  };
}
