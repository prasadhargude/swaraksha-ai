import React from 'react';
import { DetectionState } from '../types';
import { deepfakeService } from '../services/deepfakeService';
import { X, ShieldAlert, Cpu, Sparkles, Activity, Volume2, Info } from 'lucide-react';

interface ForensicMonitorModalProps {
  detectionState: DetectionState;
  onClose: () => void;
}

export const ForensicMonitorModal: React.FC<ForensicMonitorModalProps> = ({
  detectionState,
  onClose,
}) => {
  const isFake = detectionState.verdict === 'fake';
  const isReal = detectionState.verdict === 'real';

  // Calculate percentage of MSE relative to a 60 max scale
  const msePercentage = Math.min(100, Math.max(0, (detectionState.lastMse / 60) * 100));
  const thresholdPercentage = Math.min(100, Math.max(0, (detectionState.threshold / 60) * 100));

  return (
    <div
      id="forensic-monitor-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#2B2D31] border border-[#3A3C41] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3A3C41] bg-[#1E1F22] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isFake
                  ? 'bg-red-500/20 text-red-400'
                  : isReal
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#F2F3F5] leading-tight flex items-center gap-2">
                BARA On-Device Forensic Monitor
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isFake
                      ? 'bg-red-900/60 text-red-300 border border-red-700/50'
                      : isReal
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {detectionState.verdict}
                </span>
              </h3>
              <p className="text-xs text-[#949BA4] leading-tight mt-0.5">
                Gammatone Filterbank + Convolutional Autoencoder (CAE)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#949BA4] hover:text-[#F2F3F5] hover:bg-[#35373C] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Real-time Reconstruction MSE Meter */}
          <div className="bg-[#1E1F22] p-4 rounded-xl border border-[#3A3C41]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#949BA4] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#5865F2]" />
                Reconstruction Error (MSE)
              </span>
              <span className="text-xs font-mono font-bold text-[#F2F3F5]">
                {detectionState.lastMse.toFixed(2)}{' '}
                <span className="text-[#949BA4] font-normal">
                  / Cutoff {detectionState.threshold.toFixed(1)}
                </span>
              </span>
            </div>

            {/* Gauge Bar */}
            <div className="relative w-full h-4 bg-[#2B2D31] rounded-full overflow-hidden border border-[#3A3C41]">
              <div
                className={`h-full transition-all duration-300 ${
                  detectionState.lastMse > detectionState.threshold
                    ? 'bg-gradient-to-r from-orange-500 to-red-600'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${msePercentage}%` }}
              />
              {/* Threshold Marker Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_6px_#facc15] z-10"
                style={{ left: `${thresholdPercentage}%` }}
                title={`Threshold: ${detectionState.threshold}`}
              />
            </div>

            <div className="flex justify-between text-[10px] text-[#949BA4] mt-1.5 font-mono">
              <span>0.0 (Clean Human Speech)</span>
              <span className="text-yellow-400 font-semibold">
                ▲ Cutoff: {detectionState.threshold.toFixed(1)}
              </span>
              <span>60.0 (High Anomaly/AI)</span>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#1E1F22] p-3 rounded-xl border border-[#3A3C41] flex flex-col">
              <span className="text-[10px] font-bold text-[#949BA4] uppercase">Fake Ratio</span>
              <span
                className={`text-lg font-bold font-mono mt-1 ${
                  (detectionState.fakeRatio || 0) > 0.3 ? 'text-red-400' : 'text-[#F2F3F5]'
                }`}
              >
                {(((detectionState.fakeRatio || 0) * 100)).toFixed(0)}%
              </span>
              <span className="text-[10px] text-[#949BA4]">Limit &gt; 30%</span>
            </div>

            <div className="bg-[#1E1F22] p-3 rounded-xl border border-[#3A3C41] flex flex-col">
              <span className="text-[10px] font-bold text-[#949BA4] uppercase">Reliable Votes</span>
              <span className="text-lg font-bold font-mono mt-1 text-[#F2F3F5]">
                {detectionState.reliableVotesCount || 0} / 10
              </span>
              <span className="text-[10px] text-[#949BA4]">Min 5 for verdict</span>
            </div>

            <div className="bg-[#1E1F22] p-3 rounded-xl border border-[#3A3C41] flex flex-col">
              <span className="text-[10px] font-bold text-[#949BA4] uppercase">VAD Silence</span>
              <span className="text-lg font-bold font-mono mt-1 text-[#F2F3F5]">
                {(((detectionState.silenceRatio || 0) * 100)).toFixed(0)}%
              </span>
              <span className="text-[10px] text-[#949BA4]">Gated &gt; 50%</span>
            </div>

            <div className="bg-[#1E1F22] p-3 rounded-xl border border-[#3A3C41] flex flex-col">
              <span className="text-[10px] font-bold text-[#949BA4] uppercase">Chunk Status</span>
              <span
                className={`text-sm font-bold mt-1.5 truncate ${
                  detectionState.isReliable ? 'text-emerald-400' : 'text-[#FAA61A]'
                }`}
              >
                {detectionState.isReliable ? 'Reliable' : 'Skipped/Noise'}
              </span>
              <span className="text-[10px] text-[#949BA4]">4s 50% Overlap</span>
            </div>
          </div>

          {/* Test & Simulation Controls */}
          <div className="bg-[#1E1F22] p-4 rounded-xl border border-[#3A3C41]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#F2F3F5] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5865F2]" />
                Live Audio Simulation Generator
              </span>
              <span className="text-[11px] text-[#949BA4]">Inject test chunks</span>
            </div>
            <p className="text-xs text-[#949BA4] mb-3">
              Trigger simulated speech samples to verify BARA autoencoder anomaly detection:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => deepfakeService.injectSampleChunk('real')}
                className="px-3 py-2 bg-[#23A55A]/20 hover:bg-[#23A55A]/30 text-[#23A55A] rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-[#23A55A]/40"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Human Voice (MSE ~25)
              </button>
              <button
                type="button"
                onClick={() => deepfakeService.injectSampleChunk('fake')}
                className="px-3 py-2 bg-[#ED4245]/20 hover:bg-[#ED4245]/30 text-[#ED4245] rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-[#ED4245]/40"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Synthetic AI Clone (MSE ~42)
              </button>
              <button
                type="button"
                onClick={() => deepfakeService.injectSampleChunk('silence')}
                className="px-3 py-2 bg-[#2B2D31] hover:bg-[#35373C] text-[#949BA4] hover:text-[#F2F3F5] rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] border border-[#3A3C41]"
              >
                Silence / VAD Skip
              </button>
            </div>
          </div>

          {/* Model Architecture Deep-Dive */}
          <div className="bg-[#1E1F22]/70 p-3.5 rounded-xl border border-[#3A3C41] text-xs text-[#949BA4] space-y-1.5">
            <div className="font-semibold text-[#F2F3F5] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#5865F2]" />
              How BARA On-Device Detection Operates
            </div>
            <p className="leading-relaxed">
              BARA extracts a 64-channel Gammatone spectral filterbank from the remote caller’s voice stream and runs inference through an on-device Convolutional Autoencoder. Because the CAE was trained exclusively on natural human speech patterns, synthetic voice clones (ElevenLabs, Bark, VALL-E) produce high reconstruction Mean Squared Error (&gt;32.0), triggering instant fraud alerts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3A3C41] bg-[#1E1F22] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#35373C] hover:bg-[#3E4047] text-[#F2F3F5] text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
