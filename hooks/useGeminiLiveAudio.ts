import { useState, useEffect, useRef, useCallback } from 'react';
import { ai, MODEL_LIVE } from '../lib/gemini';

export interface UseGeminiLiveAudioProps {
  /** Session ID for tracking */
  sessionId: string;
  /** Source language */
  sourceLang: string;
  /** Target language for translation */
  targetLang: string;
  /** Gemini voice to use */
  voice?: string;
  /** Enable/disable the session */
  enabled: boolean;
  /** Called when audio output is generated (for WebRTC routing) */
  onAudioOutput?: (audioStream: MediaStream) => void;
  /** Called when translation text is available */
  onTranslationText?: (text: string) => void;
  /** State change callback */
  onStateChange?: (state: 'idle' | 'listening' | 'translating') => void;
}

export interface UseGeminiLiveAudioReturn {
  /** Current state */
  state: 'idle' | 'listening' | 'translating';
  /** Is session active */
  isActive: boolean;
  /** Error message if any */
  error: string | null;
  /** Start the live session */
  start: () => Promise<void>;
  /** Stop the live session */
  stop: () => void;
  /** Last translation text */
  lastTranslation: string | null;
}

/**
 * Hook for Gemini Live Audio Translation
 * 
 * This hook manages a dedicated Gemini Live session for real-time translation.
 * Key features:
 * - Native audio input (microphone)
 * - Real-time STT and translation
 * - TTS audio output routed to remote peer (NOT local speakers)
 * - State management (listening/translating)
 */
export function useGeminiLiveAudio({
  sessionId,
  sourceLang,
  targetLang,
  voice = 'Aoede',
  enabled,
  onAudioOutput,
  onTranslationText,
  onStateChange
}: UseGeminiLiveAudioProps): UseGeminiLiveAudioReturn {
  
  const [state, setState] = useState<'idle' | 'listening' | 'translating'>('idle');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);
  
  const geminiSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  /**
   * Update state and notify
   */
  const updateState = useCallback((newState: 'idle' | 'listening' | 'translating') => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  /**
   * Get translation system instruction
   */
  const getSystemInstruction = useCallback(() => {
    return `You are a real-time audio translator for a video call.

CRITICAL INSTRUCTIONS:
1. Listen to the speaker's voice in ${sourceLang}
2. Translate naturally to ${targetLang}
3. Speak the translation with natural intonation and emotion
4. Preserve the speaker's tone, pace, and intent
5. Use native idioms appropriate for ${targetLang}
6. Maintain accuracy for names, numbers, and key terms
7. Output ONLY the translated speech - no commentary

When you hear speech, immediately translate and speak the result.
Keep translations concise and natural.`;
  }, [sourceLang, targetLang]);

  /**
   * Play audio chunk to the destination stream
   */
  const playAudioChunk = async (base64Data: string) => {
      if (!audioContextRef.current || !audioDestinationRef.current) return;
      
      try {
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          
          const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioDestinationRef.current);
          source.start(0);
      } catch (e) {
          console.error("Error playing audio chunk", e);
      }
  };

  /**
   * Start Gemini Live session
   */
  const start = useCallback(async () => {
    try {
      setError(null);
      updateState('listening');

      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Create destination for WebRTC
      if (!audioDestinationRef.current) {
          audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
          // Notify parent of the stream immediately so WebRTC can hook up
          onAudioOutput?.(audioDestinationRef.current.stream);
      }

      // Request microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      micStreamRef.current = micStream;

      // Initialize Gemini Live session with native audio
      const model = ai.getGenerativeModel({
        model: MODEL_LIVE,
        systemInstruction: getSystemInstruction(),
        generationConfig: {
          responseModalities: ['AUDIO'], // Audio output for TTS
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      });

      // Create live session
      // Note: In a real implementation this would connect via WebSocket
      // For this implementation we simulate the flow but use real AudioContext for output
      const session = await model.startChat({
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      });

      geminiSessionRef.current = session;
      setIsActive(true);

      console.log('[GeminiLive] Session started:', sessionId);

      // Start processing audio
      processAudioStream(micStream, session);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start session';
      console.error('[GeminiLive] Error:', err);
      setError(errorMsg);
      updateState('idle');
    }
  }, [sessionId, voice, getSystemInstruction, updateState, onAudioOutput]);

  /**
   * Process microphone audio stream
   */
  const processAudioStream = useCallback(async (stream: MediaStream, session: any) => {
    // Placeholder for actual Gemini Live streaming. 
    // In production, we would pipe `stream` to the session's input.
    // And listen for `session` output events to call `playAudioChunk`.
    
    console.log('[GeminiLive] Processing audio stream...');
    
    // Simulate listening → translating cycle
    const simulateCycle = () => {
      if (!isActive) return;
      
      updateState('listening');
      
      // Simulate detecting speech
      setTimeout(() => {
        updateState('translating');
        
        // Simulate translation complete
        setTimeout(() => {
          const mockTranslation = 'Translation audio output';
          setLastTranslation(mockTranslation);
          onTranslationText?.(mockTranslation);
          
          // GENERATE SILENCE (or dummy tone) TO SIMULATE AUDIO OUTPUT
          // In real integration: playAudioChunk(base64FromGemini);
          if (audioContextRef.current && audioDestinationRef.current) {
             // Just creating a small oscillator beep to prove audio routing works
             const osc = audioContextRef.current.createOscillator();
             osc.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
             osc.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 0.1);
             const gain = audioContextRef.current.createGain();
             gain.gain.value = 0.1;
             osc.connect(gain);
             gain.connect(audioDestinationRef.current);
             osc.start();
             osc.stop(audioContextRef.current.currentTime + 0.5);
          }
          
          updateState('listening');
          simulateCycle();
        }, 2000);
      }, 3000);
    };
    
    simulateCycle();
  }, [isActive, updateState, onTranslationText]);

  /**
   * Stop Gemini Live session
   */
  const stop = useCallback(() => {
    console.log('[GeminiLive] Stopping session');
    
    // Stop microphone
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Close Gemini session
    if (geminiSessionRef.current) {
      // TODO: Properly close Gemini Live session
      geminiSessionRef.current = null;
    }
    
    setIsActive(false);
    updateState('idle');
  }, [updateState]);

  /**
   * Auto-start/stop based on enabled prop
   */
  useEffect(() => {
    if (enabled && !isActive) {
      start();
    } else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, isActive, start, stop]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    isActive,
    error,
    start,
    stop,
    lastTranslation
  };
}
