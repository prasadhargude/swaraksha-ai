import React, { useState, useRef, useEffect } from 'react';
import { TrustedContact } from '../types/speakerFingerprint';
import { continuousSpeakerVerification } from '../services/speakerVerificationEngine';
import { soundEffects } from '../services/soundEffects';
import { RealAudioEngine } from '../services/realAudioEngine';
import {
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Volume2,
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
  const [recordedPcmSamples, setRecordedPcmSamples] = useState<Float32Array[]>([]);
  const [liveVolume, setLiveVolume] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ quality: number } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmBufferRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const samplePrompts = [
    'Sample 1: "Hi, this is my natural speaking voice. I am enrolling in Swaraksha for verified calling."',
    'Sample 2: "Today the weather is pleasant and I am testing background ambient voice profile extraction."',
    'Sample 3: "Let’s keep our calls secure and protected from AI voice cloning and financial impostors."',
  ];

  // Clean up audio hardware on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch (_) {}
      audioCtxRef.current = null;
    }
    setLiveVolume(0);
  };

  // Recording timer
  useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 6) {
            handleStopSample();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, recordedPcmSamples, currentSampleIndex]);

  const handleStartSample = async () => {
    setErrorMessage(null);
    soundEffects.vibrate(20);
    soundEffects.playConnectedChime();
    setRecordingSeconds(0);
    pcmBufferRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Collect raw PCM samples
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        for (let i = 0; i < inputData.length; i++) {
          pcmBufferRef.current.push(inputData[i]);
        }
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      // Visual volume meter loop
      const checkVolume = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const avg = sum / data.length;
        setLiveVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();

      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error during enrollment:', err);
      setErrorMessage('Could not access microphone. Please grant mic permission to enroll voice.');
    }
  };

  const handleStopSample = () => {
    soundEffects.vibrate(25);
    setIsRecording(false);

    // Snapshot PCM samples collected
    const collectedSamples = new Float32Array(pcmBufferRef.current);
    cleanupRecording();

    const newRecordedSamples = [...recordedPcmSamples, collectedSamples];
    setRecordedPcmSamples(newRecordedSamples);

    if (currentSampleIndex < 2) {
      setCurrentSampleIndex((prev) => prev + 1);
      setRecordingSeconds(0);
    } else {
      processEnrollment(newRecordedSamples);
    }
  };

  const processEnrollment = async (samples: Float32Array[]) => {
    setIsProcessing(true);
    soundEffects.vibrate(40);

    try {
      // Enroll speaker with genuine acoustic voice embedding extraction
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
    } catch (e: any) {
      console.error('Enrollment error:', e);
      setErrorMessage('Failed to extract voice features. Please try again.');
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
              <h3 className="text-[15px] font-bold text-white">Live Voice Fingerprinting</h3>
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

        {/* Informational banner */}
        <div className="mt-3 p-2.5 rounded-xl bg-[#1E2025] border border-[#2B2D31] text-[11px] text-[#949BA4] flex items-start gap-2">
          <Lock className="w-4 h-4 text-[#23A55A] shrink-0 mt-0.5" />
          <span>
            Extracts real pitch, formant ratios, and 128-D acoustic Mel-filterbank embeddings directly from your microphone.
          </span>
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#ED4245]/20 border border-[#ED4245]/40 text-xs text-[#ED4245] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Progress Tracker (3 Samples) */}
        <div className="my-4">
          <div className="flex items-center justify-between text-xs text-[#949BA4] mb-2 font-medium">
            <span>Voice Sample Progress</span>
            <span className="text-[#5865F2] font-semibold">{recordedPcmSamples.length} of 3 completed</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx < recordedPcmSamples.length
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
              Speak naturally into microphone:
            </span>
            <p className="text-xs text-white leading-relaxed italic">
              {samplePrompts[currentSampleIndex]}
            </p>

            {isRecording && (
              <div className="mt-2 pt-2 border-t border-[#232428] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#ED4245]">
                    <span className="w-2 h-2 rounded-full bg-[#ED4245] animate-ping" />
                    <span className="font-semibold">Recording Mic Audio...</span>
                  </div>
                  <span className="font-mono text-white font-bold">{recordingSeconds}s / 6s</span>
                </div>

                {/* Live Volume VU Meter */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-[#949BA4]" />
                  <div className="flex-1 h-1.5 bg-[#2B2D31] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#23A55A] via-[#FEE75C] to-[#ED4245] transition-all duration-75"
                      style={{ width: `${liveVolume}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#949BA4] w-7 text-right">{liveVolume}%</span>
                </div>
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
              Real acoustic profile created ({successResult.quality}% vocal clarity).
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
                    ? 'Extracting Acoustic Fingerprint...'
                    : `Record Live Sample ${currentSampleIndex + 1} of 3`}
                </span>
              </button>
            ) : (
              <button
                onClick={handleStopSample}
                className="w-full py-3 bg-[#ED4245] hover:bg-[#D83A3D] active:scale-[0.98] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <MicOff className="w-4 h-4" />
                <span>Complete Sample {currentSampleIndex + 1}</span>
              </button>
            )}

            <span className="text-[10px] text-center text-[#72767D]">
              Speak clearly into your device microphone for acoustic enrollment
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

