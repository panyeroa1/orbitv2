import React, { useState, useRef } from 'react';
import { Upload, FileAudio, Check, Loader2, Mic } from 'lucide-react';
import { ai, MODEL_TRANSCRIBE } from '../lib/gemini';

const AudioTranscriber: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
      setTranscription('');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Use webm for browser recording
        const file = new File([blob], "recording.webm", { type: 'audio/webm' });
        setAudioFile(file);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribe = async () => {
    if (!audioFile) return;
    setIsProcessing(true);
    setTranscription('');

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data url prefix (e.g. "data:audio/mp3;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioFile);
      });

      const response = await ai.models.generateContent({
        model: MODEL_TRANSCRIBE,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: audioFile.type || 'audio/mp3', // Fallback
                data: base64Data
              }
            },
            {
              text: "Transcribe this audio exactly as it is spoken."
            }
          ]
        }
      });

      setTranscription(response.text || "No transcription available.");

    } catch (error) {
      console.error("Transcription error", error);
      setTranscription("Error processing audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Audio Transcription</h2>
        <p className="text-secondary">Upload audio or record voice to transcribe using Gemini 2.5 Flash.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-surface border border-secondary/20 rounded-xl p-6 space-y-6 flex flex-col justify-center items-center text-center">
            
          <div className="flex flex-col space-y-4 w-full">
             <div className="relative border-2 border-dashed border-secondary/30 rounded-lg p-6 hover:border-primary transition-colors cursor-pointer group">
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2 text-secondary group-hover:text-primary">
                  <Upload size={32} />
                  <span className="text-sm font-medium">Click to upload audio file</span>
                </div>
             </div>
             
             <div className="flex items-center justify-between text-xs text-secondary uppercase font-bold tracking-wider">
                <div className="h-px bg-secondary/20 flex-1"></div>
                <span className="px-2">OR</span>
                <div className="h-px bg-secondary/20 flex-1"></div>
             </div>

             <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${
                    isRecording 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
             >
                <Mic size={20} />
                <span>{isRecording ? "Stop Recording" : "Record Microphone"}</span>
             </button>
          </div>

          {audioFile && (
            <div className="w-full bg-black/30 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3 text-white truncate">
                    <FileAudio size={20} className="text-primary flex-shrink-0" />
                    <span className="truncate text-sm">{audioFile.name}</span>
                </div>
                <button 
                  onClick={transcribe}
                  disabled={isProcessing}
                  className="bg-primary hover:bg-blue-600 text-white p-2 rounded-md disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                </button>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="bg-surface border border-secondary/20 rounded-xl p-6 flex flex-col h-full min-h-[300px]">
          <h3 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Transcription Result</h3>
          <div className="flex-1 bg-black/20 rounded-lg p-4 text-gray-200 text-sm leading-relaxed overflow-y-auto border border-secondary/10">
            {transcription ? (
                <p className="whitespace-pre-wrap">{transcription}</p>
            ) : (
                <p className="text-secondary/50 italic">{isProcessing ? "Transcribing..." : "Transcription will appear here..."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioTranscriber;
