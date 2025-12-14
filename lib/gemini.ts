import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Orbits uses the Flash model for low-latency logical translation
export const MODEL_TRANSLATOR = 'gemini-2.5-flash';

// Orbits uses Flash TTS for speech synthesis
export const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// Orbits uses Native Audio model for Live API
export const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Orbits uses Flash for audio transcription
export const MODEL_TRANSCRIBE = 'gemini-2.5-flash';