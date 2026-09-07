import React, { useState, useEffect, useMemo } from 'react';
import { CallModel, DetectionState, TranscriptSegment } from '../types';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AppAvatar } from './AppAvatar';
import { TranscriptOverlay } from './TranscriptOverlay';
import { SpoofOverlayWidget } from './SpoofOverlayWidget';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';
import { ForensicMonitorModal } from './ForensicMonitorModal';
import { SecurityRiskBanner } from './SecurityRiskBanner';
import { ActiveVerificationPrompt } from './ActiveVerificationPrompt';
import {
  PhoneOff,
  Mic,
  MicOff,
  ShieldAlert,
  Activity,
  Volume2,
  VolumeX,
  Grid3X3,
  ShieldCheck,
  Pause,
  Play,
  UserPlus,
  Lock,
  KeyRound,
  Fingerprint,
} from 'lucide-react';
import { deepfakeService } from '../services/deepfakeService';
import { soundEffects } from '../services/soundEffects';
import { TrustedContact, SpeakerSegmentResult, ActiveVerificationState } from '../types/speakerFingerprint';
import {
  continuousSpeakerVerification,
  neuralVoiceAuthenticity,
  conversationNLP,
  activeVerificationEvaluator,
  multiSignalRiskEngine,
} from '../services/speakerVerificationEngine';

