// Type definitions for live session functionality

export interface Participant {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  isStreaming?: boolean;
  id?: string;
  name?: string;
  isOnline: boolean;
  joinedAt?: Date;
}

export interface SessionData {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  created_at: Date;
  isActive: boolean;
  status?: string;
}

export interface ChatMessage {
  id: string;
  userName: string;
  message: string;
  timestamp: Date;
  type?: 'user' | 'system';
  userId: string;
  messageType?: 'chat' | 'system' | 'translation';
  translations?: { [language: string]: string };
}

export interface LiveCaption {
  id: string;
  text: string;
  timestamp: Date;
  language?: string;
  isTranslated?: boolean;
  original?: string;
  translated?: string;
  confidence?: number;
  startTime?: number;
  translations?: { [language: string]: string };
}

export interface TranslationResult {
  original: string;
  translated: string;
  language: string;
  timestamp: Date;
  confidence?: number;
  fromLanguage?: string;
  toLanguage?: string;
}

export interface SubtitleSettings {
  enabled: boolean;
  language: string;
  fontSize: number;
  position: 'bottom' | 'top' | 'center';
  backgroundColor: string;
  textColor: string;
  autoTranslate: boolean;
  showOriginal: boolean;
  translationLanguage?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language: string;
  timestamp: Date;
  speakerId?: string;
}

export interface StreamData {
  streamId: string;
  userId: string;
  type?: 'video' | 'screen';
}

export interface RecordingData {
  isRecording: boolean;
  recordingId?: string;
  startTime?: Date;
}

export interface SocketJoinData {
  participants?: Participant[];
  isRecording?: boolean;
  sessionData?: SessionData;
}

export interface SocketUserData {
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  id?: string;
  name?: string;
}

export interface SocketChatData {
  id: string;
  userName: string;
  message: string;
  timestamp: Date | string;
  type?: 'user' | 'system';
  userId?: string;
}

export interface SocketCaptionData {
  id: string;
  text: string;
  timestamp: Date | string;
  language?: string;
  isTranslated?: boolean;
  original?: string;
  translated?: string;
  confidence?: number;
  startTime?: number;
}

export interface SocketRecordingData {
  isRecording: boolean;
  recordingId?: string;
  startTime?: Date | string;
}

export interface SocketErrorData {
  message: string;
  code?: string;
}

export interface WebRTCOffer {
  offer: RTCSessionDescriptionInit;
  userId: string;
}

export interface WebRTCAnswer {
  answer: RTCSessionDescriptionInit;
  userId: string;
}

export interface WebRTCIceCandidate {
  candidate: RTCIceCandidateInit;
  userId: string;
}