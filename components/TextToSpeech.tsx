import React, { useState, useRef } from 'react';
import { Play, Download, Loader2, Volume2, AudioLines } from 'lucide-react';
import { ai, MODEL_TTS } from '../lib/gemini';
import { Modality } from '@google/genai';
import { base64ToUint8Array, decodeAudioData } from '../lib/audioUtils';

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const generateSpeech = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setAudioUrl(null); // Reset previous

    try {
      const response = await ai.models.generateContent({
        model: MODEL_TTS,
        contents: text,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        // Create blob for download
        const audioBytes = base64ToUint8Array(base64Audio);
        const blob = new Blob([audioBytes], { type: 'audio/wav' }); // Assuming output is wav-like or raw PCM but we wrap for URL
        // Actually the API returns raw PCM usually for this model in live, but for generateContent it might be WAV wrapped or raw. 
        // Based on instructions "The audio bytes returned by the API is raw PCM data."
        // We cannot just make a blob URL of raw PCM and play it in <audio>. We must use AudioContext.
        // However, to "download", we might need to add a WAV header. For now, let's just focus on playback.
        
        await playAudio(audioBytes);
      }
    } catch (error) {
      console.error("TTS Error", error);
      alert("Failed to generate speech.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = async (pcmData: Uint8Array) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      
      // Stop previous if any
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
      }

      const audioBuffer = await decodeAudioData(pcmData, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      
      sourceRef.current = source;
      source.start();
      setIsPlaying(true);
      
    } catch (e) {
      console.error("Playback error", e);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        setIsPlaying(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AudioLines size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white">Generative Speech</h2>
        <p className="text-secondary">Turn text into lifelike speech using Gemini 2.5 Flash TTS.</p>
      </div>

      <div className="bg-surface border border-secondary/20 rounded-xl p-4 flex flex-col space-y-4">
        <textarea
          className="w-full h-40 bg-black/20 rounded-lg p-4 text-white focus:outline-none border border-transparent focus:border-primary/50 resize-none"
          placeholder="Enter text to generate speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        
        <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">{text.length} chars</span>
            <div className="flex space-x-3">
                {isPlaying ? (
                    <button 
                        onClick={stopAudio}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Volume2 className="animate-pulse" size={18} />
                        <span>Stop</span>
                    </button>
                ) : (
                    <button 
                        onClick={generateSpeech}
                        disabled={isGenerating || !text}
                        className="flex items-center space-x-2 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                        <span>Generate & Play</span>
                    </button>
                )}
            </div>
        </div>
      </div>
      
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4 text-sm text-blue-200">
        <p><strong>Note:</strong> This uses the `gemini-2.5-flash-preview-tts` model. Audio is generated and played back using raw PCM data processing.</p>
      </div>
    </div>
  );
};

export default TextToSpeech;
