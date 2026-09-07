import React, { useState } from 'react';
import { DetectionState, BaraSettings } from '../types';
import { deepfakeService } from '../services/deepfakeService';
import { ShieldAlert, ShieldCheck, Cpu, Sparkles, Activity, Layers, Sliders, CheckCircle2 } from 'lucide-react';

interface SecurityDashboardProps {
  detectionState: DetectionState;
  settings: BaraSettings;
  onOpenSettings: () => void;
  onSimulateDeepfakeCall: () => void;
  onSimulateRealCall: () => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  detectionState,
  settings,
  onOpenSettings,
  onSimulateDeepfakeCall,
  onSimulateRealCall,
}) => {
  const [injectedFeedback, setInjectedFeedback] = useState<string | null>(null);

  const handleInject = (type: 'real' | 'fake' | 'silence', label: string) => {
    deepfakeService.injectSampleChunk(type);
    setInjectedFeedback(`Injected ${label}`);
    setTimeout(() => setInjectedFeedback(null), 1800);
  };

  const isFake = detectionState.verdict === 'fake';
  const isReal = detectionState.verdict === 'real';

  return (
    <div id="security-dashboard" className="w-full flex flex-col p-4 space-y-4 select-none overflow-y-auto">
      {/* Overview Card */}
      <div className="bg-[#2B2D31] border border-[#3A3C41] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl ${
              isFake ? 'bg-red-500/20 text-red-400' : isReal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#5865F2]/20 text-[#5865F2]'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F2F3F5] leading-tight">
                BARA On-Device AI Guard
              </h2>
              <p className="text-xs text-[#949BA4] leading-tight mt-0.5">
                On-device Convolutional Autoencoder (CAE)
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isFake
              ? 'bg-red-900/60 text-red-300 border border-red-700/60'
              : isReal
              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
              : 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/40'
          }`}>
            {detectionState.verdict === 'unknown' ? 'Standby / Ready' : detectionState.verdict.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-[#949BA4] leading-relaxed">
          Swaraksha intercepts incoming VoIP audio streams and analyzes voice authenticity in real time without transmitting audio to the cloud, guaranteeing full end-to-end user privacy.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#2B2D31] p-3 rounded-xl border border-[#3A3C41]">
          <span className="text-[10px] font-bold text-[#949BA4] uppercase">Current MSE</span>
          <div className={`text-xl font-mono font-bold mt-1 ${
            detectionState.lastMse > settings.threshold ? 'text-red-400' : 'text-[#23A55A]'
          }`}>
            {detectionState.lastMse.toFixed(1)}
          </div>
          <span className="text-[10px] text-[#949BA4]">Cutoff: {settings.threshold.toFixed(1)}</span>
        </div>

        <div className="bg-[#2B2D31] p-3 rounded-xl border border-[#3A3C41]">
          <span className="text-[10px] font-bold text-[#949BA4] uppercase">Window Fake %</span>
          <div className="text-xl font-mono font-bold mt-1 text-[#F2F3F5]">
            {(((detectionState.fakeRatio || 0) * 100)).toFixed(0)}%
          </div>
          <span className="text-[10px] text-[#949BA4]">Limit: {(settings.fakeRatioThreshold * 100).toFixed(0)}%</span>
        </div>

        <div className="bg-[#2B2D31] p-3 rounded-xl border border-[#3A3C41]">
          <span className="text-[10px] font-bold text-[#949BA4] uppercase">Votes Evaluated</span>
          <div className="text-xl font-mono font-bold mt-1 text-[#F2F3F5]">
            {detectionState.reliableVotesCount || 0} / {settings.windowSize}
          </div>
          <span className="text-[10px] text-[#949BA4]">Rolling Window</span>
        </div>

        <div className="bg-[#2B2D31] p-3 rounded-xl border border-[#3A3C41]">
          <span className="text-[10px] font-bold text-[#949BA4] uppercase">VAD Gating</span>
          <div className="text-xl font-mono font-bold mt-1 text-emerald-400">
            Active
          </div>
          <span className="text-[10px] text-[#949BA4]">Energy Filtering</span>
        </div>
      </div>

      {/* Live Simulation Test Bench */}
      <div className="bg-[#2B2D31] border border-[#3A3C41] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5865F2]" />
            <h3 className="text-sm font-bold text-[#F2F3F5]">Test Bench & Simulation Triggers</h3>
          </div>
          {injectedFeedback && (
            <span className="text-xs text-[#23A55A] font-medium animate-fadeIn">
              {injectedFeedback}
            </span>
          )}
        </div>

        <p className="text-xs text-[#949BA4]">
          Simulate full incoming VoIP calls or inject individual spectral chunks into the BARA decision window:
        </p>

        {/* Full Call Triggers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onSimulateRealCall}
            className="p-3 bg-[#1E1F22] hover:bg-[#35373C] border border-[#23A55A]/40 rounded-xl text-left transition-all active:scale-[0.99] flex items-start gap-2.5"
          >
            <div className="p-2 bg-[#23A55A]/20 rounded-lg text-[#23A55A] mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-[#F2F3F5]">Simulate Real Human Call</div>
              <div className="text-[11px] text-[#949BA4] mt-0.5">
                Generates natural speech patterns (MSE ~24.5). Result: Safe Human Voice.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSimulateDeepfakeCall}
            className="p-3 bg-[#1E1F22] hover:bg-[#35373C] border border-[#ED4245]/40 rounded-xl text-left transition-all active:scale-[0.99] flex items-start gap-2.5"
          >
            <div className="p-2 bg-[#ED4245]/20 rounded-lg text-[#ED4245] mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-[#F2F3F5]">Simulate AI Deepfake Call</div>
              <div className="text-[11px] text-[#949BA4] mt-0.5">
                Generates synthetic speech anomalies (MSE ~42.0). Triggers Truecaller alert.
              </div>
            </div>
          </button>
        </div>

        {/* Single Chunk Injectors */}
        <div className="pt-2 border-t border-[#3A3C41]">
          <span className="text-[11px] font-bold text-[#949BA4] uppercase block mb-2">
            Inject Single Spectral Window (4s Overlap):
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleInject('real', 'Human Chunk (MSE 25)')}
              className="py-2 px-1 bg-[#1E1F22] hover:bg-[#23A55A]/20 text-[#23A55A] border border-[#3A3C41] rounded-lg text-xs font-medium transition-colors text-center"
            >
              + Human Chunk
            </button>
            <button
              type="button"
              onClick={() => handleInject('fake', 'AI Spoof Chunk (MSE 42)')}
              className="py-2 px-1 bg-[#1E1F22] hover:bg-red-700/20 text-red-400 border border-[#3A3C41] rounded-lg text-xs font-medium transition-colors text-center"
            >
              + AI Spoof Chunk
            </button>
            <button
              type="button"
              onClick={() => handleInject('silence', 'Silence/Noise Chunk')}
              className="py-2 px-1 bg-[#1E1F22] hover:bg-[#35373C] text-[#949BA4] border border-[#3A3C41] rounded-lg text-xs font-medium transition-colors text-center"
            >
              + Silence / VAD
            </button>
          </div>
        </div>
      </div>

      {/* Technical Specifications & Calibration Note */}
      <div className="bg-[#2B2D31] border border-[#3A3C41] rounded-2xl p-4 shadow-lg space-y-2 text-xs text-[#949BA4]">
        <div className="flex items-center justify-between text-[#F2F3F5] font-bold">
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#5865F2]" />
            Architecture & Validation Pipeline
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] text-[#5865F2] hover:underline flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            Tune Parameters
          </button>
        </div>
        <p className="leading-relaxed">
          The BARA pipeline uses a 64-channel Gammatone filterbank running at 16kHz with 25ms Hanning windows and 10ms hops. Features are formatted into a <code className="text-[#F2F3F5] font-mono">1×64×128×1</code> spectrogram tensor and fed into a lightweight on-device Convolutional Autoencoder (CAE).
        </p>
        <p className="leading-relaxed">
          The 32.0 MSE cutoff is calibrated against the p97 percentile of authentic human speech. Deepfake speech synthesizers (FastSpeech, ElevenLabs, VALL-E) produce irregular acoustic harmonics resulting in reconstruction spikes that are captured within 2 consecutive windows.
        </p>
      </div>
    </div>
  );
};
