import React, { useEffect, useRef } from 'react';
import { TranscriptSegment } from '../types';
import { Radio, Mic, Volume2 } from 'lucide-react';

interface TranscriptOverlayProps {
  segments: TranscriptSegment[];
  callerName?: string;
  isListening?: boolean;
}

export const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({
  segments,
  callerName = 'Caller',
  isListening = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [segments]);

  const combinedText = segments.map((s) => s.text).join(' ');

  return (
    <div
      id="transcript-overlay"
      className="w-full px-3.5 py-2.5 max-h-32 bg-[#1A1C20]/95 border border-[#2B2D31] rounded-2xl shadow-xl backdrop-blur-md flex flex-col transition-all duration-200 text-left"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#2B2D31]/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#5865F2] animate-pulse" />
          <span className="text-[10px] font-extrabold tracking-wider text-[#949BA4] uppercase">
            Incoming Voice Captions (Caller)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Volume2 className="w-3 h-3 text-[#23A55A]" />
          <span className="text-[10px] font-semibold text-[#7289DA] bg-[#5865F2]/10 px-2 py-0.5 rounded-full border border-[#5865F2]/20 truncate max-w-[120px]">
            {callerName}
          </span>
        </div>
      </div>

      {/* Transcript content */}
      {segments.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-[#949BA4] italic text-xs">
          <Mic className="w-3.5 h-3.5 text-[#5865F2] animate-pulse shrink-0" />
          <span>
            {isListening
              ? `Listening for incoming speech from ${callerName}...`
              : 'Captions paused.'}
          </span>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto max-h-20 text-xs sm:text-sm leading-snug text-[#F2F3F5] pr-1 space-y-1"
        >
          <div className="font-normal text-[#E0E2E6]">
            <span className="text-[#5865F2] font-semibold mr-1.5">[{callerName}]:</span>
            {combinedText}
          </div>
        </div>
      )}
    </div>
  );
};

