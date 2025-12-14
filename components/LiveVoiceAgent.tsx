import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LiveServerMessage, Modality } from '@google/genai';
import { ai, MODEL_LIVE } from '../lib/gemini';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../lib/audioUtils';
import { Mic, MicOff, Volume2, XCircle } from 'lucide-react';

const LiveVoiceAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  // Audio Context and Processing Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // To hold the session object properly

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    
    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    if (sessionRef.current) {
        // Attempt to close session if method exists (Live API sessions might not have explicit close on the promise object directly, but checking)
        // In the new SDK, session.close() is available on the session object
        try { sessionRef.current.close(); } catch(e) {}
        sessionRef.current = null;
    }

    setIsActive(false);
    setVolume(0);
  }, []);

  const startSession = async () => {
    setError(null);
    try {
      // 1. Setup Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);
      
      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: MODEL_LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "You are a helpful, creative, and witty AI assistant named Makata. Keep responses concise.",
        },
        callbacks: {
          onopen: async () => {
            console.log('Gemini Live Session Opened');
            setIsActive(true);
            
            // Setup Input Processing inside onopen
            if (!inputContextRef.current || !streamRef.current) return;
            
            inputSourceRef.current = inputContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length) * 5); // Scale up for visibility

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            inputSourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const outputCtx = outputContextRef.current;
            if (!outputCtx || !outputNodeRef.current) return;

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBytes = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, outputCtx, 24000, 1);
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              // Schedule playback
              const currentTime = outputCtx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
              console.log('Interrupted by user');
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Gemini Live Session Closed');
            cleanup();
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setError("Connection error occurred.");
            cleanup();
          }
        }
      });
      
      // Store session for cleanup
      sessionPromise.then(s => {
          sessionRef.current = s;
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start audio session");
      cleanup();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8">
      <div className="relative">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-surface border border-secondary/20'}`}>
          {isActive ? (
             <div className="flex items-center space-x-1 h-12">
               {/* Visualize volume */}
               {[...Array(5)].map((_, i) => (
                 <div 
                    key={i} 
                    className="w-2 bg-red-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(10, Math.min(40, volume * 100 * (Math.random() + 0.5)))}px` }}
                 />
               ))}
             </div>
          ) : (
            <Mic className="w-12 h-12 text-secondary" />
          )}
        </div>
        {isActive && (
           <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-pulse opacity-50"></div>
        )}
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {isActive ? "Listening..." : "Start Conversation"}
        </h2>
        <p className="text-secondary text-sm">
          Experience real-time voice interaction with Gemini 2.5 Native Audio.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-200 px-4 py-2 rounded text-sm border border-red-700">
          {error}
        </div>
      )}

      <button
        onClick={isActive ? cleanup : startSession}
        className={`px-8 py-3 rounded-full font-semibold transition-all flex items-center space-x-2 ${
          isActive 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-white text-black hover:bg-gray-200'
        }`}
      >
        {isActive ? <><XCircle size={20} /><span>End Session</span></> : <><Mic size={20} /><span>Start Chat</span></>}
      </button>
    </div>
  );
};

export default LiveVoiceAgent;
