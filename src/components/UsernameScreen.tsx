import React, { useState } from 'react';
import { ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import { AndroidStatusBar } from './AndroidStatusBar';
import { AuthService } from '../services/authService';
import { UserModel } from '../types';
import { soundEffects } from '../services/soundEffects';

interface UsernameScreenProps {
  onUserRegistered: (user: UserModel) => void;
}

export const UsernameScreen: React.FC<UsernameScreenProps> = ({ onUserRegistered }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Peer username is required';
    if (trimmed.length < 3) return 'At least 3 characters';
    if (trimmed.length > 20) return 'At most 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return 'Letters, numbers, underscore only';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.vibrate(20);
    const validationError = validate(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const user = await AuthService.createUser(username.trim());
      onUserRegistered(user);
    } catch (err) {
      setError('Could not initialize peer session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="android-setup-screen"
      className="flex-1 w-full bg-[#121316] flex flex-col justify-between select-none overflow-hidden"
    >
      {/* 1. Android Status Bar */}
      <AndroidStatusBar />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-sm mx-auto w-full">
        {/* App Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#5865F2] to-[#7289DA] flex items-center justify-center text-white shadow-2xl">
            <ShieldCheck className="w-11 h-11" />
          </div>
          <span className="absolute -bottom-1 -right-1 p-1 bg-[#23A55A] rounded-full border-2 border-[#121316]">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#F2F3F5] text-center mb-1">
          Swaraksha VoIP Guard
        </h1>
        <p className="text-xs text-[#949BA4] text-center mb-6 max-w-xs leading-relaxed">
          On-device Convolutional Autoencoder (CAE) protects every incoming call against AI voice clones & deepfakes in real time.
        </p>

        {/* Android Material 3 Setup Form */}
        <form onSubmit={handleSubmit} className="w-full bg-[#1A1C22] p-5 rounded-3xl border border-[#2E313A] shadow-xl space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#F2F3F5] block mb-1.5">
              Enter VoIP Identity / Extension
            </label>
            <input
              id="username-input"
              type="text"
              autoFocus
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. rahul_tech"
              className="w-full px-4 py-3 bg-[#121316] text-sm text-[#F2F3F5] placeholder-[#949BA4] rounded-2xl border border-[#2E313A] focus:outline-none focus:border-[#5865F2] transition-colors"
            />
            {error && (
              <p className="mt-1.5 text-xs text-[#ED4245] font-medium">
                {error}
              </p>
            )}
          </div>

          <div className="p-3 bg-[#121316]/70 rounded-2xl border border-[#252830] text-[11px] text-[#949BA4] space-y-1">
            <div className="flex items-center gap-1.5 text-[#23A55A] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% On-Device Privacy</span>
            </div>
            <p>Audio is evaluated directly on this hardware with zero cloud transmission.</p>
          </div>

          <button
            id="username-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-semibold rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center text-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Activate & Enter App'
            )}
          </button>
        </form>
      </div>

      {/* 3. Android Navigation Gesture Bar */}
      <div className="pb-3 pt-2">
        <div className="w-32 h-1 bg-white/30 rounded-full mx-auto" />
      </div>
    </div>
  );
};
