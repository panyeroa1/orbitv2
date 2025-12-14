import React, { useState, useEffect, useRef } from 'react';
import { AppState, Segment, TranslationConfig, MeetingSession, MediaDevice, Participant, MeetingSettings, Message, ScheduledMeeting, CaptionSettings } from './types';

// Services
import { STTService } from './lib/sttService';
import { AudioQueue } from './lib/audioQueue';
import { ai, MODEL_TRANSLATOR, MODEL_TTS } from './lib/gemini';
import { Modality } from '@google/genai';
import { base64ToUint8Array } from './lib/audioUtils';
import { getAvailableDevices, getStream } from './lib/deviceUtils';

import { supabase } from './lib/supabaseClient';
import { useWebRTC } from './hooks/useWebRTC';
import { useCaptions } from './hooks/useCaptions';
import { useSTT } from './hooks/useSTT';

// Components
import OrbitVisualizer from './components/OrbitVisualizer';
import AuthPage from './components/AuthPage';
import PaymentPage from './components/PaymentPage';
import CaptionsOverlay from './components/CaptionsOverlay';
import CaptionSettingsPanel from './components/CaptionSettingsPanel';
import { Session } from '@supabase/supabase-js';

import {
  Mic, MicOff, Video, VideoOff,
  MonitorUp, Users, MessageSquare,
  Settings, Globe,
  Calendar, Plus, Link as LinkIcon,
  Copy, ShieldCheck, X,
  Wand2, Zap, Sparkles, FileText,
  Share, Bot, File, Download,
  Mail, CheckCircle, RefreshCw,
  Volume2, Signal, Briefcase, Boxes,
  Check, Captions, UserMinus, Video as VideoIcon, Grid,
  Speaker, List, Bell, PhoneOff, Send, LogOut, DollarSign,
  UserCheck, UserX, Clock, Pin
} from 'lucide-react';

