import React, { useState } from 'react';
import { Phone, Delete, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';
import { UserModel } from '../types';

interface KeypadDialerProps {
  users: UserModel[];
  onStartCall: (user: UserModel) => void;
  onSimulateCall: (name: string, isFake?: boolean) => void;
}

const KEYPAD_BUTTONS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

export const KeypadDialer: React.FC<KeypadDialerProps> = ({
  users,
  onStartCall,
  onSimulateCall,
}) => {
  const [dialString, setDialString] = useState('');

  const handleKeyPress = (digit: string) => {
    soundEffects.vibrate(18);
    soundEffects.playDtmf(digit);
    setDialString((prev) => (prev.length < 24 ? prev + digit : prev));
  };

  const handleBackspace = () => {
    soundEffects.vibrate(15);
    setDialString((prev) => prev.slice(0, -1));
  };

  const handleCall = () => {
    soundEffects.vibrate(30);
    const trimmed = dialString.trim();
    if (!trimmed) return;

    // Check if dialString matches an existing online contact
    const matchingUser = users.find(
      (u) =>
        u.username.toLowerCase() === trimmed.toLowerCase() ||
        u.userId.toLowerCase() === trimmed.toLowerCase()
    );

    if (matchingUser) {
      onStartCall(matchingUser);
    } else {
      // Call as virtual extension / test peer
      const virtualUser: UserModel = {
        userId: 'ext-' + trimmed.replace(/[^a-zA-Z0-9]/g, ''),
        username: trimmed.startsWith('ext-') ? trimmed : `Peer #${trimmed}`,
        status: 'online',
      };
      onStartCall(virtualUser);
    }
  };

  return (
    <div id="keypad-dialer" className="w-full flex flex-col items-center py-4 px-4 select-none">
      {/* Number Display Screen */}
      <div className="w-full max-w-xs mb-5 flex items-center justify-between bg-[#1E1F22] px-4 py-3 rounded-xl border border-[#3A3C41]">
        <input
          type="text"
          value={dialString}
          onChange={(e) => setDialString(e.target.value)}
          placeholder="Enter username or number"
          className="w-full bg-transparent text-xl font-mono text-[#F2F3F5] tracking-wider text-center focus:outline-none placeholder:text-sm placeholder:font-sans placeholder:text-[#949BA4]"
        />
        {dialString && (
          <button
            type="button"
            onClick={handleBackspace}
            className="p-1.5 text-[#949BA4] hover:text-[#F2F3F5] rounded-md transition-colors"
          >
            <Delete className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 3x4 Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
        {KEYPAD_BUTTONS.map((item) => (
          <button
            key={item.digit}
            id={`keypad-btn-${item.digit === '*' ? 'star' : item.digit === '#' ? 'hash' : item.digit}`}
            type="button"
            onClick={() => handleKeyPress(item.digit)}
            className="h-16 rounded-2xl bg-[#2B2D31] hover:bg-[#35373C] active:bg-[#404249] text-[#F2F3F5] border border-[#3A3C41] flex flex-col items-center justify-center transition-all duration-100 shadow-sm active:scale-95"
          >
            <span className="text-2xl font-bold font-mono leading-none">{item.digit}</span>
            {item.letters && (
              <span className="text-[9px] font-bold text-[#949BA4] tracking-widest mt-1">
                {item.letters}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Call Action Button */}
      <button
        id="keypad-call-action-btn"
        type="button"
        disabled={!dialString}
        onClick={handleCall}
        className="w-16 h-16 rounded-full bg-[#23A55A] hover:bg-[#1E8E4D] disabled:opacity-40 disabled:hover:bg-[#23A55A] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all mb-6"
      >
        <Phone className="w-7 h-7 fill-current" />
      </button>

      {/* Instant Test Presets */}
      <div className="w-full max-w-xs pt-4 border-t border-[#3A3C41]/60">
        <div className="text-[11px] font-bold text-[#949BA4] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#5865F2]" />
          Instant VoIP Security Test Bench
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSimulateCall('Security Officer (Human)', false)}
            className="p-2.5 bg-[#2B2D31] hover:bg-[#35373C] text-left rounded-lg border border-[#3A3C41] text-xs transition-colors flex items-start gap-2"
          >
            <UserCheck className="w-4 h-4 text-[#23A55A] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#F2F3F5]">Real Caller</div>
              <div className="text-[10px] text-[#949BA4]">Verified Human voice</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSimulateCall('Bank Rep (AI Spoof)', true)}
            className="p-2.5 bg-[#2B2D31] hover:bg-[#35373C] text-left rounded-lg border border-[#3A3C41] text-xs transition-colors flex items-start gap-2"
          >
            <ShieldAlert className="w-4 h-4 text-[#ED4245] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#F2F3F5]">Deepfake Caller</div>
              <div className="text-[10px] text-[#949BA4]">Triggers Truecaller alert</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
