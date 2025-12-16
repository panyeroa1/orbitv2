import { useState, useEffect, useRef, useCallback } from 'react';
import { ai, MODEL_LIVE } from '../lib/gemini';

// WebSocket Endpoint for Gemini Live API
const GEMINI_WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

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
  /** State change callback */
  onStateChange?: (state: 'idle' | 'listening' | 'translating') => void;
  /** Custom glossary terms { term: definition } */
  glossary?: Record<string, string>;
  /** Context from previous translations (Translation Memory) */
  context?: string;
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
  /** Detected source language */
  detectedLanguage: string | null;
  /** Translation confidence score */
  confidence: number | null;
  /** Detected speaker label */
  speaker: string | null;
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
  onStateChange,
  glossary = {},
  context = ""
}: UseGeminiLiveAudioProps): UseGeminiLiveAudioReturn {
  
  const [state, setState] = useState<'idle' | 'listening' | 'translating'>('idle');
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranslation, setLastTranslation] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
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
    const glossaryText = Object.entries(glossary).length > 0
      ? `\n\nUSE THE FOLLOWING GLOSSARY TERMS EXACTLY:\n${Object.entries(glossary).map(([k, v]) => `- "${k}": ${v}`).join('\n')}`
      : "";

    return `You are a real-time audio translator for a video call.

CRITICAL INSTRUCTIONS:
1. Listen to the speaker's voice.
2. Automatically DETECT the source language.
3. Translate naturally to ${targetLang}.
4. Speak the translation with natural intonation in the AUDIO channel.
5. In the TEXT channel, output ONLY a JSON object: { "detectedLanguage": "code", "confidence": 0.0-1.0, "isTranslation": true, "speaker": "Speaker 1" }.
6. Do NOT speak the JSON. Do NOT write the translation text in the TEXT channel (unless it is the JSON). If multiple speakers are detected, differentiate them in the "speaker" field.
${glossaryText}
${context ? `\nCONTEXT (Translation Memory - Use these as style references):\n${context}` : ""}

When you hear speech, immediately translate (Audio) and report metadata (Text).`;
  }, [sourceLang, targetLang, glossary]);

  /**
   * Initialize Audio Context
   */
  const initAudioContext = async () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000 // Set to 16kHz to match Gemini Input requirement
        });
    }

    // Output Destination (for WebRTC routing)
    if (!audioDestinationRef.current && audioContextRef.current) {
        audioDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
        onAudioOutput?.(audioDestinationRef.current.stream);
    }
  };

  /**
   * Play audio chunk from Gemini
   */
  const playAudioChunk = async (base64Array: string) => {
      if (!audioContextRef.current || !audioDestinationRef.current) return;

      try {
          // Decode Base64
          const binaryString = atob(base64Array);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          
          // PCM 16-bit to Float32
          const int16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(int16.length);
          for(let i=0; i<int16.length; i++) {
              float32[i] = int16[i] / 32768.0;
          }

          // Create Buffer (Assuming 24kHz output from Gemini Live)
          const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
          buffer.getChannelData(0).set(float32);

          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioDestinationRef.current);
          source.start();
          
          updateState('translating');
          // Reset to listening after playback (approximate)
          source.onended = () => {
             updateState('listening');
          };

      } catch (e) {
          console.error('[GeminiLive] Error playing audio chunk:', e);
      }
  };

  /**
   * Connect to Gemini Live WebSocket
   */
  const connect = useCallback(async (isRetry = false) => {
      try {
        if (!isRetry) {
            setError(null);
            setRetryCount(0);
        }
        
        setConnectionState(isRetry ? 'reconnecting' : 'connecting');
        updateState('idle');

        await initAudioContext();

        // 1. Get Microphone Stream
        const micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true, 
                autoGainControl: true,
                sampleRate: 16000 // Request 16kHz for input
            } 
        });
        micStreamRef.current = micStream;

        // 2. Setup WebSocket
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const ws = new WebSocket(`${GEMINI_WS_URL}?key=${apiKey}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[GeminiLive] WebSocket Connected');
            setConnectionState('connected');
            setIsActive(true);
            setRetryCount(0);

            // Send Setup Message
            const setupMessage = {
                setup: {
                    model: `models/${MODEL_LIVE}`,
                    generation_config: {
                        response_modalities: ["AUDIO", "TEXT"], // Request TEXT for metadata
                        speech_config: {
                            voice_config: {
                                prebuilt_voice_config: {
                                    voice_name: voice
                                }
                            }
                        }
                    },
                    system_instruction: {
                         parts: [{ text: getSystemInstruction() }]
                    }
                }
            };
            ws.send(JSON.stringify(setupMessage));
            
            // Start Audio Streaming
            startAudioStreaming(micStream);
        };

        ws.onmessage = async (event) => {
             const data = JSON.parse(event.data);
             
             // Handle Audio Output
             if (data.serverContent?.modelTurn?.parts) {
                 for (const part of data.serverContent.modelTurn.parts) {
                     if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                         playAudioChunk(part.inlineData.data);
                     }
                     if (part.text) {
                         try {
                             // Attempt to parse JSON metadata from text channel
                             // Expected format: JSON or text. 
                             // We ignore raw translation text here if it's just the transcript, 
                             // OR we use it if checking for JSON fails.
                             
                             // Clean potential markdown code blocks
                             const cleanText = part.text.replace(/```json\n?|\n?```/g, '').trim();
                             
                             if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
                                 const metadata = JSON.parse(cleanText);
                                 if (metadata.detectedLanguage) {
                                     console.log('[GeminiLive] Detected Language:', metadata.detectedLanguage);
                                     setDetectedLanguage(metadata.detectedLanguage);
                                 }
                                 if (metadata.confidence) {
                                     console.log('[GeminiLive] Confidence:', metadata.confidence);
                                     setConfidence(metadata.confidence);
                                 }
                                 if (metadata.speaker) {
                                     setSpeaker(metadata.speaker);
                                 }
                             } else {
                                 // Normal text backup
                                 setLastTranslation(part.text);
                                 onTranslationText?.(part.text);
                             }
                         } catch (e) {
                             // Not JSON, treat as normal text
                             setLastTranslation(part.text);
                             onTranslationText?.(part.text);
                         }
                     }
                 }
             }
        };

        ws.onclose = () => {
             console.log('[GeminiLive] WebSocket Closed');
             if (isActive) {
                 scheduleRetry();
             } else {
                 setConnectionState('disconnected');
             }
        };

        ws.onerror = (e) => {
             console.error('[GeminiLive] WebSocket Error:', e);
             setError('WebSocket connection error');
             ws.close();
        };

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
        console.error('[GeminiLive] Setup error:', err);
        setError(errorMsg);
        scheduleRetry();
      }
  }, [sessionId, voice, getSystemInstruction, updateState, onAudioOutput]);

  const connectRef = useRef(connect);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  /**
   * Start streaming microphone audio to WebSocket
   */
  const startAudioStreaming = (stream: MediaStream) => {
      if (!audioContextRef.current || !wsRef.current) return;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      // Downsample to 16kHz for Gemini
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Downsample Logic (Simple Decimation if context is 24k/48k -> 16k)
          // Ideally use a proper resampler, but for now assuming 16k requested or simple skip
          // Actually, we must send PCM 16-bit, Little Endian, 16kHz
          
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Convert to Base64
          const buffer = new ArrayBuffer(pcm16.byteLength);
          const view = new Uint8Array(buffer);
          // Copy int16 into buffer (Little Endian by default on most systems? need to ensure)
          // JS TypedArrays use platform endianness. sending raw bytes over WS usually expects standard.
          // Gemini expects: "linear-16" aka PCM 16LE.
          const dataView = new DataView(buffer);
          for(let i=0; i < pcm16.length; i++){
               dataView.setInt16(i*2, pcm16[i], true); // true = Little Endian
          }

          // Encode Base64
          // Using a faster method than btoa iteration if possible, but for chunks btoa is fine
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          // Send RealtimeInput
          const msg = {
              realtime_input: {
                  media_chunks: [{
                      mime_type: "audio/pcm;rate=16000",
                      data: base64
                  }]
              }
          };
          wsRef.current.send(JSON.stringify(msg));
          updateState('listening');
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
  };

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
   * Stop Gemini Live session
   */
  const stop = useCallback(() => {
    console.log('[GeminiLive] Stopping session');
    
    if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
    }

    if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
    }

    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
    connectionState,
    isActive,
    error,
    start,
    stop,
    lastTranslation,
    detectedLanguage,
    confidence,
    speaker
  };
}
