// Speaker Verification and Embedding Provider Interfaces
// Mirrors the production ML pipeline (e.g., ECAPA-TDNN / x-vector / ResNet34-LM)
import {
  SpeakerProfile,
  SpeakerSegmentResult,
  SpeakerVerificationStatus,
  VoiceAuthenticityResult,
  ConversationRiskAnalysis,
  ComprehensiveRiskAssessment,
  ActiveVerificationState,
} from '../types/speakerFingerprint';

export interface SpeakerEmbeddingProvider {
  /**
   * Extracts a normalized speaker embedding vector (e.g., 128-d or 192-d)
   * from raw audio PCM/WAV or segment buffer.
   */
  extractEmbedding(audioData: Float32Array | Blob | string): Promise<number[]>;
}

export interface SpeakerVerificationService {
  /**
   * Enroll a speaker from multiple natural recordings
   */
  enrollSpeaker(
    contactId: string,
    samples: (Float32Array | string)[]
  ): Promise<SpeakerProfile>;

  /**
   * Compare a live speaker embedding against an expected contact profile
   */
  verifySegment(
    expectedProfile: SpeakerProfile,
    liveEmbedding: number[],
    segmentHistory: SpeakerSegmentResult[]
  ): Promise<SpeakerSegmentResult>;

  /**
   * Compare a live speaker embedding against all enrolled contacts in directory
   */
  verifyAgainstAllEnrolled(
    liveEmbedding: number[],
    contacts: Array<{
      id: string;
      name: string;
      relationship: string;
      speakerProfile?: SpeakerProfile;
    }>,
    expectedContactNameOrId?: string,
    segmentHistory?: SpeakerSegmentResult[]
  ): Promise<SpeakerSegmentResult>;

  /**
   * Calculate cosine similarity between two unit vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number;
}

export interface VoiceAuthenticityService {
  analyzeAuthenticity(audioData: Float32Array | Blob | string): Promise<VoiceAuthenticityResult>;
}

export interface ConversationRiskService {
  analyzeTranscript(fullTranscript: string, latestUtterance: string): Promise<ConversationRiskAnalysis>;
}

export interface ActiveVerificationEvaluator {
  evaluateAnswer(
    expectedAnswerHash: string,
    callerResponse: string
  ): Promise<'CORRECT' | 'INCORRECT' | 'UNCERTAIN'>;
}

export interface MultiSignalRiskEngine {
  evaluateRisk(params: {
    speakerSegment: SpeakerSegmentResult | null;
    voiceAuthenticity: VoiceAuthenticityResult | null;
    conversationRisk: ConversationRiskAnalysis | null;
    activeVerification: ActiveVerificationState | null;
  }): ComprehensiveRiskAssessment;
}
