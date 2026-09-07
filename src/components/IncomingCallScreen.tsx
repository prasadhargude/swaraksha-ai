import React, { useState, useEffect } from 'react';
import { CallModel, TranscriptSegment } from '../types';
import { AppAvatar } from './AppAvatar';
import { TranscriptOverlay } from './TranscriptOverlay';
import { AndroidStatusBar } from './AndroidStatusBar';
import { TrustedContact } from '../types/speakerFingerprint';
import {
  Phone,
  PhoneOff,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  ChevronUp,
  Fingerprint,
} from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface IncomingCallScreenProps {
  call: CallModel;
  transcriptSegments: TranscriptSegment[];
  trustedContact?: TrustedContact;
  onAccept: () => Promise<void>;
  onReject: () => void;
}

export const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  call,
  transcriptSegments,
  trustedContact,
  onAccept,
  onReject,
}) => {
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMessageDrawer, setShowMessageDrawer] = useState(false);

  const isSimulatedDeepfake =
    call.peerUsername.toLowerCase().includes('spoof') ||
    call.peerUsername.toLowerCase().includes('fake');

  // Play incoming ringtone + haptic cadence
  useEffect(() => {
    soundEffects.startIncomingRingtone();
    soundEffects.vibrate([400, 300, 400, 300]);
    return () => {
      soundEffects.stopIncomingRingtone();
    };
  }, []);

  const handleAccept = async () => {
    soundEffects.vibrate(30);
    soundEffects.stopIncomingRingtone();
    setIsResponding(true);
    setError(null);
    try {
      await onAccept();
    } catch (err) {
      setError('Microphone access or VoIP channel failed.');
      setIsResponding(false);
    }
  };

  const handleReject = () => {
    soundEffects.vibrate(20);
    soundEffects.stopIncomingRingtone();
    soundEffects.playEndedTone();
    onReject();
  };

  const handleQuickMessage = () => {
    soundEffects.vibrate(20);
    soundEffects.stopIncomingRingtone();
    soundEffects.playEndedTone();
    onReject();
  };

  return (
    <div
      id="incoming-call-screen"
      className="absolute inset-0 z-50 bg-gradient-to-b from-[#18191E] via-[#121316] to-[#0A0B0D] flex flex-col justify-between items-center select-none animate-fadeIn overflow-hidden h-full max-h-full"
    >
      {/* 1. Android Status Bar */}
      <AndroidStatusBar isCalling={false} />

      {/* 2. Top Info Header */}
      <div className="pt-2 text-center px-4 w-full shrink-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1E2025] rounded-full text-[11px] font-semibold text-[#949BA4] border border-[#2B2D31]/80 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-[#23A55A] animate-ping" />
          <span>INCOMING VOIP CALL • HD AUDIO</span>
        </div>

        {/* Truecaller-style on-device floating verification banner */}
        <div className="w-full max-w-xs mx-auto p-2 bg-[#1A1C22]/90 border border-[#2F333E] rounded-xl shadow-lg backdrop-blur-md flex items-center gap-2.5 text-left">
          <div className="p-1.5 rounded-lg bg-[#5865F2]/20 text-[#5865F2] shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[#F2F3F5] leading-tight">
              BARA On-Device Shield
            </span>
            <span className="text-[10px] text-[#23A55A] font-medium leading-tight mt-0.5">
              Zero cloud audio leak • Neural scan armed
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Caller Information - Scrollable if screen is short */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain flex flex-col items-center max-w-sm px-4 py-2">
        {/* Caller Avatar with pulsing waves */}
        <div className="relative mb-3.5 mt-2 shrink-0">
          <div className="absolute -inset-4 rounded-full bg-[#5865F2]/15 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-[#5865F2]/25 animate-pulse" />
          <AppAvatar username={call.peerUsername} size={96} className="shadow-2xl relative z-10 border-2 border-[#3A3E48]" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[#F2F3F5] text-center mb-0.5 tracking-tight truncate max-w-xs shrink-0">
          {call.peerUsername}
        </h1>
        
        <p className="text-xs text-[#949BA4] flex items-center gap-1.5 shrink-0">
          <span>{trustedContact ? trustedContact.relationship : 'Mobile VoIP'}</span>
          <span>•</span>
          <span className="text-[#23A55A] font-medium">Secured Stream</span>
        </p>

        {/* Trusted Contact Voice Profile Armed Indicator */}
        {trustedContact?.speakerProfile && (
          <div className="mt-2 px-3 py-1 bg-[#23A55A]/15 border border-[#23A55A]/40 rounded-full text-[11px] text-[#23A55A] font-semibold flex items-center gap-1.5 shrink-0">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Voice Fingerprint Armed: Active Matching Ready</span>
          </div>
        )}

        {isSimulatedDeepfake && (
          <div className="mt-2.5 px-3 py-1.5 bg-red-950/70 border border-red-600/60 rounded-xl text-xs text-red-200 flex items-center gap-2 shadow-lg shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
            <span className="text-[11px] font-medium leading-tight">
              Test Trigger: Incoming stream carries synthetic AI speech anomalies.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-2.5 px-3 py-1.5 bg-[#ED4245]/20 border border-[#ED4245]/50 text-[#ED4245] rounded-xl text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Live caption preview */}
        <div className="w-full mt-3 max-h-20 overflow-hidden shrink-0">
          <TranscriptOverlay segments={transcriptSegments} />
        </div>
      </div>

      {/* 4. Android Call Actions: Fixed at bottom with safe padding */}
      <div className="w-full max-w-sm px-6 pb-5 pt-2 shrink-0 flex flex-col items-center gap-3 z-20 bg-gradient-to-t from-[#0A0B0D] via-[#0A0B0D]/95 to-transparent">
        {/* Quick Message Button */}
        <button
          type="button"
          onClick={() => setShowMessageDrawer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2025]/80 hover:bg-[#282B32] text-[#949BA4] hover:text-[#F2F3F5] rounded-full text-xs font-medium border border-[#2B2D31] transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Quick Reply with SMS</span>
        </button>

        {/* Answer / Decline Buttons with Android Halo */}
        <div className="w-full flex items-center justify-around pt-1">
          {/* DECLINE BUTTON */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="incoming-call-reject-btn"
              type="button"
              disabled={isResponding}
              onClick={handleReject}
              className="w-16 h-16 rounded-full bg-[#ED4245] hover:bg-[#D83A3D] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(237,66,69,0.35)] active:scale-95 transition-all"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7 fill-current" />
            </button>
            <span className="text-xs font-semibold text-[#949BA4]">Decline</span>
          </div>

          {/* ANSWER BUTTON */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              id="incoming-call-accept-btn"
              type="button"
              disabled={isResponding}
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#23A55A] hover:bg-[#1E8E4D] text-white flex items-center justify-center shadow-[0_8px_20px_rgba(35,165,90,0.4)] active:scale-95 transition-all relative"
              title="Answer Call"
            >
              <div className="absolute -inset-1.5 rounded-full border-2 border-[#23A55A]/50 animate-ping pointer-events-none" />
              {isResponding ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Phone className="w-7 h-7 fill-current" />
              )}
            </button>
            <span className="text-xs font-semibold text-[#23A55A] flex items-center gap-0.5">
              <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
              Answer
            </span>
          </div>
        </div>

        {/* Android Gesture Bar */}
        <div className="pt-2">
          <div className="w-32 h-1 bg-white/30 rounded-full mx-auto" />
        </div>
      </div>

      {/* Quick Message Bottom Drawer */}
      {showMessageDrawer && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-2 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#1E2025] rounded-3xl border-t border-[#3A3E48] p-4 shadow-2xl space-y-2 animate-slideUp">
            <div className="w-10 h-1 bg-[#4E525E] rounded-full mx-auto mb-2" />
            <span className="text-xs font-bold text-[#F2F3F5] block px-1">
              Decline and send quick message:
            </span>
            {[
              "Can't talk right now. What's up?",
              "I'll call you right back.",
              "In a meeting. Please text me.",
              "Sorry, can't answer right now.",
            ].map((msg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={handleQuickMessage}
                className="w-full text-left py-2.5 px-3 bg-[#141518] hover:bg-[#282B32] text-xs text-[#F2F3F5] rounded-xl transition-colors"
              >
                "{msg}"
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMessageDrawer(false)}
              className="w-full py-2 text-xs text-[#949BA4] hover:text-[#F2F3F5] mt-2 text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