const LISTENING_LANGUAGES = [
  { code: 'af-ZA', name: 'Afrikaans (South Africa)' },
  { code: 'am-ET', name: 'Amharic (Ethiopia)' },
  { code: 'ar-AE', name: 'Arabic (UAE)' },
  { code: 'ar-BH', name: 'Arabic (Bahrain)' },
  { code: 'ar-DZ', name: 'Arabic (Algeria)' },
  { code: 'ar-EG', name: 'Arabic (Egypt)' },
  { code: 'ar-IQ', name: 'Arabic (Iraq)' },
  { code: 'ar-JO', name: 'Arabic (Jordan)' },
  { code: 'ar-KW', name: 'Arabic (Kuwait)' },
  { code: 'ar-LB', name: 'Arabic (Lebanon)' },
  { code: 'ar-LY', name: 'Arabic (Libya)' },
  { code: 'ar-MA', name: 'Arabic (Morocco)' },
  { code: 'ar-OM', name: 'Arabic (Oman)' },
  { code: 'ar-QA', name: 'Arabic (Qatar)' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  { code: 'ar-SY', name: 'Arabic (Syria)' },
  { code: 'ar-TN', name: 'Arabic (Tunisia)' },
  { code: 'ar-YE', name: 'Arabic (Yemen)' },
  { code: 'az-AZ', name: 'Azerbaijani' },
  { code: 'bg-BG', name: 'Bulgarian' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)' },
  { code: 'bn-IN', name: 'Bengali (India)' },
  { code: 'bs-BA', name: 'Bosnian' },
  { code: 'ca-ES', name: 'Catalan' },
  { code: 'cs-CZ', name: 'Czech' },
  { code: 'da-DK', name: 'Danish' },
  { code: 'de-AT', name: 'German (Austria)' },
  { code: 'de-CH', name: 'German (Switzerland)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'el-GR', name: 'Greek' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'en-CA', name: 'English (Canada)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-GH', name: 'English (Ghana)' },
  { code: 'en-HK', name: 'English (Hong Kong)' },
  { code: 'en-IE', name: 'English (Ireland)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'en-KE', name: 'English (Kenya)' },
  { code: 'en-NG', name: 'English (Nigeria)' },
  { code: 'en-NZ', name: 'English (New Zealand)' },
  { code: 'en-PH', name: 'English (Philippines)' },
  { code: 'en-SG', name: 'English (Singapore)' },
  { code: 'en-TZ', name: 'English (Tanzania)' },
  { code: 'en-US', name: 'English (USA)' },
  { code: 'en-ZA', name: 'English (South Africa)' },
  { code: 'es-AR', name: 'Spanish (Argentina)' },
  { code: 'es-BO', name: 'Spanish (Bolivia)' },
  { code: 'es-CL', name: 'Spanish (Chile)' },
  { code: 'es-CO', name: 'Spanish (Colombia)' },
  { code: 'es-CR', name: 'Spanish (Costa Rica)' },
  { code: 'es-DO', name: 'Spanish (Dominican Republic)' },
  { code: 'es-EC', name: 'Spanish (Ecuador)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-GT', name: 'Spanish (Guatemala)' },
  { code: 'es-HN', name: 'Spanish (Honduras)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'es-NI', name: 'Spanish (Nicaragua)' },
  { code: 'es-PA', name: 'Spanish (Panama)' },
  { code: 'es-PE', name: 'Spanish (Peru)' },
  { code: 'es-PR', name: 'Spanish (Puerto Rico)' },
  { code: 'es-PY', name: 'Spanish (Paraguay)' },
  { code: 'es-SV', name: 'Spanish (El Salvador)' },
  { code: 'es-US', name: 'Spanish (USA)' },
  { code: 'es-UY', name: 'Spanish (Uruguay)' },
  { code: 'es-VE', name: 'Spanish (Venezuela)' },
  { code: 'et-EE', name: 'Estonian' },
  { code: 'eu-ES', name: 'Basque' },
  { code: 'fa-IR', name: 'Persian' },
  { code: 'fi-FI', name: 'Finnish' },
  { code: 'fil-PH', name: 'Filipino' },
  { code: 'fr-BE', name: 'French (Belgium)' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'fr-CH', name: 'French (Switzerland)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'gl-ES', name: 'Galician' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'he-IL', name: 'Hebrew' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'hr-HR', name: 'Croatian' },
  { code: 'hu-HU', name: 'Hungarian' },
  { code: 'hy-AM', name: 'Armenian' },
  { code: 'id-ID', name: 'Indonesian' },
  { code: 'is-IS', name: 'Icelandic' },
  { code: 'it-CH', name: 'Italian (Switzerland)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'jv-ID', name: 'Javanese' },
  { code: 'ka-GE', name: 'Georgian' },
  { code: 'km-KH', name: 'Khmer' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'lo-LA', name: 'Lao' },
  { code: 'lt-LT', name: 'Lithuanian' },
  { code: 'lv-LV', name: 'Latvian' },
  { code: 'mk-MK', name: 'Macedonian' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'mn-MN', name: 'Mongolian' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'ms-MY', name: 'Malay' },
  { code: 'my-MM', name: 'Burmese' },
  { code: 'ne-NP', name: 'Nepali' },
  { code: 'nl-BE', name: 'Dutch (Belgium)' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)' },
  { code: 'no-NO', name: 'Norwegian' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'ro-RO', name: 'Romanian' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'si-LK', name: 'Sinhala' },
  { code: 'sk-SK', name: 'Slovak' },
  { code: 'sl-SI', name: 'Slovenian' },
  { code: 'sq-AL', name: 'Albanian' },
  { code: 'sr-RS', name: 'Serbian' },
  { code: 'su-ID', name: 'Sundanese' },
  { code: 'sv-SE', name: 'Swedish' },
  { code: 'sw-KE', name: 'Swahili (Kenya)' },
  { code: 'sw-TZ', name: 'Swahili (Tanzania)' },
  { code: 'ta-IN', name: 'Tamil (India)' },
  { code: 'ta-LK', name: 'Tamil (Sri Lanka)' },
  { code: 'ta-MY', name: 'Tamil (Malaysia)' },
  { code: 'ta-SG', name: 'Tamil (Singapore)' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'th-TH', name: 'Thai' },
  { code: 'tr-TR', name: 'Turkish' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'ur-IN', name: 'Urdu (India)' },
  { code: 'ur-PK', name: 'Urdu (Pakistan)' },
  { code: 'uz-UZ', name: 'Uzbek' },
  { code: 'vi-VN', name: 'Vietnamese' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'zh-HK', name: 'Chinese (Cantonese)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'zu-ZA', name: 'Zulu' }
];

const BACKGROUND_PRESETS = [
  { id: 'none', label: 'None', icon: <X size={14} /> },
  { id: 'blur', label: 'Blur', icon: <Zap size={14} /> },
  { id: 'office', label: 'Office', icon: <Briefcase size={14} /> },
  { id: 'space', label: 'Space', icon: <Sparkles size={14} /> },
  { id: 'greenscreen', label: 'Green Screen', icon: <Boxes size={14} /> },
];

// Simple chime sound base64
const CHIME_SOUND = "data:audio/wav;base64,UklGRl9vT1d..."; // In a real app this would be a real file.
// Using a AudioContext oscillator for "ping" instead of large base64 string to keep code clean
const playChime = (ctx: AudioContext) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
};


const App: React.FC = () => {
  // --- Auth State ---
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- App State ---
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [sessionInfo, setSessionInfo] = useState<MeetingSession | null>(null); 
  
  // Meeting State
  // Combined list of Local + Remote
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'participants' | 'chat' | 'secretary'>('participants');
  const [participantsViewMode, setParticipantsViewMode] = useState<'list' | 'grid'>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [waitingForHost, setWaitingForHost] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [orbitState, setOrbitState] = useState<'idle'|'listening'|'processing'|'speaking'>('idle');
  const [meetingSummary, setMeetingSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'speaker'>('speaker'); // Forced to speaker for now

  // Scheduling State
  const [scheduleForm, setScheduleForm] = useState({ topic: '', date: '', time: '', guests: '' });
  const [scheduledMeeting, setScheduledMeeting] = useState<ScheduledMeeting | null>(null);

  // Configuration
  const [config, setConfig] = useState<TranslationConfig>({ sourceLang: navigator.language || 'en-US', targetLang: 'es-ES' });
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings>({
    theme: 'dark',
    fontSize: 'md',
    aiSecretary: true,
    autoSummarize: true,
    clipboardSync: true,
    whiteboard: false,
    screenShare: false,
    noiseReduction: true,
    voiceFocus: false,
    beautify: false,
    studioQuality: true,
    hearOwnTranslation: false, 
    transmitRawAudio: true, // Default to true
    voice: 'Aoede', 
  });

  // Devices & Inputs
  const [joinInputId, setJoinInputId] = useState('');
  const [joinInputPass, setJoinInputPass] = useState('');
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedCamId, setSelectedCamId] = useState<string>('');
  
  // Active Controls
  const [isMicActive, setIsMicActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  // Caption Settings State
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);
  const [captionSettings, setCaptionSettings] = useState<CaptionSettings>({
    enabled: true,
    autoTranslate: false,
    targetLanguage: 'en',
    fontSize: 'medium',
    backgroundOpacity: 0.8,
    showOriginalAndTranslation: false,
    incomingTranslatedVoiceEnabled: false,
    hearOwnTranslationEnabled: false
  });

  // Studio Effects State
  const [isMirrored, setIsMirrored] = useState(true);
  const [backgroundMode, setBackgroundMode] = useState('none');
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs
  const sttRef = useRef<STTService | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null); 
  const selfVideoRef = useRef<HTMLVideoElement>(null); 
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); 
  const screenStreamRef = useRef<MediaStream | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Audio Visualization Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- Auth Initialization ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // WebRTC Hook
  const userId = session?.user?.id || 'guest';
  const userEmail = session?.user?.email || 'Guest';
  
  const handleControlSignal = (action: string, payload: any) => {
      if (action === 'mute') {
          setIsMicActive(false);
          sttRef.current?.stop();
          setOrbitState('idle');
          alert('You have been muted by the host.');
      } else if (action === 'request_video') {
          if (confirm("Host is requesting you to turn on your video.")) {
              setIsVideoActive(true);
          }
      } else if (action === 'kick' || action === 'join_denied') {
          stopMediaStream();
          setSessionInfo(null);
          setAppState(AppState.LANDING);
          alert(action === 'join_denied' ? 'Host declined your request to join.' : 'You have been removed from the meeting.');
      } else if (action === 'join_accepted') {
          setAppState(AppState.ACTIVE);
      } else if (action === 'join_request_received') {
          // Play audio notification for host
          if (audioContextRef.current) {
              playChime(audioContextRef.current);
          }
      } else if (action === 'spotlight') {
          // Host has pinned someone for everyone
          setPinnedParticipantId(payload.data.targetId);
      } else if (action === 'unspotlight') {
          setPinnedParticipantId(null);
      }
  };

  const { remoteParticipants, streams, notifications, chatMessages, sendMessage, sendControlSignal, joinRequests, resolveJoinRequest } = useWebRTC({
    sessionId: sessionInfo?.id || '',
    userId: userId,
    userName: sessionInfo?.isHost ? `${userEmail} (Host)` : userEmail,
    localStream: isScreenSharing ? screenStreamRef.current : mediaStreamRef.current, // Pass current active video stream
    isHost: !!sessionInfo?.isHost,
    onControlSignal: handleControlSignal
  });

  // --- Effects ---

  // Scroll transcript to bottom
  useEffect(() => {
    if (sidebarView === 'secretary' && transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, interimTranscript, sidebarView]);

  // Sync Chat Messages from WebRTC
  useEffect(() => {
      const formatted: Message[] = chatMessages.map((m: any) => ({
          role: m.senderId === userId ? 'user' : 'system',
          text: m.text,
          timestamp: new Date(m.timestamp),
          senderName: m.senderName
      }));
      setMessages(formatted);
  }, [chatMessages, userId]);

  // Sync participants list
  useEffect(() => {
    const localParticipant: Participant = {
        id: 'user-1',
        name: sessionInfo?.isHost ? 'You (Host)' : 'You',
        role: sessionInfo?.isHost ? 'host' : 'guest',
        isMuted: !isMicActive,
        isVideoOn: isVideoActive,
        isSpeaking: audioLevel > 10,
        isScreenSharing: isScreenSharing
    };

    // Orbits AI Bot (Always present for now)
    const aiParticipant: Participant = { 
        id: 'ai-1', 
        name: 'Orbits AI', 
        role: 'ai', 
        isMuted: false, 
        isVideoOn: true, 
        isSpeaking: orbitState === 'speaking' 
    };

    setParticipants([localParticipant, aiParticipant, ...remoteParticipants]);
  }, [remoteParticipants, isMicActive, isVideoActive, isScreenSharing, audioLevel, sessionInfo?.isHost, orbitState]);

  useEffect(() => {
    audioQueueRef.current = new AudioQueue();
    getAvailableDevices().then(({ audio, video }) => {
      setAudioDevices(audio);
      setVideoDevices(video);
      if (audio.length > 0) setSelectedMicId(audio[0].deviceId);
      if (video.length > 0) setSelectedCamId(video[0].deviceId);
    });

    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('id');
    const joinPwd = params.get('pwd');

    if (joinId) {
       setJoinInputId(joinId);
       if (joinPwd) setJoinInputPass(joinPwd);
       setSessionInfo({ 
           id: joinId, 
           passcode: joinPwd || '', 
           link: window.location.href, 
           isHost: false 
       });
       // If not logged in, AuthPage will show.
       if (session) {
           setAppState(AppState.DEVICE_CHECK);
           setIsVideoActive(true);
           setIsMicActive(true);
       }
    }

    return () => {
      stopMediaStream();
      stopScreenShare();
      sttRef.current?.stop();
    };
  }, [session]); 

  useEffect(() => {
    if (appState === AppState.DEVICE_CHECK || appState === AppState.ACTIVE || appState === AppState.WAITING_ROOM) {
        if (isVideoActive || isMicActive) {
             startCamera();
        } else {
             stopMediaStream();
        }
    }
  }, [isVideoActive, isMicActive, selectedCamId, selectedMicId, appState]);

  // Handle attaching remote streams to video elements
  useEffect(() => {
     if (appState !== AppState.ACTIVE) return;
     if (videoRef.current) {
         if (pinnedParticipantId === 'user-1') {
             if (isScreenSharing && screenStreamRef.current) {
                 videoRef.current.srcObject = screenStreamRef.current;
             } else if (mediaStreamRef.current && isVideoActive) {
                 videoRef.current.srcObject = mediaStreamRef.current;
             } else {
                 videoRef.current.srcObject = null;
             }
         } else if (pinnedParticipantId && streams[pinnedParticipantId]) {
             videoRef.current.srcObject = streams[pinnedParticipantId];
         } else {
             videoRef.current.srcObject = null;
         }
         if (videoRef.current.srcObject) videoRef.current.play().catch(e => console.error("Main video play failed", e));
     }
  }, [appState, isVideoActive, isScreenSharing, pinnedParticipantId, mediaStreamRef.current, screenStreamRef.current, streams]);


  const startCamera = async () => {
    try {
      const requestVideo = isVideoActive; 
      const requestAudio = isMicActive;

      if (!requestVideo && !requestAudio) {
          stopMediaStream();
          return;
      }

      const stream = await getStream(
          requestAudio ? selectedMicId : undefined, 
          requestVideo ? selectedCamId : undefined
      );
      
      mediaStreamRef.current = stream;
      
      if (previewVideoRef.current && (appState === AppState.DEVICE_CHECK || appState === AppState.WAITING_ROOM)) {
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.play();
      }

      if (requestAudio) {
          analyzeAudio(stream);
      }
    } catch (e) {
      console.error("Device Access Error", e);
    }
  };

  const analyzeAudio = (stream: MediaStream) => {
      if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const update = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(avg); 
          animationFrameRef.current = requestAnimationFrame(update);
      };
      update();
  };

  const stopMediaStream = () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    sendControlSignal('all', 'state_update', { isScreenSharing: false });
  };

  const generateInviteLink = (id: string, pass: string) => {
      const baseUrl = window.location.href.split('?')[0];
      return `${baseUrl}?id=${id}&pwd=${pass}`;
  };

  const createNewSession = () => {
    const newId = Math.floor(100000000 + Math.random() * 900000000).toString().replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
    const passcode = Math.floor(100000 + Math.random() * 900000).toString();
    const link = generateInviteLink(newId, passcode);
    
    setSessionInfo({ id: newId, passcode, link, isHost: true });
    setAppState(AppState.DEVICE_CHECK);
    setIsVideoActive(true);
    setIsMicActive(true);
  };

  const scheduleMeeting = () => {
      const newId = Math.floor(100000000 + Math.random() * 900000000).toString().replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
      const passcode = Math.floor(100000 + Math.random() * 900000).toString();
      const link = generateInviteLink(newId, passcode);

      const meeting: ScheduledMeeting = {
          id: newId,
          passcode,
          link,
          topic: scheduleForm.topic || 'New Meeting',
          date: scheduleForm.date || new Date().toISOString().split('T')[0],
          time: scheduleForm.time || '12:00',
          duration: '1h',
          invitees: scheduleForm.guests.split(',').map(e => e.trim()).filter(e => e)
      };
      setScheduledMeeting(meeting);
  };

  const sendEmailInvite = () => {
    if (!scheduledMeeting) return;
    const { topic, date, time, id, passcode, link, invitees } = scheduledMeeting;
    const subject = encodeURIComponent(`Invitation to Orbits Meeting: ${topic}`);
    const body = encodeURIComponent(
      `You are invited to an Orbits meeting.\n\n` +
      `Topic: ${topic}\n` +
      `When: ${date} at ${time}\n\n` +
      `Join Meeting: ${link}\n\n` +
      `Meeting ID: ${id}\n` +
      `Passcode: ${passcode}`
    );
    const emails = invitees.join(',');
    window.location.href = `mailto:${emails}?subject=${subject}&body=${body}`;
  };

  const copyInviteLink = () => {
      if (sessionInfo?.link) {
          navigator.clipboard.writeText(sessionInfo.link);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
      }
  };

  const generateSummary = async () => {
      if (segments.length === 0) return;
      setIsSummarizing(true);
      try {
          const transcriptText = segments.map(s => `[${new Date(s.timestamp).toLocaleTimeString()}] ${s.original}`).join('\n');
          const prompt = `You are the AI Secretary for a meeting. Summarize the following meeting transcript into key bullet points and action items:\n\n${transcriptText}`;
          
          const response = await ai.models.generateContent({
              model: MODEL_TRANSLATOR,
              contents: prompt
          });
          
          setMeetingSummary(response.text || "Could not generate summary.");
      } catch (e) {
          console.error("Summarization error", e);
          setMeetingSummary("Error generating summary.");
      } finally {
          setIsSummarizing(false);
      }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        setPinnedParticipantId('user-1');
        sendControlSignal('all', 'state_update', { isScreenSharing: true });
        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const text = `Shared a file: ${file.name}`;
      sendMessage(text); // Send via WebRTC
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChatSend = () => {
      if (!chatInput.trim()) return;
      sendMessage(chatInput);
      setChatInput('');
  };

  const handleSTTResult = async (text: string, isFinal: boolean) => {
    const segmentId = Date.now().toString();
    
    if (!isFinal) {
        setInterimTranscript(text);
        setOrbitState('listening');
        return;
    }

    setInterimTranscript('');
    setOrbitState('processing');
    
    // Save to Supabase
    if (sessionInfo) {
        supabase.from('transcriptions').insert({
            session_id: sessionInfo.id,
            user_id: userId,
            text: text,
            timestamp: new Date().toISOString()
        }).then(({ error }) => {
        if (error) console.error("Supabase Save Error", error);
        });
    }

    setSegments(prev => [...prev, { 
        id: segmentId, 
        original: text, 
        translated: '', 
        isFinal: true, 
        timestamp: Date.now(),
        speakerName: "You"
    }]);

    try {
    const prompt = `Translate to ${config.targetLang}. Input: "${text}". Output ONLY the translation. Ensure the tone, style, and emotion matches the original speaker as closely as possible for a native ${config.targetLang} speaker.`;
    const response = await ai.models.generateContent({ model: MODEL_TRANSLATOR, contents: prompt });
    const translatedText = response.text?.trim();

    if (translatedText) {
        setSegments(prev => prev.map(s => s.id === segmentId ? { ...s, translated: translatedText } : s));
        if (meetingSettings.hearOwnTranslation) await generateAndPlayAudio(translatedText);
        else {
            setOrbitState('speaking');
            setTimeout(() => setOrbitState('listening'), 2000);
        }
    }
    } catch (e) { setOrbitState('listening'); }
  };

  const generateAndPlayAudio = async (text: string) => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_TTS,
            contents: text,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: meetingSettings.voice } } }
            }
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            audioQueueRef.current?.enqueue({
                pcmData: base64ToUint8Array(base64Audio),
                onStart: () => setOrbitState('speaking'),
                onEnd: () => setOrbitState('listening')
            });
        }
    } catch (e) { setOrbitState('listening'); }
  };

  const toggleMic = () => {
    if (isMicActive) {
      sttRef.current?.stop();
      setIsMicActive(false);
      setOrbitState('idle');
    } else {
      sttRef.current = new STTService(config.sourceLang);
      sttRef.current?.start(handleSTTResult);
      setIsMicActive(true);
      setOrbitState('listening');
    }
  };

  const toggleParticipantMute = (id: string) => {
      sendControlSignal(id, 'mute');
  };

  const requestParticipantVideo = (id: string) => {
      sendControlSignal(id, 'request_video');
  };

  const spotlightParticipant = (id: string) => {
      // Send signal to all to pin this user
      sendControlSignal('all', 'spotlight', { targetId: id });
  };

  const removeParticipant = (id: string) => {
      if (confirm("Remove this participant?")) {
          sendControlSignal(id, 'kick');
      }
  };

  const joinSession = () => {
      if (sessionInfo?.isHost) {
          setAppState(AppState.ACTIVE);
      } else {
          // Guest sends request and waits
          setAppState(AppState.WAITING_ROOM);
          sendControlSignal('all', 'join_request', { senderId: userId, senderName: userEmail });
      }
  };
  
  const sortedParticipants = [...participants].sort((a, b) => {
      if (a.role === 'host') return -1;
      if (b.role === 'host') return 1;
      return 0;
  });

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setAppState(AppState.LANDING);
  };

  // --- Renders ---

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center h-full relative z-10 px-4">
       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20 z-0"></div>
       <div className="absolute top-6 right-6 z-20">
           <button onClick={handleLogout} className="flex items-center space-x-2 text-white/50 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-full border border-white/10">
               <LogOut size={16} />
               <span className="text-sm">Log Out</span>
           </button>
       </div>
       <div className="text-center space-y-6 z-10 mb-16">
           <div className="inline-block p-1 rounded-full bg-gradient-to-r from-neon to-neon-purple">
             <div className="bg-space rounded-full px-4 py-1">
               <span className="text-xs font-display tracking-widest text-white uppercase">Orbits V2.5 Pro</span>
             </div>
           </div>
           <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter">ORBITS</h1>
           <p className="text-white/60 text-lg">Next-Gen Neural Collaboration</p>
       </div>
       <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <button onClick={createNewSession} className="group flex flex-col items-center justify-center p-8 bg-neon/10 border border-neon/50 rounded-2xl hover:bg-neon/20 hover:scale-[1.02] transition-all">
             <div className="w-16 h-16 bg-neon text-black rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_#00f3ff]"><Video size={32} /></div>
             <span className="font-display font-bold text-xl text-white">New Meeting</span>
          </button>
          <div className="grid grid-rows-2 gap-4">
              <button onClick={() => setAppState(AppState.JOIN_INPUT)} className="group flex flex-col items-center justify-center p-4 bg-glass border border-glass-border rounded-2xl hover:bg-white/10 hover:scale-[1.02] transition-all">
                 <div className="flex items-center space-x-3"><Plus size={24} className="text-white" /><span className="font-display font-bold text-lg text-white">Join</span></div>
              </button>
              <button onClick={() => setAppState(AppState.SCHEDULE)} className="group flex flex-col items-center justify-center p-4 bg-glass border border-glass-border rounded-2xl hover:bg-white/10 hover:scale-[1.02] transition-all">
                 <div className="flex items-center space-x-3"><Calendar size={24} className="text-neon-purple" /><span className="font-display font-bold text-lg text-white">Schedule</span></div>
              </button>
          </div>
       </div>
    </div>
  );

  const renderJoinInput = () => (
      <div className="flex flex-col items-center justify-center h-full relative z-10 px-4">
        <div className="w-full max-w-md bg-surface border border-white/10 p-8 rounded-3xl space-y-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon to-neon-purple"></div>
             <h2 className="text-2xl font-display font-bold text-white text-center">Join Meeting</h2>
             <div className="space-y-4">
                 <div>
                     <label className="text-xs text-secondary font-bold uppercase ml-1">Meeting ID</label>
                     <input type="text" value={joinInputId} onChange={(e) => setJoinInputId(e.target.value)} placeholder="000-000-000" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon outline-none font-mono text-lg text-center tracking-widest" />
                 </div>
                 <div>
                     <label className="text-xs text-secondary font-bold uppercase ml-1">Passcode</label>
                     <input type="password" value={joinInputPass} onChange={(e) => setJoinInputPass(e.target.value)} placeholder="••••••" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon outline-none font-mono text-lg text-center tracking-widest" />
                 </div>
             </div>
             <div className="flex space-x-3 pt-4">
                  <button onClick={() => setAppState(AppState.LANDING)} className="flex-1 bg-white/5 text-white py-3 rounded-xl hover:bg-white/10 font-medium transition-colors">Cancel</button>
                  <button onClick={() => { if (joinInputId && joinInputPass) { setSessionInfo({ id: joinInputId, passcode: joinInputPass, link: '', isHost: false }); setAppState(AppState.DEVICE_CHECK); setIsVideoActive(true); setIsMicActive(true); } }} className="flex-1 bg-neon text-black font-bold py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,243,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed" disabled={!joinInputId || !joinInputPass}>Join</button>
             </div>
        </div>
      </div>
  );

  const renderSchedule = () => (
      <div className="flex flex-col items-center justify-center h-full relative z-10 px-4">
        {scheduledMeeting ? (
             <div className="w-full max-w-lg bg-surface border border-neon/30 p-8 rounded-3xl space-y-6 text-center animate-in zoom-in-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon to-neon-purple"></div>
                <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                <h2 className="text-3xl font-display font-bold text-white">Meeting Scheduled!</h2>
                <div className="bg-black/40 p-6 rounded-xl text-left space-y-4 border border-white/10">
                    <div><div className="text-xs text-secondary uppercase font-bold mb-1">Topic</div><div className="text-lg text-white font-medium">{scheduledMeeting.topic}</div></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><div className="text-xs text-secondary uppercase font-bold mb-1">Date</div><div className="text-white">{scheduledMeeting.date}</div></div>
                        <div><div className="text-xs text-secondary uppercase font-bold mb-1">Time</div><div className="text-white">{scheduledMeeting.time}</div></div>
                    </div>
                    <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                        <div><div className="text-xs text-secondary uppercase font-bold mb-1">Meeting ID</div><div className="font-mono text-neon text-lg">{scheduledMeeting.id}</div></div>
                        <div><div className="text-xs text-secondary uppercase font-bold mb-1">Passcode</div><div className="font-mono text-neon text-lg">{scheduledMeeting.passcode}</div></div>
                    </div>
                    <div className="pt-2"><div className="text-xs text-secondary uppercase font-bold mb-2">Invite Link</div><div className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg border border-white/10"><span className="flex-1 text-xs text-white/70 truncate font-mono">{scheduledMeeting.link}</span><button onClick={() => { navigator.clipboard.writeText(scheduledMeeting.link); }} className="p-1.5 hover:bg-white/10 rounded text-white" title="Copy Link"><Copy size={14}/></button></div></div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={sendEmailInvite} className="flex-1 bg-neon/10 text-neon border border-neon/30 py-3 rounded-xl hover:bg-neon/20 font-bold transition-colors flex items-center justify-center space-x-2"><Mail size={18} /><span>Send Invitation</span></button>
                    <button onClick={() => { setScheduledMeeting(null); setAppState(AppState.LANDING); }} className="flex-1 bg-white/10 text-white py-3 rounded-xl hover:bg-white/20 font-bold">Done</button>
                </div>
             </div>
        ) : (
            <div className="w-full max-w-md bg-surface border border-white/10 p-8 rounded-3xl space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon to-neon-purple"></div>
                <div className="flex items-center space-x-3 mb-6"><div className="p-3 bg-neon/10 rounded-xl text-neon"><Calendar size={24} /></div><h2 className="text-2xl font-display font-bold text-white">Schedule Meeting</h2></div>
                <div className="space-y-4">
                    <div className="space-y-1"><label className="text-xs text-secondary font-bold uppercase ml-1">Topic</label><input type="text" placeholder="e.g. Weekly Sync" value={scheduleForm.topic} onChange={(e) => setScheduleForm({...scheduleForm, topic: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon outline-none transition-colors" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs text-secondary font-bold uppercase ml-1">Date</label><input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon outline-none transition-colors [color-scheme:dark]" /></div>
                        <div className="space-y-1"><label className="text-xs text-secondary font-bold uppercase ml-1">Time</label><input type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon outline-none transition-colors [color-scheme:dark]" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs text-secondary font-bold uppercase ml-1">Guests (Emails)</label><textarea placeholder="Enter emails separated by commas..." value={scheduleForm.guests} onChange={(e) => setScheduleForm({...scheduleForm, guests: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon outline-none transition-colors h-24 resize-none" /></div>
                </div>
                <div className="flex space-x-3 pt-4">
                     <button onClick={() => setAppState(AppState.LANDING)} className="flex-1 bg-white/5 text-white py-3 rounded-xl hover:bg-white/10 font-medium transition-colors">Cancel</button>
                     <button onClick={scheduleMeeting} className="flex-1 bg-neon text-black font-bold py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,243,255,0.2)]">Schedule</button>
                </div>
            </div>
        )}
      </div>
  );

  const renderDeviceCheck = () => (
      <div className="flex flex-col items-center justify-center h-full relative z-10 px-4">
          <div className="w-full max-w-5xl bg-surface border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
              <div className="flex-1 bg-black relative min-h-[400px] flex items-center justify-center overflow-hidden group">
                  {isVideoActive ? ( <video ref={previewVideoRef} className="w-full h-full object-cover" muted playsInline style={{ transform: 'scaleX(-1)' }} /> ) : ( <div className="text-white/20 font-display text-2xl">Camera Off</div> )}
                  
                  {/* Virtual Background Visual Indicator */}
                  {backgroundMode !== 'none' && (
                     <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-neon flex items-center space-x-2 animate-in fade-in duration-300">
                        <Sparkles size={10} />
                        <span>Mode: {BACKGROUND_PRESETS.find(b => b.id === backgroundMode)?.label}</span>
                     </div>
                  )}

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
                      <button onClick={() => setIsMicActive(!isMicActive)} className={`p-4 rounded-full border transition-all ${isMicActive ? 'bg-white text-black border-white' : 'bg-red-600 text-white border-red-600'}`}>{isMicActive ? <Mic size={24} /> : <MicOff size={24} />}</button>
                      <button onClick={() => setIsVideoActive(!isVideoActive)} className={`p-4 rounded-full border transition-all ${isVideoActive ? 'bg-white text-black border-white' : 'bg-red-600 text-white border-red-600'}`}>{isVideoActive ? <Video size={24} /> : <VideoOff size={24} />}</button>
                  </div>
                  {isMicActive && ( <div className="absolute top-6 right-6 flex flex-col items-center space-y-1"><div className="w-2 h-16 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end"><div className="w-full bg-green-500 transition-all duration-75" style={{ height: `${Math.min(100, audioLevel)}%` }}></div></div><Mic size={12} className="text-white/50" /></div> )}
              </div>
              <div className="w-full md:w-96 bg-surface border-l border-white/10 p-6 flex flex-col space-y-6 overflow-y-auto">
                  <div><h2 className="text-xl font-display font-bold text-white mb-1">Ready to join?</h2><p className="text-xs text-secondary">{sessionInfo?.id}</p></div>
                  
                  <div className="space-y-4 flex-1">
                      {/* Audio & Video Selection */}
                      <div className="space-y-1"><label className="text-xs text-secondary font-bold uppercase flex items-center"><Mic size={12} className="mr-1"/> Microphone</label><select value={selectedMicId} onChange={(e) => setSelectedMicId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-neon outline-none">{audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-xs text-secondary font-bold uppercase flex items-center"><Video size={12} className="mr-1"/> Camera</label><select value={selectedCamId} onChange={(e) => setSelectedCamId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-neon outline-none">{videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}</select></div>
                      
                      {/* Language Selection */}
                      <div className="space-y-1 pt-2 border-t border-white/5">
                           <label className="text-xs text-neon font-bold uppercase flex items-center mb-2"><Globe size={12} className="mr-1"/> Translation Config</label>
                           <div className="grid grid-cols-2 gap-2">
                               <div>
                                   <label className="text-[10px] text-secondary uppercase">I Speak</label>
                                   <select 
                                       value={config.sourceLang} 
                                       onChange={(e) => setConfig(prev => ({ ...prev, sourceLang: e.target.value }))}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-neon outline-none"
                                   >
                                       {LISTENING_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="text-[10px] text-secondary uppercase">Translate To</label>
                                   <select 
                                       value={config.targetLang} 
                                       onChange={(e) => setConfig(prev => ({ ...prev, targetLang: e.target.value }))}
                                       className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-neon outline-none"
                                   >
                                       {LISTENING_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                                   </select>
                               </div>
                           </div>
                      </div>

                      {/* Transmit Options */}
                      <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/5">
                          <div className="flex items-center space-x-2">
                              <Signal size={14} className={meetingSettings.transmitRawAudio ? "text-green-400" : "text-white/30"} />
                              <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white">Transmit Audio</span>
                                  <span className="text-[10px] text-white/50">Send original voice</span>
                              </div>
                          </div>
                          <button 
                            onClick={() => setMeetingSettings(s => ({ ...s, transmitRawAudio: !s.transmitRawAudio }))}
                            className={`w-10 h-5 rounded-full p-1 transition-colors ${meetingSettings.transmitRawAudio ? 'bg-green-500' : 'bg-white/10'}`}
                          >
                              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${meetingSettings.transmitRawAudio ? 'translate-x-5' : 'translate-x-0'}`}></div>
                          </button>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/5">
                           <label className="text-xs text-secondary font-bold uppercase flex items-center mb-2"><Sparkles size={12} className="mr-1"/> Virtual Background</label>
                           <div className="grid grid-cols-3 gap-2">
                              {BACKGROUND_PRESETS.map(bg => ( 
                                <button 
                                  key={bg.id} 
                                  onClick={() => setBackgroundMode(bg.id)} 
                                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] transition-all duration-200 ${backgroundMode === bg.id ? 'bg-neon/20 border-neon text-white shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:border-white/20'}`}
                                >
                                  {bg.icon}
                                  <span className="mt-1">{bg.label}</span>
                                </button> 
                              ))}
                           </div>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                       <button onClick={joinSession} className="w-full bg-neon text-black font-bold py-3 rounded-xl hover:bg-white transition-colors shadow-[0_0_20px_rgba(0,243,255,0.2)]">{sessionInfo?.isHost ? "Start Meeting" : "Request to Join"}</button>
                       <button onClick={() => { stopMediaStream(); setAppState(AppState.LANDING); setSessionInfo(null); }} className="w-full bg-white/5 text-white font-medium py-3 rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderWaitingRoom = () => (
      <div className="h-full w-full flex flex-col items-center justify-center relative z-10 bg-black/80 backdrop-blur-md">
          {/* Keep video stream alive in background context but hidden or blurred */}
          <div className="absolute inset-0 z-0 opacity-20">
               {previewVideoRef.current && <video ref={el => { if(el && mediaStreamRef.current) el.srcObject = mediaStreamRef.current }} className="w-full h-full object-cover" muted playsInline autoPlay style={{ transform: 'scaleX(-1)' }} />}
          </div>
          
          <div className="z-10 text-center space-y-6 max-w-md p-8 bg-surface/50 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto animate-pulse">
                  <Clock size={40} className="text-neon" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host</h2>
                  <p className="text-secondary">We've notified the host that you are ready to join. You will be let in shortly.</p>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-neon w-1/3 animate-[translateX_300%_1s_infinite]"></div>
              </div>
              <button onClick={() => { stopMediaStream(); setAppState(AppState.LANDING); setSessionInfo(null); }} className="text-sm text-red-400 hover:text-red-300 font-medium">Cancel Request</button>
          </div>
      </div>
  );

  const renderActive = () => (
    <div className={`flex h-screen w-full relative bg-[#0a0a0a] overflow-hidden ${isScreenSharing ? 'border-4 border-green-500' : ''}`}>
       <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="*/*" />

       {/* Notifications */}
       <div className="absolute top-20 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
          {notifications.map((msg, i) => (
             <div key={i} className="bg-surface/90 backdrop-blur-md border border-neon/30 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-in slide-in-from-right fade-in duration-300">
                <Bell size={14} className="text-neon" />
                <span className="text-sm font-medium">{msg}</span>
             </div>
          ))}
          
          {/* Join Requests */}
          {joinRequests.map((req) => (
              <div key={req.userId} className="pointer-events-auto bg-surface/95 backdrop-blur-md border border-neon text-white p-4 rounded-xl shadow-2xl animate-in slide-in-from-right fade-in duration-300 w-80">
                  <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">{req.userName[0].toUpperCase()}</div>
                      <div>
                          <div className="font-bold">{req.userName}</div>
                          <div className="text-xs text-secondary">Wants to join the meeting</div>
                      </div>
                  </div>
                  <div className="flex space-x-2">
                      <button onClick={() => resolveJoinRequest(req.userId, true)} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-1"><UserCheck size={14} /><span>Accept</span></button>
                      <button onClick={() => resolveJoinRequest(req.userId, false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-1"><UserX size={14} /><span>Decline</span></button>
                  </div>
              </div>
          ))}
       </div>

       {isScreenSharing && ( <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-green-500 text-black px-4 py-1 rounded-b-xl z-[100] font-bold text-xs uppercase tracking-widest flex items-center shadow-[0_0_20px_rgba(34,197,94,0.5)]"><MonitorUp size={12} className="mr-2" /> You are sharing your screen</div> )}

       {/* Settings Overlay */}
       {showSettings && (
         <div className="absolute inset-0 z-[100] bg-space/95 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl h-[80vh] bg-surface border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                  <h2 className="text-2xl font-display font-bold text-white flex items-center space-x-3"><Settings className="text-neon" /><span>Settings</span></h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full text-white"><X /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="col-span-1 md:col-span-2 space-y-4 border-b border-white/10 pb-6 mb-2">
                     <h3 className="text-neon/90 text-sm font-bold uppercase tracking-wider flex items-center"><Share size={14} className="mr-2"/> Meeting Info</h3>
                     <div className="bg-black/40 border border-neon/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                        <div className="flex-1 min-w-0"><div className="text-xs text-secondary font-bold uppercase mb-1">Invite Link</div><div className="font-mono text-sm text-white/80 truncate select-all">{sessionInfo?.link}</div></div>
                        <button onClick={copyInviteLink} className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all ${copiedLink ? 'bg-green-500 text-black' : 'bg-neon/10 text-neon hover:bg-neon/20'}`}>{copiedLink ? <Check size={16} /> : <Copy size={16} />}<span>{copiedLink ? "Copied" : "Copy Link"}</span></button>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h3 className="text-neon/70 text-sm font-bold uppercase tracking-wider">AI Intelligence</h3>
                     <div className="bg-black/20 p-4 rounded-xl space-y-3">
                        <ToggleOption label="AI Secretary (Transcribe)" active={meetingSettings.aiSecretary} onClick={() => setMeetingSettings(s => ({...s, aiSecretary: !s.aiSecretary}))} icon={<Bot size={16} />} />
                        <ToggleOption label="Auto-Summarize" active={meetingSettings.autoSummarize} onClick={() => setMeetingSettings(s => ({...s, autoSummarize: !s.autoSummarize}))} icon={<FileText size={16} />} />
                        <ToggleOption label="Hear Own Translation" active={meetingSettings.hearOwnTranslation} onClick={() => setMeetingSettings(s => ({...s, hearOwnTranslation: !s.hearOwnTranslation}))} icon={<Volume2 size={16} />} />
                        <ToggleOption label="Transmit Raw Audio" active={meetingSettings.transmitRawAudio} onClick={() => setMeetingSettings(s => ({...s, transmitRawAudio: !s.transmitRawAudio}))} icon={<Signal size={16} />} />
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"><div className="flex items-center space-x-3 text-white"><Speaker size={16} /><span className="text-sm font-medium">AI Voice</span></div><select value={meetingSettings.voice} onChange={(e) => setMeetingSettings(s => ({...s, voice: e.target.value as any}))} className="bg-black/40 text-white text-xs p-2 rounded border border-white/10 outline-none"><option value="Aoede">Female (Aoede)</option><option value="Charon">Male (Orus)</option><option value="Puck">Male (Puck)</option><option value="Fenrir">Male (Deep)</option></select></div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
       )}

       <div className="flex-1 relative flex flex-col h-full transition-all duration-300">
          <div className="absolute top-4 left-4 z-20">
             <div className="flex items-center space-x-4">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center space-x-2 text-white/70">
                   <ShieldCheck className="text-green-500" size={14} />
                   <span className="text-xs font-mono">{sessionInfo?.id}</span>
                </div>
             </div>
          </div>

          <div className="flex-1 flex p-4 relative overflow-hidden">
               {/* Main Speaker View (Spotlight) */}
               <div className="flex w-full h-full space-x-4">
                  <div className="flex-1 relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                      {pinnedParticipantId === 'user-1' ? (
                          <div className={`w-full h-full relative group ${isScreenSharing ? 'border-green-500/30 border-2' : ''}`}>
                              <video ref={videoRef} className="w-full h-full object-contain bg-black" muted playsInline style={{ transform: isMirrored && !isScreenSharing ? 'scaleX(-1)' : 'none' }} />
                              <div className="absolute bottom-6 left-6 bg-black/60 px-4 py-2 rounded-xl text-white font-medium backdrop-blur-md flex items-center space-x-2">
                                {isScreenSharing ? <MonitorUp size={16} className="text-green-400" /> : null}<span>You {isScreenSharing ? '(Sharing Screen)' : '(Spotlight)'}</span>
                              </div>
                          </div>
                      ) : pinnedParticipantId ? (
                          <div className={`w-full h-full relative group ${participants.find(p => p.id === pinnedParticipantId)?.isScreenSharing ? 'border-green-500/30 border-2' : ''}`}>
                              <video 
                                ref={(el) => { if(el && streams[pinnedParticipantId]) el.srcObject = streams[pinnedParticipantId] }} 
                                className="w-full h-full object-contain bg-black" 
                                autoPlay 
                                playsInline 
                              />
                              <div className="absolute bottom-6 left-6 bg-black/60 px-4 py-2 rounded-xl text-white font-medium backdrop-blur-md flex items-center space-x-2">
                                  {participants.find(p => p.id === pinnedParticipantId)?.isScreenSharing && <MonitorUp size={16} className="text-green-400" />}
                                  <span>{participants.find(p => p.id === pinnedParticipantId)?.name}</span>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center space-y-12 scale-125">
                              <OrbitVisualizer isActive={isMicActive} state={orbitState} />
                              <div className="text-center space-y-2">
                                  <h2 className="text-3xl font-display font-bold text-white tracking-widest">ORBITS AI</h2>
                                  {meetingSettings.aiSecretary && <div className="text-neon text-xs bg-neon/10 px-3 py-1 rounded-full inline-block animate-pulse">SECRETARY ACTIVE</div>}
                              </div>
                          </div>
                      )}
                  </div>
               </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
             <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-2xl border border-white/10 px-4 py-3 rounded-2xl shadow-2xl">
                <DockButton icon={isMicActive ? <Mic /> : <MicOff className="text-red-500" />} onClick={toggleMic} label="Mute" />
                <DockButton icon={isVideoActive ? <Video /> : <VideoOff className="text-red-500" />} onClick={() => setIsVideoActive(!isVideoActive)} label="Video" />
                <DockButton icon={<MonitorUp className={isScreenSharing ? "text-green-400" : ""} />} onClick={toggleScreenShare} label={isScreenSharing ? "Stop Sharing" : "Share Screen"} active={isScreenSharing} />
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <DockButton icon={<Captions />} onClick={() => setShowCaptions(!showCaptions)} active={showCaptions} label="Captions" />
                <DockButton icon={<Users />} onClick={() => { setIsSidebarOpen(!isSidebarOpen); setSidebarView('participants'); }} active={isSidebarOpen && sidebarView === 'participants'} label="People" count={participants.length} />
                <DockButton icon={<MessageSquare />} onClick={() => { setIsSidebarOpen(!isSidebarOpen); setSidebarView('chat'); }} active={isSidebarOpen && sidebarView === 'chat'} label="Chat" count={messages.length > 0 ? messages.length : undefined} />
                <DockButton icon={<Settings />} onClick={() => setShowSettings(true)} label="Settings" />
                <div className="w-px h-8 bg-white/10 mx-2"></div>
                <DockButton icon={<DollarSign className="text-neon" />} onClick={() => setAppState(AppState.PAYMENT)} label="Donate" />
                <button onClick={() => { sttRef.current?.stop(); setAppState(AppState.LANDING); }} className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-xl transition-colors"><PhoneOff size={20} /></button>
             </div>
          </div>
          
          {showCaptions && (
             <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-4xl flex flex-col items-center pointer-events-none px-4 z-20">
                {/* Show Live Interim Transcript if available */}
                {interimTranscript && (
                    <div className="animate-in slide-in-from-bottom-5 fade-in duration-300 mb-2">
                        <div className="bg-black/50 backdrop-blur-sm text-white/70 text-lg md:text-xl font-medium px-4 py-2 rounded-lg text-center leading-relaxed border border-white/5">
                            <span className="align-middle italic">{interimTranscript}...</span>
                        </div>
                    </div>
                )}
                {/* Show Final Translated Segments */}
                {segments.slice(-1).map((seg) => (
                    <div key={seg.id} className="animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className="bg-black/70 backdrop-blur-sm text-white text-xl md:text-2xl font-medium px-6 py-3 rounded-lg shadow-lg text-center leading-relaxed">
                            <span className="text-neon font-bold mr-2 text-base align-middle uppercase tracking-wider">{seg.speakerName || "Unknown"}:</span>
                            <span className="align-middle shadow-black drop-shadow-md">{seg.translated || "..."}</span>
                        </div>
                    </div>
                ))}
             </div>
          )}
       </div>

       {isSidebarOpen && (
          <div className="w-80 bg-surface/90 backdrop-blur-xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300 relative z-40">
             <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-display font-bold text-white text-lg flex items-center space-x-2">{sidebarView === 'participants' && <span>Participants</span>}{sidebarView === 'chat' && <span>Chat</span>}{sidebarView === 'secretary' && <span>Secretary</span>}</h3>
                <div className="flex items-center space-x-2">
                    {sidebarView === 'participants' && (
                        <button 
                            onClick={() => setParticipantsViewMode(prev => prev === 'list' ? 'grid' : 'list')} 
                            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors mr-1"
                            title={participantsViewMode === 'list' ? "Switch to Grid View" : "Switch to List View"}
                        >
                            {participantsViewMode === 'list' ? <Grid size={18} /> : <List size={18} />}
                        </button>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)}><X className="text-white/50 hover:text-white" size={20} /></button>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-2">
                {sidebarView === 'participants' && (
                   <div className={participantsViewMode === 'list' ? 'space-y-1' : 'grid grid-cols-2 gap-2'}>
                      {sortedParticipants.map(p => (
                         <div key={p.id} className={`rounded-xl cursor-default group transition-all border ${pinnedParticipantId === p.id ? 'bg-neon/10 border-neon/30' : 'hover:bg-white/5 border-transparent'} ${participantsViewMode === 'list' ? 'p-3 flex flex-col space-y-2' : 'p-2 flex flex-col items-center justify-center text-center aspect-video bg-white/5 relative overflow-hidden'}`}>
                            {participantsViewMode === 'list' ? (
                                <>
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0" onClick={() => setPinnedParticipantId(p.id)}>
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 font-bold overflow-hidden shrink-0">
                                                {p.role === 'ai' ? <OrbitVisualizer isActive={false} state="idle" /> : p.name[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`text-sm font-medium truncate ${pinnedParticipantId === p.id ? 'text-neon' : 'text-white'}`}>{p.name}</div>
                                                <div className="text-[10px] text-white/40 capitalize flex items-center space-x-1">
                                                    <span>{p.role}</span>
                                                    {p.isScreenSharing && <span className="text-green-400 flex items-center bg-green-900/30 px-1 rounded ml-1"><MonitorUp size={8} className="mr-0.5"/> Sharing</span>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-1">
                                            {/* Local Pin Button (Always available) */}
                                            <button 
                                                onClick={() => setPinnedParticipantId(pinnedParticipantId === p.id ? null : p.id)} 
                                                className={`p-1.5 rounded transition-colors ${pinnedParticipantId === p.id ? 'bg-neon/20 text-neon' : 'hover:bg-white/10 text-white/30'}`}
                                                title={pinnedParticipantId === p.id ? "Unpin" : "Pin locally"}
                                            >
                                                <Pin size={12} className={pinnedParticipantId === p.id ? "fill-neon" : ""} />
                                            </button>

                                            {/* Host Spotlight Button */}
                                            {sessionInfo?.isHost && p.id !== 'user-1' && (
                                                 <button 
                                                    onClick={() => spotlightParticipant(p.id)} 
                                                    className="p-1.5 hover:bg-white/10 rounded text-white/30 hover:text-green-400 transition-colors" 
                                                    title="Spotlight for everyone"
                                                >
                                                    <MonitorUp size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-2 text-white/30 shrink-0 mt-1 pl-11 text-[10px]">
                                        {p.isMuted ? <MicOff size={10} /> : <Mic size={10} className="text-green-500" />}
                                        {p.isVideoOn ? <Video size={10} /> : <VideoOff size={10} />}
                                    </div>

                                    {sessionInfo?.isHost && p.id !== 'user-1' && (
                                        <div className="flex items-center space-x-1 pt-2 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => toggleParticipantMute(p.id)} className="flex-1 flex items-center justify-center py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/70" title="Toggle Mute">{p.isMuted ? <MicOff size={10} className="mr-1"/> : <Mic size={10} className="mr-1"/>} {p.isMuted ? 'Unmute' : 'Mute'}</button>
                                            <button onClick={() => requestParticipantVideo(p.id)} className="flex-1 flex items-center justify-center py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/70" title="Ask for Video"><VideoIcon size={10} className="mr-1"/> Ask Video</button>
                                            <button onClick={() => removeParticipant(p.id)} className="p-1 bg-red-900/20 hover:bg-red-900/50 text-red-400 rounded" title="Remove"><UserMinus size={10} /></button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full relative" onClick={() => setPinnedParticipantId(p.id)}>
                                    {/* Grid Video Stream */}
                                    {p.id === 'user-1' ? (
                                        <video 
                                            ref={el => { if (el && mediaStreamRef.current) el.srcObject = mediaStreamRef.current }} 
                                            className="w-full h-full object-cover" 
                                            muted 
                                            playsInline 
                                            autoPlay
                                            style={{ transform: isMirrored && !isScreenSharing ? 'scaleX(-1)' : 'none' }} 
                                        />
                                    ) : streams[p.id] ? (
                                        <video 
                                            ref={(el) => { if(el) el.srcObject = streams[p.id] }} 
                                            className="w-full h-full object-cover" 
                                            autoPlay 
                                            playsInline 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/20 font-display text-xs">NO SIGNAL</div>
                                    )}
                                    <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white flex items-center">
                                        <span className="truncate max-w-[80px]">{p.name}</span>
                                        {p.isMuted && <MicOff size={8} className="ml-1 text-red-400"/>}
                                    </div>
                                    {sessionInfo?.isHost && p.id !== 'user-1' && (
                                        <div className="absolute top-1 right-1 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => toggleParticipantMute(p.id)} className="p-1 bg-black/60 hover:bg-black/80 rounded text-white"><MicOff size={10} /></button>
                                             <button onClick={() => removeParticipant(p.id)} className="p-1 bg-red-600/60 hover:bg-red-600/80 rounded text-white"><UserMinus size={10} /></button>
                                        </div>
                                    )}
                                </div>
                            )}
                         </div>
                      ))}
                   </div>
                )}
                
                {sidebarView === 'chat' && (
                   <div className="h-full flex flex-col">
                      <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                         {messages.length === 0 ? (
                           <div className="text-center text-white/30 mt-10"><MessageSquare size={48} className="mx-auto mb-4 opacity-50" /><p>Share files or chat with the team.</p></div>
                         ) : (
                           messages.map((msg, i) => (
                             <div key={i} className={`p-3 rounded-xl border ${msg.role === 'user' ? 'bg-neon/5 border-neon/20 ml-8' : 'bg-white/5 border-white/5 mr-8'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold ${msg.role === 'user' ? 'text-neon' : 'text-white/70'}`}>{msg.senderName || (msg.role === 'user' ? 'You' : 'Guest')}</span>
                                    <span className="text-[10px] text-white/30">{msg.timestamp.toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm text-white/80 whitespace-pre-wrap">{msg.text}</p>
                                {msg.attachment && ( <div className="mt-2 p-2 bg-black/30 rounded border border-white/10 flex items-center space-x-3"><div className="p-2 bg-white/10 rounded">{msg.attachment.type.startsWith('image/') ? <FileText size={16} /> : <File size={16} />}</div><div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{msg.attachment.name}</div><div className="text-[10px] text-white/40">{(msg.attachment.size / 1024).toFixed(1)} KB</div></div><a href={msg.attachment.url} download={msg.attachment.name} className="p-1 hover:bg-white/10 rounded"><Download size={14} /></a></div> )}
                             </div>
                           ))
                         )}
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center space-x-2">
                          <input 
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                            placeholder="Type a message..." 
                            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-white/30"
                          />
                          <button onClick={handleChatSend} disabled={!chatInput.trim()} className="p-2 bg-neon/10 hover:bg-neon/20 text-neon rounded-lg disabled:opacity-50 transition-colors">
                              <Send size={16} />
                          </button>
                      </div>
                   </div>
                )}
                {sidebarView === 'secretary' && (
                    <div className="h-full flex flex-col space-y-4 p-2">
                        <div className="bg-neon/5 border border-neon/20 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-neon mb-2 flex items-center"><Sparkles size={14} className="mr-2" /> Meeting Summary</h4>
                            {meetingSummary ? ( <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{meetingSummary}</div> ) : ( <div className="text-center py-4"><p className="text-xs text-white/40 mb-3">No summary generated yet.</p><button onClick={generateSummary} disabled={isSummarizing || segments.length === 0} className="bg-neon/10 hover:bg-neon/20 text-neon text-xs px-3 py-2 rounded-lg transition-colors border border-neon/30 flex items-center justify-center w-full">{isSummarizing ? <RefreshCw size={12} className="animate-spin mr-2"/> : <Wand2 size={12} className="mr-2"/>}{isSummarizing ? "Analyzing..." : "Generate Summary"}</button></div> )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <h4 className="text-xs font-bold text-white/50 uppercase mb-3 sticky top-0 bg-surface/90 backdrop-blur-sm py-2">Live Transcript</h4>
                            <div className="space-y-3">
                                {segments.length === 0 && !interimTranscript && ( <p className="text-center text-white/20 text-sm italic py-4">Recording transcript...</p> )}
                                {segments.map(seg => ( <div key={seg.id} className="text-sm"><div className="flex items-center space-x-2 mb-1"><span className="text-[10px] text-white/30 font-mono">{new Date(seg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span><span className="text-xs font-bold text-white/70">You</span></div><p className="text-white/60 pl-4 border-l border-white/10">{seg.original}</p></div> ))}
                                {interimTranscript && (
                                    <div className="text-sm opacity-60 animate-pulse">
                                        <div className="flex items-center space-x-2 mb-1"><span className="text-[10px] text-white/30 font-mono">Now</span><span className="text-xs font-bold text-white/70">You (Speaking)</span></div>
                                        <p className="text-neon pl-4 border-l border-neon/50 italic">{interimTranscript}</p>
                                    </div>
                                )}
                                <div ref={transcriptEndRef} />
                            </div>
                        </div>
                    </div>
                )}
             </div>
          </div>
       )}
    </div>
  );

  // --- Main Render Flow ---
  if (authLoading) {
      return (
          <div className="h-screen w-screen bg-[#050505] text-white font-sans flex items-center justify-center">
              <OrbitVisualizer isActive={true} state="processing" />
          </div>
      );
  }

  if (!session) {
      return <AuthPage />;
  }

  return (
    <div className="h-screen w-screen bg-[#050505] text-white font-sans overflow-hidden">
      {appState === AppState.LANDING && renderLanding()}
      {appState === AppState.JOIN_INPUT && renderJoinInput()}
      {appState === AppState.SCHEDULE && renderSchedule()}
      {appState === AppState.DEVICE_CHECK && renderDeviceCheck()}
      {appState === AppState.ACTIVE && renderActive()}
      {appState === AppState.WAITING_ROOM && renderWaitingRoom()}
      {appState === AppState.PAYMENT && <PaymentPage onBack={() => setAppState(AppState.ACTIVE)} />}
    </div>
  );
};

const DockButton: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean, count?: number }> = ({ icon, label, onClick, active, count }) => (
  <button 
    onClick={onClick}
    className={`group relative p-3 rounded-xl transition-all duration-300 ${active ? 'bg-white/20 text-white scale-110' : 'hover:bg-white/10 text-white/70 hover:text-white hover:-translate-y-1'}`}
  >
    <div className="relative">
      {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
      {count !== undefined && <span className="absolute -top-2 -right-2 bg-neon text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
    </div>
    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
      {label}
    </span>
  </button>
);

const ToggleOption: React.FC<{ label: string, active: boolean, onClick: () => void, icon: React.ReactNode }> = ({ label, active, onClick, icon }) => (
   <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-neon/10 border-neon/50 text-white' : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5'}`}>
      <div className="flex items-center space-x-3">
         <div className={`p-2 rounded-lg ${active ? 'bg-neon text-black' : 'bg-white/10'}`}>{icon}</div>
         <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`w-3 h-3 rounded-full ${active ? 'bg-neon shadow-[0_0_10px_#00f3ff]' : 'bg-white/10'}`}></div>
   </button>
);

export default App;