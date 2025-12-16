import React, { useEffect, useState, useRef } from 'react';
import { CaptionSegment, InterimCaption, CaptionSettings } from '../types';
import FeedbackButtons from './FeedbackButtons';
import { logTranslationFeedback } from '../lib/supabaseClient';

interface CaptionsOverlayProps {
  segments: CaptionSegment[];
  interimCaptions: Map<string, InterimCaption>;
  settings: CaptionSettings;
  currentUserId: string;
  translations?: Map<string, string>; // segment_id -> translated_text
}

interface DisplayCaption {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  isInterim: boolean;
  timestamp: number;
  color: string;
}

const SPEAKER_COLORS = [
  '#00f3ff', // neon cyan
  '#9333ea', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
];

const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({
  segments,
  interimCaptions,
  settings,
  currentUserId,
  translations
}) => {
  const [displayCaptions, setDisplayCaptions] = useState<DisplayCaption[]>([]);
  const [speakerColors, setSpeakerColors] = useState<Map<string, string>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Assign consistent colors to speakers
  useEffect(() => {
    const newColors = new Map(speakerColors);
    let colorIndex = speakerColors.size;

    segments.forEach(seg => {
      if (!newColors.has(seg.speaker_peer_id)) {
        newColors.set(seg.speaker_peer_id, SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length]);
        colorIndex++;
      }
    });

    interimCaptions.forEach((caption, peerId) => {
      if (!newColors.has(peerId)) {
        newColors.set(peerId, SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length]);
        colorIndex++;
      }
    });

    if (newColors.size !== speakerColors.size) {
      setSpeakerColors(newColors);
    }
  }, [segments, interimCaptions]);

  // Build display captions from segments + interim
  useEffect(() => {
    const captions: DisplayCaption[] = [];
    const now = Date.now();
    const FADE_OUT_MS = 8000;

    // Add final segments (only recent ones)
    segments
      .filter(seg => now - new Date(seg.created_at).getTime() < FADE_OUT_MS)
      .forEach(seg => {
        let text = seg.text_final;

        // Use translation if auto-translate is enabled
        if (settings.autoTranslate && translations?.has(seg.id)) {
          text = translations.get(seg.id)!;
        }

        // Optionally show both original + translation
        if (settings.showOriginalAndTranslation && settings.autoTranslate && translations?.has(seg.id)) {
          text = `${seg.text_final} → ${translations.get(seg.id)}`;
        }

        captions.push({
          id: seg.id,
          speakerId: seg.speaker_peer_id,
          speakerName: seg.speaker_peer_id === currentUserId ? 'You' : seg.speaker_name,
          text,
          isInterim: false,
          timestamp: new Date(seg.created_at).getTime(),
          color: speakerColors.get(seg.speaker_peer_id) || SPEAKER_COLORS[0]
        });
      });

    // Add interim captions
    interimCaptions.forEach((caption, peerId) => {
      captions.push({
        id: `interim-${peerId}`,
        speakerId: peerId,
        speakerName: peerId === currentUserId ? 'You' : caption.speaker_name,
        text: caption.text,
        isInterim: true,
        timestamp: now,
        color: speakerColors.get(peerId) || SPEAKER_COLORS[0]
      });
    });

    // Sort by timestamp
    captions.sort((a, b) => a.timestamp - b.timestamp);

    // Keep only last 3 lines
    setDisplayCaptions(captions.slice(-3));
  }, [segments, interimCaptions, settings, translations, speakerColors, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayCaptions]);

  if (!settings.enabled || displayCaptions.length === 0) return null;

  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-4xl px-4 w-full pointer-events-none">
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${settings.backgroundOpacity})`,
          backdropFilter: 'blur(12px)'
        }}
      >
        <div className="p-4 space-y-2 max-h-32 overflow-y-auto">
          {displayCaptions.map((caption, index) => (
            <div
              key={caption.id}
              className={`transition-all duration-300 group ${
                caption.isInterim ? 'opacity-70' : 'opacity-100'
              } ${getFontSize()} animate-in fade-in slide-in-from-bottom-2 duration-200`}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <span
                className="font-bold mr-2"
                style={{ color: caption.color }}
              >
                {caption.speakerName}:
              </span>
              <span className={caption.isInterim ? 'text-white/70 italic' : 'text-white'}>
                {caption.text}
              </span>
              
              {!caption.isInterim && !caption.id.startsWith('interim-') && (
                <FeedbackButtons 
                   className="inline-flex ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                   segmentId={caption.id}
                   onFeedback={(score) => logTranslationFeedback(caption.id, score)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CaptionsOverlay;
