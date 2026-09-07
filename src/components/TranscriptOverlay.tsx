import React, { useEffect, useRef } from 'react';
import { TranscriptSegment } from '../types';
import { Radio } from 'lucide-react';

interface TranscriptOverlayProps {
  segments: TranscriptSegment[];
}

export const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({ segments }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [segments]);

  if (segments.length === 0) {
    return null;
  }

  const combinedText = segments.map((s) => s.text).join(' ');

  return (
    <div
      id="transcript-overlay"
      className="mx-5 my-2 px-4 py-2.5 max-h-28 bg-[#2B2D31]/95 border border-[#3A3C41] rounded-[14px] shadow-lg backdrop-blur-sm flex flex-col transition-all duration-200"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Radio className="w-3.5 h-3.5 text-[#5865F2] animate-pulse" />
        <span className="text-[10px] font-bold tracking-[0.8px] text-[#949BA4] uppercase">
          Live Captions
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        className="overflow-y-auto text-sm leading-[1.3] text-[#F2F3F5] pr-1"
      >
        {combinedText}
      </div>
    </div>
  );
};
