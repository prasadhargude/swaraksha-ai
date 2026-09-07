import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, Shield } from 'lucide-react';

interface AndroidStatusBarProps {
  isCalling?: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ isCalling }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="android-status-bar"
      className="w-full h-8 px-4 flex items-center justify-between text-[#F2F3F5] text-[11px] font-medium select-none bg-[#121316] z-30 shrink-0"
    >
      {/* Left: Clock and Notification Icons */}
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-tight">{timeStr || '10:45'}</span>
        {/* On-device Security Notification icon */}
        <div className="flex items-center gap-1 opacity-80" title="BARA AI Shield Armed">
          <Shield className="w-3 h-3 text-[#5865F2]" />
        </div>
        {isCalling && (
          <span className="w-2 h-2 rounded-full bg-[#23A55A] animate-pulse" title="VoIP Call Active" />
        )}
      </div>

      {/* Right: Network, VoLTE HD, Wi-Fi, Battery */}
      <div className="flex items-center gap-2 text-xs opacity-90">
        <span className="text-[9px] font-bold px-1 py-0.2 bg-[#2B2D31] text-[#949BA4] rounded border border-[#3A3C41]">
          VoLTE
        </span>
        <span className="text-[10px] font-bold text-[#F2F3F5]">5G</span>
        <Signal className="w-3.5 h-3.5 text-[#F2F3F5]" />
        <Wifi className="w-3.5 h-3.5 text-[#F2F3F5]" />
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-medium">94%</span>
          <Battery className="w-4 h-4 text-[#F2F3F5] fill-current" />
        </div>
      </div>
    </div>
  );
};
