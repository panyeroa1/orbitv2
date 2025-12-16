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
  /** Connection status */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
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
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const geminiSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // ... implementation
  };

  /**
   * Connect to Gemini Live
   */
  const connect = useCallback(async (isRetry = false) => {
      try {
        if (!isRetry) {
            setError(null);
            setRetryCount(0);
        }
        
        setConnectionState(isRetry ? 'reconnecting' : 'connecting');
        updateState('idle');

        // ... (audio context and mic setup)
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        if (!audioDestinationRef.current) {
            audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
            onAudioOutput?.(audioDestinationRef.current.stream);
        }

        const micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        micStreamRef.current = micStream;

        const model = ai.getGenerativeModel({
          model: MODEL_LIVE,
          systemInstruction: getSystemInstruction(),
          generationConfig: {
            responseModalities: ['AUDIO'], 
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice }
              }
            }
          }
        });

        const session = await model.startChat({
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        });

        geminiSessionRef.current = session;
        setConnectionState('connected');
        setIsActive(true);
        setRetryCount(0);

        console.log('[GeminiLive] Session started:', sessionId);
        processAudioStream(micStream, session);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to start session';
        console.error('[GeminiLive] Connection error:', err);
        setError(errorMsg);
        
        // Trigger retry via effect or state, not direct call to avoid dependency cycle
        // Using a direct recursive call here is tricky with useCallback
        // So we'll schedule it
        scheduleRetry();
      }
  }, [sessionId, voice, getSystemInstruction, updateState, onAudioOutput]); // Removing scheduleRetry from deps

  // Ref to hold the connect function to break cycle
  const connectRef = useRef(connect);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  /**
   * Exponential Backoff Retry Strategy
   */
  const scheduleRetry = useCallback(() => {
      if (!enabled) return;
      
      const maxRetries = 5;
      setRetryCount(prev => {
          if (prev < maxRetries) {
             const delay = Math.pow(2, prev) * 1000;
             console.log(`[GeminiLive] Retrying in ${delay}ms (Attempt ${prev + 1}/${maxRetries})`);
             setConnectionState('reconnecting');
             
             retryTimeoutRef.current = setTimeout(() => {
                 connectRef.current(true);
             }, delay);
             return prev + 1;
          } else {
             setConnectionState('disconnected');
             setError('Max connection retries exceeded');
             setIsActive(false);
             return prev;
          }
      });
  }, [enabled]);

  /**
   * Start wrapper
   */
  const start = useCallback(async () => {
      connect(false);
  }, [connect]);


  /**
   * Process microphone audio stream
   */
  const processAudioStream = useCallback(async (stream: MediaStream, session: any) => {
    // ... implementation
    console.log('[GeminiLive] Processing audio stream...');
    const simulateCycle = () => {
      if (!geminiSessionRef.current) return;
      updateState('listening');
      setTimeout(() => {
        if (!geminiSessionRef.current) return;
        updateState('translating');
        setTimeout(() => {
          if (!geminiSessionRef.current) return;
          const mockTranslation = 'Translation audio output';
          setLastTranslation(mockTranslation);
          onTranslationText?.(mockTranslation);
          
           if (audioContextRef.current && audioDestinationRef.current) {
             try {
               const osc = audioContextRef.current.createOscillator();
               osc.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
               osc.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 0.1);
               const gain = audioContextRef.current.createGain();
               gain.gain.value = 0.1;
               osc.connect(gain);
               gain.connect(audioDestinationRef.current);
               osc.start();
               osc.stop(audioContextRef.current.currentTime + 0.5);
             } catch(e) { console.error(e); }
          }
          updateState('listening');
          simulateCycle();
        }, 2000);
      }, 3000);
    };
    simulateCycle();
  }, [updateState, onTranslationText]);

  /**
   * Stop Gemini Live session
   */
  const stop = useCallback(() => {
    console.log('[GeminiLive] Stopping session');
    
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (geminiSessionRef.current) {
      geminiSessionRef.current = null;
    }
    
    setIsActive(false);
    setConnectionState('disconnected');
    updateState('idle');
  }, [updateState]);

  /**
   * Auto-start/stop based on enabled prop
   */
  useEffect(() => {
    if (enabled && !isActive && connectionState === 'disconnected') {
      start();
    } else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, isActive, connectionState, start, stop]);

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
    connectionState, // NEW
    isActive,
    error,
    start,
    stop,
    lastTranslation
  };
}
