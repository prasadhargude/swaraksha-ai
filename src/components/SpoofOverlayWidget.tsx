import React, { useEffect, useRef } from 'react';
import { DetectionState } from '../types';
import { AlertTriangle, CheckCircle2, ShieldAlert, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEffects } from '../services/soundEffects';

interface SpoofOverlayWidgetProps {
  detectionState: DetectionState;
  onOpenDetails?: () => void;
}

export const SpoofOverlayWidget: React.FC<SpoofOverlayWidgetProps> = ({
  detectionState,
  onOpenDetails,
}) => {
  const prevVerdictRef = useRef(detectionState.verdict);

  // Play warning alert tone if verdict flips to fake
  useEffect(() => {
    if (detectionState.verdict === 'fake' && prevVerdictRef.current !== 'fake') {
      soundEffects.playSpoofAlert();
    }
    prevVerdictRef.current = detectionState.verdict;
  }, [detectionState.verdict]);

  return (
    <div className="w-full px-4 my-2 select-none">
      <AnimatePresence mode="wait">
        {detectionState.verdict === 'fake' && (
          <motion.div
            key="fake-warning"
            id="spoof-overlay-warning"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={onOpenDetails}
            className="w-full bg-[#DA373C] hover:bg-[#C92F34] cursor-pointer rounded-xl p-3.5 text-white shadow-xl border-2 border-red-400/60 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                    ⚠️ CRITICAL: Suspected AI Voice Clone
                  </span>
                  <span className="text-[11px] font-mono bg-black/25 px-2 py-0.5 rounded text-white/90 font-semibold">
                    MSE {detectionState.lastMse.toFixed(1)} &gt; {detectionState.threshold.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-white/95 mt-1 font-medium leading-snug">
                  Reconstruction anomaly detected. Voice features match AI synthesis / cloned audio model.
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/90 pt-1.5 border-t border-white/20">
                  <span className="font-semibold text-yellow-200">
                    Caution: Do not verify OTPs or send funds.
                  </span>
                  <span className="flex items-center text-white/80 hover:text-white font-medium">
                    Inspect <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {detectionState.verdict === 'real' && (
          <motion.div
            key="real-verified"
            id="voice-verified-banner"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            onClick={onOpenDetails}
            className="w-full bg-[#23A55A]/15 hover:bg-[#23A55A]/25 cursor-pointer border border-[#23A55A]/40 rounded-xl px-3.5 py-2.5 text-[#F2F3F5] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#23A55A] flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#F2F3F5] leading-tight">
                  Voice Authenticated: Natural Human Speech
                </span>
                <span className="text-[11px] text-[#949BA4] leading-tight">
                  BARA CAE Reconstruction MSE: {detectionState.lastMse.toFixed(1)} (Safe &lt; 32.0)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#23A55A] font-medium">
              <span>Verified</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#23A55A]" />
            </div>
          </motion.div>
        )}

        {detectionState.verdict === 'unknown' && (
          <motion.div
            key="unknown-status"
            id="voice-analyzing-banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onOpenDetails}
            className="w-full bg-[#2B2D31]/80 hover:bg-[#35373C] cursor-pointer border border-[#3A3C41] rounded-xl px-3.5 py-2 text-[#949BA4] transition-all flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5865F2] animate-pulse flex-shrink-0" />
              <span>
                BARA Guard Active: {detectionState.reliableVotesCount || 0}/10 chunks analyzed...
              </span>
            </div>
            <span className="text-[11px] text-[#5865F2] font-medium flex items-center">
              Details <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
