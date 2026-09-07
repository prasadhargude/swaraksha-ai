export type PresenceStatus = 'online' | 'inCall' | 'offline';

export interface UserModel {
  userId: string;
  username: string;
  status: PresenceStatus;
}

export type CallState = 'idle' | 'ringingOutgoing' | 'ringingIncoming' | 'connected' | 'ended';

export interface CallModel {
  callId: string;
  peerUserId: string;
  peerUsername: string;
  state: CallState;
}

export interface TranscriptSegment {
  text: string;
  isFinal: boolean;
  receivedAt: Date;
}

export type DetectionVerdict = 'real' | 'fake' | 'unknown';

export interface DetectionState {
  verdict: DetectionVerdict;
  lastMse: number;
  threshold: number;
  isSuspicious: boolean;
  silenceRatio?: number;
  isReliable?: boolean;
  fakeRatio?: number;
  reliableVotesCount?: number;
}

export interface SignalMessage {
  type: string;
  call_id?: string;
  from_user_id?: string;
  from_username?: string;
  to_user_id?: string;
  reason?: string;
  text?: string;
  is_final?: boolean;
  speaker_user_id?: string;
  sdp?: RTCSessionDescriptionInit | string;
  candidate?: RTCIceCandidateInit;
  user?: { user_id: string; username: string; status?: string };
  user_id?: string;
  users?: Array<{ user_id: string; username: string; status: string }>;
}

export interface CallHistoryItem {
  id: string;
  peerUserId: string;
  peerUsername: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  durationSec: number;
  verdict?: DetectionVerdict;
  peakMse?: number;
}

export interface BaraSettings {
  threshold: number;
  fakeRatioThreshold: number;
  windowSize: number;
  vadSilenceThreshold: number;
  soundEnabled: boolean;
  autoInspectVoice: boolean;
  customServerUrl: string;
}
