import React, { useState } from 'react';
import { TrustedContact } from '../types/speakerFingerprint';
import { continuousSpeakerVerification } from '../services/speakerVerificationEngine';
import { soundEffects } from '../services/soundEffects';
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  Activity,
  Lock,
} from 'lucide-react';

interface VoiceEnrollmentModalProps {
  contact: TrustedContact;
  onClose: () => void;
  onEnrollmentComplete: (updatedContact: TrustedContact) => void;
}

export const VoiceEnrollmentModal: React.FC<VoiceEnrollmentModalProps> = ({
  contact,
  onClose,
  onEnrollmentComplete,
}) => {
  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedSamples, setRecordedSamples] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successResult, setSuccessResult] = useState<{ quality: number } | null>(null);

  const samplePrompts = [
    'Sample 1: "Hi, this is my natural speaking voice. I am enrolling in Swaraksha for verified calling."',
    'Sample 2: "Today the weather is pleasant and I am testing background ambient voice profile extraction."',
    'Sample 3: "Let’s keep our calls secure and protected from AI voice cloning and financial impostors."',
  ];

  // Recording timer simulation
  React.useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 6) {
            // Auto complete sample at 6s
            handleStopSample();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStartSample = () => {
    soundEffects.vibrate(20);
    soundEffects.playConnectedChime();
    setRecordingSeconds(0);
    setIsRecording(true);
  };

  const handleStopSample = () => {
    soundEffects.vibrate(25);
    setIsRecording(false);
    const newSamples = [...recordedSamples, `sample_${currentSampleIndex + 1}_recorded`];
    setRecordedSamples(newSamples);

    if (currentSampleIndex < 2) {
      setCurrentSampleIndex((prev) => prev + 1);
      setRecordingSeconds(0);
    } else {
      // Finished all 3 samples! Process aggregation
      processEnrollment(newSamples);
    }
  };

  const processEnrollment = async (samples: string[]) => {
    setIsProcessing(true);
    soundEffects.vibrate(40);

    try {
      // Invoke SpeakerVerificationService architecture
      const profile = await continuousSpeakerVerification.enrollSpeaker(contact.id, samples);

      const updatedContact: TrustedContact = {
        ...contact,
        speakerProfile: profile,
      };

      setSuccessResult({ quality: Math.round(profile.averageQuality * 100) });
      soundEffects.playConnectedChime();

      setTimeout(() => {
        onEnrollmentComplete(updatedContact);
      }, 1800);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="voice-enrollment-modal"
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-[#181A1D] border border-[#2B2D31] rounded-2xl p-5 shadow-2xl flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2B2D31]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#5865F2]/20 text-[#5865F2]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white">Voice Fingerprinting</h3>
              <p className="text-[11px] text-[#949BA4]">Enrolling voice for {contact.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#949BA4] hover:text-white text-xs px-2 py-1 rounded bg-[#232428]"
          >
            Cancel
          </button>
        </div>

        {/* Informational Architecture banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-[#1E2025] border border-[#2B2D31] text-[11px] text-[#949BA4] flex items-start gap-2">
          <Lock className="w-4 h-4 text-[#23A55A] shrink-0 mt-0.5" />
          <span>
            Extracts a 128-dimensional mathematical voice embedding. Raw audio is never stored
            unencrypted.
          </span>
        </div>

        {/* Progress Tracker (3 Samples) */}
        <div className="my-4">
          <div className="flex items-center justify-between text-xs text-[#949BA4] mb-2 font-medium">
            <span>Voice Sample Progress</span>
            <span className="text-[#5865F2] font-semibold">{recordedSamples.length} of 3 completed</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx < recordedSamples.length
                    ? 'bg-[#23A55A]'
                    : idx === currentSampleIndex && isRecording
                    ? 'bg-[#5865F2] animate-pulse'
                    : 'bg-[#2B2D31]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Active Prompt Box */}
        {!successResult && (
          <div className="p-3.5 rounded-xl bg-[#121316] border border-[#2B2D31] flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5865F2]">
              Speak naturally for 5–7 seconds:
            </span>
            <p className="text-xs text-white leading-relaxed italic">
              {samplePrompts[currentSampleIndex]}
            </p>

            {isRecording && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#232428] text-xs">
                <div className="flex items-center gap-1.5 text-[#ED4245]">
                  <span className="w-2 h-2 rounded-full bg-[#ED4245] animate-ping" />
                  <span className="font-semibold">Capturing VAD Audio...</span>
                </div>
                <span className="font-mono text-white font-bold">{recordingSeconds}s / 6s</span>
              </div>
            )}
          </div>
        )}

        {/* Success screen */}
        {successResult && (
          <div className="p-4 rounded-xl bg-[#23A55A]/10 border border-[#23A55A]/30 text-center flex flex-col items-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-[#23A55A] animate-bounce" />
            <h4 className="text-sm font-bold text-white">Voice Fingerprint Enrolled!</h4>
            <p className="text-xs text-[#949BA4]">
              High quality profile created ({successResult.quality}% acoustic confidence).
            </p>
          </div>
        )}

        {/* Controls */}
        {!successResult && (
          <div className="mt-5 flex flex-col gap-2">
            {!isRecording ? (
              <button
                onClick={handleStartSample}
                disabled={isProcessing}
                className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.98] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Mic className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'Synthesizing Neural Profile...'
                    : `Record Sample ${currentSampleIndex + 1} of 3`}
                </span>
              </button>
            ) : (
              <button
                onClick={handleStopSample}
                className="w-full py-3 bg-[#ED4245] hover:bg-[#D83A3D] active:scale-[0.98] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MicOff className="w-4 h-4" />
                <span>Finish Sample {currentSampleIndex + 1}</span>
              </button>
            )}

            <span className="text-[10px] text-center text-[#72767D]">
              Hold the microphone close and speak at normal conversational volume
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
