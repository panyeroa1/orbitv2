import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { CaptionSegment, CaptionTranslation } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing. Realtime features will not work. Check your .env.local file.");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Save a final transcript/caption segment to the database
 */
export async function saveTranscript(
  meetingId: string,
  speakerId: string,
  speakerName: string,
  text: string,
  sourceLang: string = 'en'
): Promise<CaptionSegment | null> {
  const { data, error } = await supabase
    .from('caption_segments')
    .insert({
      meeting_id: meetingId,
      speaker_peer_id: speakerId,
      speaker_name: speakerName,
      source_lang: sourceLang,
      text_final: text,
      stt_meta: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving transcript:', error);
    return null;
  }

  return data as CaptionSegment;
}

/**
 * Subscribe to new transcript segments for a session
 */
export function subscribeToSessionTranscripts(
  sessionId: string,
  onNewTranscript: (segment: CaptionSegment) => void
): RealtimeChannel {
  return supabase
    .channel(`transcripts:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'caption_segments',
        filter: `meeting_id=eq.${sessionId}`
      },
      (payload) => {
        onNewTranscript(payload.new as CaptionSegment);
      }
    )
    .subscribe();
}

/**
 * Subscribe to new translations for a session and target language
 */
export function subscribeToTranslations(
  sessionId: string,
  targetLang: string,
  onNewTranslation: (translation: CaptionTranslation) => void
): RealtimeChannel {
  return supabase
    .channel(`translations:${sessionId}:${targetLang}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'caption_translations',
        filter: `meeting_id=eq.${sessionId}`
      },
      (payload) => {
        const translation = payload.new as CaptionTranslation;
        if (translation.target_lang === targetLang) {
          onNewTranslation(translation);
        }
      }
    )
    .subscribe();
}
