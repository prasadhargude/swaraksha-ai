import React, { useState, useEffect } from 'react';
import { Smartphone, Maximize2 } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children }) => {
  const [useDeviceMockup, setUseDeviceMockup] = useState<boolean>(false);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  useEffect(() => {
    const checkScreen = () => {
      const isNarrow = window.innerWidth <= 640;
      setIsMobileScreen(isNarrow);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // If on actual mobile device or user toggled full width
  if (isMobileScreen || !useDeviceMockup) {
    return (
      <div className="h-screen h-[100dvh] max-h-[100dvh] w-full bg-[#121316] text-[#F2F3F5] flex flex-col relative overflow-hidden">
        {/* Toggle button on desktop full-screen */}
        {!isMobileScreen && (
          <div className="absolute top-2 right-2 z-50">
            <button
              type="button"
              onClick={() => setUseDeviceMockup(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2D31]/90 hover:bg-[#35373C] text-xs text-[#949BA4] hover:text-[#F2F3F5] rounded-full border border-[#3A3C41] shadow-lg backdrop-blur-sm transition-all active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Show Phone Shell</span>
            </button>
          </div>
        )}
        <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>
    );
  }

  // Desktop viewport: Authentic Android Phone Chassis
  return (
    <div className="min-h-screen w-full bg-[#0D0E11] flex flex-col items-center justify-center p-3 sm:p-6 select-none relative overflow-hidden">
      {/* Top Banner Toolbar */}
      <div className="w-full max-w-md flex items-center justify-between mb-2 px-3 z-40 text-xs text-[#949BA4]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#23A55A] animate-pulse" />
          <span className="font-medium text-[#F2F3F5]">Android 14 (API 34) Mobile APK</span>
        </div>

        <button
          type="button"
          onClick={() => setUseDeviceMockup(false)}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#1E1F22] hover:bg-[#2B2D31] text-[#949BA4] hover:text-[#F2F3F5] rounded-full border border-[#2B2D31] transition-all text-[11px]"
          title="Toggle Full Screen Edge-to-Edge"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Full Width</span>
        </button>
      </div>

      {/* Android Device Mockup Shell */}
      <div className="relative w-full max-w-[412px] h-[870px] max-h-[96vh] rounded-[48px] bg-[#121316] p-[10px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[4px] border-[#2E3138] flex flex-col overflow-hidden">
        {/* Hardware side button accents (Power on right, Volume on left) */}
        <div className="absolute -left-[7px] top-[140px] w-[3px] h-[45px] bg-[#3E424B] rounded-l-sm" />
        <div className="absolute -left-[7px] top-[200px] w-[3px] h-[75px] bg-[#3E424B] rounded-l-sm" />
        <div className="absolute -right-[7px] top-[170px] w-[3px] h-[55px] bg-[#3E424B] rounded-r-sm" />

        {/* Screen Display Container with Rounded Corners */}
        <div className="relative w-full h-full rounded-[38px] bg-[#121316] overflow-hidden flex flex-col">
          {/* Top Camera Punch Hole & Earpiece */}
          <div className="absolute top-0 left-0 right-0 h-7 flex items-center justify-center z-40 pointer-events-none">
            {/* Camera cutout */}
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-[#2A2B2F] shadow-inner mt-1" />
          </div>

          {/* Actual Mobile App Inner View */}
          <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
