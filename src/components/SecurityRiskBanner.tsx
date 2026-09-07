import React from 'react';
import {
  SpeakerSegmentResult,
  VoiceAuthenticityResult,
  ConversationRiskAnalysis,
  ComprehensiveRiskAssessment,
  ActiveVerificationState,
} from '../types/speakerFingerprint';
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  HelpCircle,
  Activity,
  Layers,
  FileText,
  KeyRound,
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

  return (
    <div className="w-full flex flex-col gap-2 text-left">
      {/* 1. Continuous Speaker Verification Card */}
      <div
        className={`w-full p-2.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
          speakerSegment?.status === 'match'
            ? 'bg-[#18231C]/90 border-[#23A55A]/40 text-[#23A55A]'
            : speakerSegment?.status === 'possibleMismatch'
            ? 'bg-[#2A2315]/90 border-[#FEE75C]/40 text-[#FEE75C]'
            : speakerSegment?.status === 'unknown'
            ? 'bg-[#2B1B1D]/90 border-[#ED4245]/40 text-[#ED4245]'
            : 'bg-[#181A1D]/90 border-[#2B2D31] text-[#949BA4]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-xl ${
              speakerSegment?.status === 'match'
                ? 'bg-[#23A55A]/20'
                : speakerSegment?.status === 'possibleMismatch'
                ? 'bg-[#FEE75C]/20'
                : 'bg-[#ED4245]/20'
            }`}
          >
            {speakerSegment?.status === 'match' ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
                Speaker Identity
              </span>
              {speakerSegment?.speakerChanged && (
                <span className="px-1.5 py-0.2 bg-[#ED4245] text-white font-extrabold text-[9px] rounded-full animate-bounce">
                  SPEAKER CHANGE
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-white leading-tight mt-0.5">
              {speakerSegment ? speakerSegment.statusLabel : 'Analyzing speaker voice profile...'}
            </span>
          </div>
        </div>

        {/* Confidence Percentage Badge */}
        {speakerSegment && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[#949BA4] font-medium">Match</span>
            <span className="text-xs font-mono font-bold text-white">
              {Math.round(speakerSegment.similarityScore * 100)}%
            </span>
          </div>
        )}
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
