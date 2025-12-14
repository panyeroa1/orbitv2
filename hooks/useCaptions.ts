import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CaptionSegment, CaptionTranslation, InterimCaption, CaptionSettings } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseCaptionsProps {
  meetingId: string;
  userId: string;
  peerId: string;
  targetLanguage: string;
}

export function useCaptions({ meetingId, userId, peerId, targetLanguage }: UseCaptionsProps) {
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [interimCaptions, setInterimCaptions] = useState<Map<string, InterimCaption>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Subscribe to caption segments
  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`captions:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'caption_segments',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          const newSegment = payload.new as CaptionSegment;
          setSegments(prev => [...prev, newSegment].slice(-50)); // Keep last 50
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'caption_translations',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          const translation = payload.new as CaptionTranslation;
          if (translation.target_lang === targetLanguage) {
            setTranslations(prev => new Map(prev).set(translation.segment_id, translation.translated_text));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Fetch existing segments
    const fetchSegments = async () => {
      const { data } = await supabase
        .from('caption_segments')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setSegments(data.reverse());
      }
    };

    // Fetch existing translations for target language
    const fetchTranslations = async () => {
      const { data } = await supabase
        .from('caption_translations')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('target_lang', targetLanguage)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        const translationMap = new Map<string, string>();
        data.forEach(t => translationMap.set(t.segment_id, t.translated_text));
        setTranslations(translationMap);
      }
    };

    fetchSegments();
    fetchTranslations();

    return () => {
      channel.unsubscribe();
    };
  }, [meetingId, targetLanguage]);

  // Update user's target language in DB
  useEffect(() => {
    if (!meetingId || !targetLanguage) return;

    const upsertLanguageTarget = async () => {
      await supabase
        .from('meeting_language_targets')
        .upsert({
          meeting_id: meetingId,
          user_id: userId || null,
          peer_id: userId ? null : peerId,
          target_lang: targetLanguage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: userId ? 'meeting_id,user_id' : 'meeting_id,peer_id'
        });
    };

    upsertLanguageTarget();
  }, [meetingId, userId, peerId, targetLanguage]);

  // Add interim caption (client-side only)
  const addInterimCaption = (speakerPeerId: string, speakerName: string, text: string) => {
    setInterimCaptions(prev => {
      const newMap = new Map(prev);
      newMap.set(speakerPeerId, { speaker_peer_id: speakerPeerId, speaker_name: speakerName, text });
      return newMap;
    });
  };

  // Clear interim caption for a speaker
  const clearInterimCaption = (speakerPeerId: string) => {
    setInterimCaptions(prev => {
      const newMap = new Map(prev);
      newMap.delete(speakerPeerId);
      return newMap;
    });
  };

  // Save final caption to DB
  const saveFinalCaption = async (
    speakerPeerId: string,
    speakerName: string,
    text: string,
    sourceLang: string = 'en'
  ) => {
    clearInterimCaption(speakerPeerId);

    const { error } = await supabase
      .from('caption_segments')
      .insert({
        meeting_id: meetingId,
        speaker_peer_id: speakerPeerId,
        speaker_name: speakerName,
        source_lang: sourceLang,
        text_final: text,
        stt_meta: {}
      });

    if (error) {
      console.error('Error saving caption:', error);
    }
  };

  return {
    segments,
    translations,
    interimCaptions,
    addInterimCaption,
    clearInterimCaption,
    saveFinalCaption
  };
}
