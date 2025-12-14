
export enum AppState {
  LANDING = 'LANDING',
  JOIN_INPUT = 'JOIN_INPUT',
  SCHEDULE = 'SCHEDULE',
  DEVICE_CHECK = 'DEVICE_CHECK', // The "Green Room"
  ACTIVE = 'ACTIVE',
  PAYMENT = 'PAYMENT',
  WAITING_ROOM = 'WAITING_ROOM',
}

export interface Segment {
  id: string;
  original: string;
  translated: string;
  isFinal: boolean;
  timestamp: number;
  speakerName?: string;
}

export interface TranslationConfig {
  sourceLang: string;
  targetLang: string;
}

export interface MeetingSession {
  id: string;
  passcode: string;
  link: string;
  isHost: boolean;
}

export interface ScheduledMeeting {
  id: string;
  topic: string;
  date: string;
  time: string;
  duration: string;
  passcode: string;
  link: string;
  invitees: string[];
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface Attachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  attachment?: Attachment;
  senderName?: string;
}

export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'guest' | 'ai';
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
  isScreenSharing?: boolean;
}

export interface MeetingSettings {
  theme: 'dark' | 'light';
  fontSize: 'sm' | 'md' | 'lg';
  aiSecretary: boolean;
  autoSummarize: boolean;
  clipboardSync: boolean;
  whiteboard: boolean;
  screenShare: boolean;
  noiseReduction: boolean;
  voiceFocus: boolean;
  beautify: boolean;
  studioQuality: boolean;
  hearOwnTranslation: boolean;
  transmitRawAudio: boolean;
  voice: 'Aoede' | 'Charon' | 'Puck' | 'Fenrir' | 'Kore';
}
