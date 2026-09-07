import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformVisualizerProps {
  isActive: boolean;
  isFake?: boolean;
  rmsEnergy?: number;
  barCount?: number;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  isActive,
  isFake = false,
  rmsEnergy = 0.2,
  barCount = 24,
}) => {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 12)
  );
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setHeights(Array.from({ length: barCount }, () => 6));
      return;
    }

    let phase = 0;

    const animate = () => {
      phase += 0.12;
      const energyMultiplier = Math.max(0.2, Math.min(1.0, rmsEnergy * 3.5));

      setHeights((prev) =>
        prev.map((_, i) => {
          // Combination of standing waves + noise for realistic speech visualization
          const wave1 = Math.sin(phase + i * 0.4) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 1.3 - i * 0.3) * 0.5 + 0.5;
          const randomJitter = Math.random() * 0.3;
          const amplitude = (wave1 * 0.6 + wave2 * 0.4 + randomJitter) * energyMultiplier;
          // Scale between 8px and 52px
          return Math.round(8 + amplitude * 44);
        })
      );

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, rmsEnergy, barCount]);

  return (
    <div
      id="audio-waveform-visualizer"
      className="flex items-center justify-center gap-1 h-16 w-full max-w-xs px-2 py-1 select-none"
      aria-label="Voice waveform activity"
    >
      {heights.map((h, index) => (
        <div
          key={index}
          className={`w-1 rounded-full transition-all duration-75 ${
            isFake
              ? 'bg-[#ED4245] shadow-[0_0_8px_rgba(237,66,69,0.6)]'
              : isActive
              ? 'bg-[#5865F2] shadow-[0_0_6px_rgba(88,101,242,0.4)]'
              : 'bg-[#4E5058]'
          }`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
};