interface ActiveCallScreenProps {
  call: CallModel;
  detectionState: DetectionState;
  transcriptSegments: TranscriptSegment[];
  isReconnecting: boolean;
  trustedContact?: TrustedContact;
  activeVerificationState?: ActiveVerificationState;
  onEndCall: () => void;
  onToggleMute: (muted: boolean) => void;
  onTriggerActiveVerification?: () => void;
  onEvaluateActiveAnswer?: (answer: string) => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  call,
  detectionState,
  transcriptSegments,
  isReconnecting,
  trustedContact,
  activeVerificationState,
  onEndCall,
  onToggleMute,
  onTriggerActiveVerification,
  onEvaluateActiveAnswer,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isOnHold, setIsOnHold] = useState(false);
  const [showKeypadSheet, setShowKeypadSheet] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(true);

  const isRinging = call.state === 'ringingOutgoing';
  const isConnected = call.state === 'connected';

  // Compute live NLP analysis from transcripts
  const [conversationAnalysis, setConversationAnalysis] = useState<any>(null);

  useEffect(() => {
    if (transcriptSegments.length > 0) {
      const full = transcriptSegments.map((s) => s.text).join(' ');
      const latest = transcriptSegments[transcriptSegments.length - 1].text;
      conversationNLP.analyzeTranscript(full, latest).then((res) => {
        setConversationAnalysis(res);
      });
    }
  }, [transcriptSegments]);

  // Compute live multi-signal comprehensive risk
  const riskAssessment = useMemo(() => {
    // Current synthetic probability from detectionState
    const synthProb = detectionState.verdict === 'fake' ? 0.92 : 0.06;

    const currentSegment = activeVerificationState?.currentSegment || null;

    return multiSignalRiskEngine.evaluateRisk({
      speakerSegment: currentSegment,
      voiceAuthenticity: {
        isAuthentic: detectionState.verdict !== 'fake',
        syntheticVoiceProbability: synthProb,
        confidence: 0.94,
        acousticArtifactsDetected: detectionState.verdict === 'fake',
      },
      conversationRisk: conversationAnalysis,
      activeVerification: activeVerificationState || null,
    });
  }, [detectionState, activeVerificationState, conversationAnalysis]);

  // Ringback sound management
  useEffect(() => {
    if (isRinging) {
      soundEffects.startOutgoingRingback();
    } else {
      soundEffects.stopOutgoingRingback();
    }
    return () => {
      soundEffects.stopOutgoingRingback();
    };
  }, [isRinging]);

  // Connection sound
  useEffect(() => {
    if (isConnected) {
      soundEffects.playConnectedChime();
    }
  }, [isConnected]);

  // Call timer tick
  useEffect(() => {
    if (!isConnected || isOnHold) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected, isOnHold]);

  // Start deepfake monitoring on connect
  useEffect(() => {
    if (isConnected) {
      deepfakeService.startMonitoring();
    }
    return () => {
      deepfakeService.stopMonitoring();
    };
  }, [isConnected]);

  const formatDuration = (totalSec: number): string => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    soundEffects.vibrate(15);
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    onToggleMute(nextMuted);
  };

  const handleSpeakerToggle = () => {
    soundEffects.vibrate(15);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleHoldToggle = () => {
    soundEffects.vibrate(15);
    setIsOnHold(!isOnHold);
  };

  const handleDtmfPress = (char: string) => {
    soundEffects.vibrate(20);
    soundEffects.playDtmf(char);
  };

  const handleEnd = () => {
    soundEffects.vibrate(30);
    onEndCall();
  };

  return (
    <div
      id="android-active-call-screen"
      className="absolute inset-0 z-50 bg-[#121316] flex flex-col justify-between select-none animate-fadeIn overflow-hidden h-full max-h-full"
    >
      {/* 1. Android Status Bar */}
      <AndroidStatusBar isCalling={true} />

      {/* 2. Top Bar: Security & Audio Encryption Badge */}
      <div className="w-full px-4 py-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1B1E] rounded-full border border-[#2B2D31] text-[11px] text-[#949BA4]">
          <Lock className="w-3 h-3 text-[#23A55A]" />
          <span>E2EE VoIP • 16kHz</span>
        </div>

        {/* Forensic telemetry quick-trigger button */}
        <button
          type="button"
          onClick={() => {
            soundEffects.vibrate(15);
            setShowDiagnostics(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
            detectionState.verdict === 'fake'
              ? 'bg-red-900/40 text-red-300 border-red-600 animate-pulse'
              : detectionState.verdict === 'real'
              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-600/50'
              : 'bg-[#2B2D31] text-[#7289DA] border-[#3A3C41]'
          }`}
        >
          {detectionState.verdict === 'fake' ? (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          ) : detectionState.verdict === 'real' ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Activity className="w-3.5 h-3.5 text-[#5865F2] animate-spin" />
          )}
          <span>BARA Guard: {detectionState.verdict.toUpperCase()}</span>
        </button>
      </div>

      {/* 3. Center Caller Information - Scrollable on mobile / small displays */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain px-3 py-2 flex flex-col items-center">
        {/* Caller Avatar */}
        <div className="relative mb-2.5 mt-1 shrink-0">
          {detectionState.verdict === 'fake' && (
            <div className="absolute -inset-2.5 rounded-full bg-red-600/30 animate-ping pointer-events-none" />
          )}
          {isConnected && detectionState.verdict === 'real' && (
            <div className="absolute -inset-2 rounded-full bg-[#23A55A]/20 animate-pulse pointer-events-none" />
          )}
          <AppAvatar username={call.peerUsername} size={84} className="shadow-2xl border-2 border-[#2B2D31]" />
        </div>

        {/* Caller Name */}
        <h2 className="text-xl sm:text-2xl font-bold text-[#F2F3F5] text-center tracking-tight truncate max-w-xs mb-0.5 shrink-0">
          {call.peerUsername}
        </h2>

        {/* State Label / Duration */}
        <div className="text-xs font-semibold tracking-wide mb-2 shrink-0">
          {isRinging && (
            <span className="text-[#949BA4] animate-pulse">Ringing mobile peer...</span>
          )}
          {isReconnecting && (
            <span className="text-[#FAA61A] animate-pulse">Reconnecting stream...</span>
          )}
          {isConnected && (
            <span className={isOnHold ? 'text-[#FAA61A]' : 'text-[#23A55A]'}>
              {isOnHold ? 'Call On Hold' : formatDuration(elapsedSeconds)}
            </span>
          )}
        </div>

        {/* Continuous Speaker Fingerprint & Risk Alert Banner */}
        <div className="w-full max-w-sm px-1 my-1.5 shrink-0">
          <SecurityRiskBanner
            expectedContactName={trustedContact?.name || call.peerUsername}
            speakerSegment={activeVerificationState?.currentSegment || null}
            riskAssessment={riskAssessment}
            activeVerification={activeVerificationState || null}
            onOpenVerificationQuestion={() => {
              if (onTriggerActiveVerification) {
                onTriggerActiveVerification();
                setShowVerificationPrompt(true);
              }
            }}
          />
        </div>

        {/* Active Verification Question Prompt (Context-Aware / High-Risk Triggered) */}
        {activeVerificationState?.isTriggered &&
          activeVerificationState.question &&
          showVerificationPrompt && (
            <div className="w-full max-w-sm px-1 my-1.5 z-30 shrink-0">
              <ActiveVerificationPrompt
                question={activeVerificationState.question}
                contactName={trustedContact?.name || call.peerUsername}
                evaluationResult={activeVerificationState.evaluationResult}
                onAnswerSubmit={(ans) => {
                  if (onEvaluateActiveAnswer) {
                    onEvaluateActiveAnswer(ans);
                  }
                }}
                onDismiss={() => setShowVerificationPrompt(false)}
              />
            </div>
          )}

        {/* Floating Truecaller-Style Voice Deepfake Alert Card */}
        <div className="w-full max-w-sm px-1 my-1.5 shrink-0">
          <SpoofOverlayWidget
            detectionState={detectionState}
            onOpenDetails={() => setShowDiagnostics(true)}
          />
        </div>

        {/* Audio Waveform visualizer */}
        {isConnected && (
          <div className="w-full max-w-xs my-1 flex flex-col items-center shrink-0">
            <AudioWaveformVisualizer
              isActive={!isMuted && !isOnHold}
              isFake={detectionState.verdict === 'fake'}
            />
          </div>
        )}

        {/* Live Transcript Subtitles */}
        <div className="w-full max-w-xs my-1 max-h-16 overflow-hidden shrink-0">
          <TranscriptOverlay segments={transcriptSegments} />
        </div>
      </div>

      {/* 4. Android In-Call Controls Grid (6 Action Tiles) & Fixed End Call Button */}
      <div className="w-full max-w-sm px-4 pt-2.5 pb-4 mx-auto flex flex-col items-center gap-3 shrink-0 bg-[#121316]/95 backdrop-blur-md border-t border-[#2B2D31]/50 z-20">
        <div className="w-full grid grid-cols-3 gap-y-2.5 gap-x-4 sm:gap-x-6 text-center">
          {/* 1. Mute */}
          <button
            type="button"
            onClick={handleMuteToggle}
            className="flex flex-col items-center gap-1 group focus:outline-none"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isMuted
                  ? 'bg-white text-black'
                  : 'bg-[#1E2025] text-[#F2F3F5] border border-[#2B2D31]'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#949BA4]">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          {/* 2. Keypad */}
          <button
            type="button"
            onClick={() => {
              soundEffects.vibrate(15);
              setShowKeypadSheet(true);
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1E2025] text-[#F2F3F5] border border-[#2B2D31] flex items-center justify-center transition-all active:scale-95">
              <Grid3X3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#949BA4]">Keypad</span>
          </button>

          {/* 3. Speaker */}
          <button
            type="button"
            onClick={handleSpeakerToggle}
            className="flex flex-col items-center gap-1 group focus:outline-none"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isSpeakerOn
                  ? 'bg-white text-black'
                  : 'bg-[#1E2025] text-[#F2F3F5] border border-[#2B2D31]'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#949BA4]">Speaker</span>
          </button>

          {/* 4. Hold */}
          <button
            type="button"
            onClick={handleHoldToggle}
            className="flex flex-col items-center gap-1 group focus:outline-none"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isOnHold
                  ? 'bg-[#FAA61A] text-black'
                  : 'bg-[#1E2025] text-[#F2F3F5] border border-[#2B2D31]'
              }`}
            >
              {isOnHold ? <Play className="w-5 h-5 sm:w-6 sm:h-6" /> : <Pause className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#949BA4]">
              {isOnHold ? 'Resume' : 'Hold'}
            </span>
          </button>

          {/* 5. BARA AI Forensics */}
          <button
            type="button"
            onClick={() => {
              soundEffects.vibrate(15);
              setShowDiagnostics(true);
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1E2025] text-[#7289DA] border border-[#2B2D31] flex items-center justify-center transition-all active:scale-95">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#949BA4]">Forensics</span>
          </button>

          {/* 6. Active Verification Trigger */}
          <button
            type="button"
            onClick={() => {
              soundEffects.vibrate(15);
              if (onTriggerActiveVerification) {
                onTriggerActiveVerification();
                setShowVerificationPrompt(true);
              }
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none"
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
                activeVerificationState?.isTriggered
                  ? 'bg-[#ED4245]/20 border-[#ED4245] text-[#ED4245]'
                  : 'bg-[#1E2025] text-[#FEE75C] border-[#2B2D31]'
              }`}
            >
              <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-[#949BA4]">Verify</span>
          </button>
        </div>

        {/* Red End Call Circular Button */}
        <div className="pt-0.5 flex items-center justify-center">
          <button
            id="active-call-end-btn"
            type="button"
            onClick={handleEnd}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#ED4245] hover:bg-[#D83A3D] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(237,66,69,0.45)] active:scale-90 transition-transform cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
          </button>
        </div>

        {/* Android Gesture Bar */}
        <div className="pt-0.5">
          <div className="w-28 sm:w-32 h-1 bg-white/30 rounded-full mx-auto" />
        </div>
      </div>

      {/* In-Call DTMF Keypad Bottom Sheet */}
      {showKeypadSheet && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-sm bg-[#1E2025] rounded-t-3xl border-t border-[#3A3E48] p-5 shadow-2xl flex flex-col items-center animate-slideUp">
            <div className="w-12 h-1.5 bg-[#4E525E] rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-bold text-[#F2F3F5] mb-3">In-Call Touch Tone (DTMF)</h3>
            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleDtmfPress(k)}
                  className="w-16 h-14 bg-[#141518] hover:bg-[#282B32] active:bg-[#5865F2] text-xl font-bold text-[#F2F3F5] rounded-2xl flex items-center justify-center transition-all border border-[#2B2D31]"
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowKeypadSheet(false)}
              className="mt-5 px-6 py-2 bg-[#2B2D31] text-xs font-semibold text-[#F2F3F5] rounded-full"
            >
              Hide Keypad
            </button>
          </div>
        </div>
      )}

      {/* Forensic Diagnostics Modal / Bottom Sheet */}
      {showDiagnostics && (
        <ForensicMonitorModal
          detectionState={detectionState}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </div>
  );
};
