// Domain models for Contact Voice Fingerprinting & Verification

export interface SpeakerProfile {
  contactId: string;
  embedding: number[]; // e.g., 128-d or 192-d normalized unit vector
  enrolledAt: number;
  sampleCount: number;
  averageQuality: number; // 0.0 - 1.0
}

export interface VerificationQuestion {
  id: string;
  question: string;
  answerHash: string; // SHA-256 hash or secure normalized hash
  hint?: string;
  createdAt: number;
}

export interface TrustedContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  avatarUrl?: string;
  speakerProfile?: SpeakerProfile;
  verificationQuestions: VerificationQuestion[];
  createdAt: number;
}

export type SpeakerVerificationStatus =
  | 'analyzing'
  | 'match'
  | 'possibleMismatch'
  | 'unknown'
  | 'inconclusive';

export interface SpeakerSegmentResult {
  segmentId: string;
  timestamp: number;
  similarityScore: number; // 0.0 - 1.0
  status: SpeakerVerificationStatus;
  statusLabel: string;
  speakerChanged: boolean;
  activeSpeakerLabel: string; // "Amit", "Unknown Speaker 2", etc.
  embeddingSnapshot: number[];
}

export interface VoiceAuthenticityResult {
  isAuthentic: boolean;
  syntheticVoiceProbability: number; // 0.0 - 1.0 (deepfake score)
  confidence: number;
  acousticArtifactsDetected: boolean;
}

export interface ConversationRiskAnalysis {
  domain: string; // 'Banking', 'Family Emergency', 'Digital Arrest', 'General', etc.
  financialRequest: boolean;
  urgency: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  newAccountOrUpiRequested: boolean;
  otpOrCredentialRequested: boolean;
  secrecyDemanded: boolean;
  riskScore: number; // 0 - 100
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedKeywords: string[];
  summaryExplanation: string;
}

export interface ActiveVerificationState {
  isTriggered: boolean;
  triggerReason: string;
  question?: VerificationQuestion;
  userPromptedAt?: number;
  receiverAsked: boolean;
  callerResponseText?: string;
  evaluationResult?: 'CORRECT' | 'INCORRECT' | 'UNCERTAIN' | 'PENDING';
  completedAt?: number;
  currentSegment?: SpeakerSegmentResult | null;
}

export interface ComprehensiveRiskAssessment {
  overallRiskLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  riskScore: number; // 0 - 100
  voiceMatchScore: number; // 0 - 100%
  syntheticVoiceScore: number; // 0 - 100%
  speakerConsistencyScore: number; // 0 - 100%
  conversationRiskScore: number; // 0 - 100%
  speakerMismatchFlag: boolean;
  activeVerificationPassed?: boolean;
  reasons: {
    type: 'positive' | 'warning' | 'danger';
    message: string;
  }[];
}

export type DemoScenarioId =
  | 'trusted_caller'
  | 'different_speaker'
  | 'ai_banking_scam'
  | 'real_voice_scam';

export interface DemoScenario {
  id: DemoScenarioId;
  title: string;
  description: string;
  contactName: string;
  relationship: string;
  expectedOutcome: string;
  transcriptSteps: {
    delayMs: number;
    speaker: string;
    text: string;
    similarity: number;
    status: SpeakerVerificationStatus;
    syntheticScore: number;
    speakerChanged?: boolean;
    domain?: string;
    financial?: boolean;
    urgency?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    triggerVerification?: boolean;
    simulatedCallerResponse?: string;
    simulatedCallerAnswerCorrect?: boolean;
  }[];
}
