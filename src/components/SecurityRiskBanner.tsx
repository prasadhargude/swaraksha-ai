import React from 'react';
import {
  SpeakerSegmentResult,
  ComprehensiveRiskAssessment,
  ActiveVerificationState,
} from '../types/speakerFingerprint';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  KeyRound,
  Fingerprint,
} from 'lucide-react';

interface SecurityRiskBannerProps {
  expectedContactName: string;
  speakerSegment: SpeakerSegmentResult | null;
  riskAssessment: ComprehensiveRiskAssessment;
  activeVerification: ActiveVerificationState | null;
  onOpenVerificationQuestion?: () => void;
}

export const SecurityRiskBanner: React.FC<SecurityRiskBannerProps> = ({
  expectedContactName,
  speakerSegment,
  riskAssessment,
  activeVerification,
  onOpenVerificationQuestion,
}) => {
  const isHighRisk =
    riskAssessment.overallRiskLevel === 'HIGH' || riskAssessment.overallRiskLevel === 'CRITICAL';
  const isSuspicious = riskAssessment.overallRiskLevel === 'SUSPICIOUS';

  const hasVoiceMatch =
    speakerSegment?.hasSimilarity === true || speakerSegment?.status === 'match';
  const isMismatch = speakerSegment?.status === 'possibleMismatch';
  const isNoMatch = speakerSegment?.status === 'unknown';

  return (
    <div className="w-full flex flex-col gap-2 text-left">
      {/* 1. Voice Fingerprint Similarity Verification Card (Only tells if there is similarity) */}
      <div
        className={`w-full p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
          hasVoiceMatch
            ? 'bg-[#18231C]/95 border-[#23A55A]/50 text-[#23A55A]'
            : isMismatch
            ? 'bg-[#2A2315]/95 border-[#FEE75C]/50 text-[#FEE75C]'
            : isNoMatch
            ? 'bg-[#2B1B1D]/95 border-[#ED4245]/50 text-[#ED4245]'
            : 'bg-[#181A1D]/95 border-[#2B2D31] text-[#949BA4]'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              hasVoiceMatch
                ? 'bg-[#23A55A]/20 text-[#23A55A]'
                : isMismatch
                ? 'bg-[#FEE75C]/20 text-[#FEE75C]'
                : isNoMatch
                ? 'bg-[#ED4245]/20 text-[#ED4245]'
                : 'bg-[#5865F2]/20 text-[#5865F2]'
            }`}
          >
            {hasVoiceMatch ? (
              <UserCheck className="w-5 h-5" />
            ) : isMismatch || isNoMatch ? (
              <UserX className="w-5 h-5" />
            ) : (
              <Fingerprint className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
                Voice Fingerprint Verification
              </span>
              {speakerSegment?.speakerChanged && (
                <span className="px-1.5 py-0.5 bg-[#ED4245] text-white font-extrabold text-[9px] rounded-full animate-bounce">
                  SPEAKER CHANGE DETECTED
                </span>
              )}
            </div>

            <span className="text-xs font-bold text-white leading-snug mt-0.5">
              {speakerSegment ? (
                speakerSegment.statusLabel
              ) : (
                'Analyzing caller voice against enrolled fingerprints...'
              )}
            </span>
          </div>
        </div>

        {/* Clear Binary Similarity Tag */}
        <div className="shrink-0 ml-2">
          {hasVoiceMatch ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#23A55A]/20 border border-[#23A55A]/60 text-[#23A55A]">
              Similarity Detected
            </span>
          ) : isMismatch ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#FEE75C]/20 border border-[#FEE75C]/60 text-[#FEE75C]">
              Voice Divergence
            </span>
          ) : isNoMatch ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#ED4245]/20 border border-[#ED4245]/60 text-[#ED4245]">
              No Similarity
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#2B2D31] text-[#949BA4]">
              Analyzing
            </span>
          )}
        </div>
      </div>

      {/* 2. Conversation & Multi-Signal Risk Card */}
      {(isHighRisk || isSuspicious || activeVerification?.isTriggered) && (
        <div
          className={`w-full p-3 rounded-2xl border transition-all duration-300 flex flex-col gap-2 ${
            isHighRisk
              ? 'bg-[#261517] border-[#ED4245]/60'
              : 'bg-[#241F16] border-[#FEE75C]/50'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-4 h-4 ${isHighRisk ? 'text-[#ED4245]' : 'text-[#FEE75C]'}`}
              />
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  isHighRisk ? 'text-[#ED4245]' : 'text-[#FEE75C]'
                }`}
              >
                {riskAssessment.overallRiskLevel} CONVERSATION RISK
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#181A1D] text-white border border-[#35373C]">
              Threat Index: {riskAssessment.riskScore}/100
            </span>
          </div>

          {/* Explainable Risk Factors List */}
          <div className="flex flex-col gap-1">
            {riskAssessment.reasons.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] leading-tight">
                <span
                  className={
                    r.type === 'danger'
                      ? 'text-[#ED4245]'
                      : r.type === 'warning'
                      ? 'text-[#FEE75C]'
                      : 'text-[#23A55A]'
                  }
                >
                  {r.type === 'danger' ? '⚠' : r.type === 'warning' ? '●' : '✓'}
                </span>
                <span className="text-[#DBDEE1] font-medium">{r.message}</span>
              </div>
            ))}
          </div>

          {/* Prompt action trigger if verification not active yet */}
          {onOpenVerificationQuestion && !activeVerification?.isTriggered && (
            <button
              onClick={onOpenVerificationQuestion}
              className="mt-1 w-full py-1.5 bg-[#ED4245] hover:bg-[#D83A3D] text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ask Trusted Question to Verify</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
