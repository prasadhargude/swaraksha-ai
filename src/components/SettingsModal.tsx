import React, { useState, useEffect } from 'react';
import { BaraSettings, UserModel } from '../types';
import { ApiConstants } from '../constants';
import { X, Volume2, VolumeX, Shield, Sliders, Server, User, LogOut, Check } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

interface SettingsModalProps {
  currentUser: UserModel;
  settings: BaraSettings;
  onUpdateSettings: (newSettings: BaraSettings) => void;
  onSignOut: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  settings,
  onUpdateSettings,
  onSignOut,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<BaraSettings>(settings);
  const [savedToast, setSavedToast] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const inputs = devices.filter((d) => d.kind === 'audioinput');
          setAudioDevices(inputs);
          if (inputs.length > 0) {
            setSelectedDevice(inputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    soundEffects.setSoundEnabled(localSettings.soundEnabled);
    localStorage.setItem('auth_custom_api_url', localSettings.customServerUrl);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleResetDefaults = () => {
    const defaults: BaraSettings = {
      threshold: ApiConstants.baraConfig.threshold,
      fakeRatioThreshold: ApiConstants.baraConfig.fakeRatioThreshold,
      windowSize: ApiConstants.baraConfig.windowSize,
      vadSilenceThreshold: ApiConstants.baraConfig.maxSilenceRatio,
      soundEnabled: true,
      autoInspectVoice: true,
      customServerUrl: ApiConstants.renderWsUrl,
    };
    setLocalSettings(defaults);
  };

  return (
    <div
      id="settings-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#2B2D31] border border-[#3A3C41] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3A3C41] bg-[#1E1F22] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#5865F2]" />
            <h3 className="font-bold text-base text-[#F2F3F5]">VoIP & Detection Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#949BA4] hover:text-[#F2F3F5] hover:bg-[#35373C] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#F2F3F5]">
          {/* User Account Info */}
          <div className="bg-[#1E1F22] p-3.5 rounded-xl border border-[#3A3C41] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#5865F2]/20 text-[#5865F2] rounded-lg">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-[#F2F3F5]">{currentUser.username}</div>
                <div className="text-[11px] text-[#949BA4] font-mono">ID: {currentUser.userId}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="px-2.5 py-1.5 bg-[#ED4245]/20 hover:bg-[#ED4245]/30 text-[#ED4245] rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          {/* Sound & Audio Tones */}
          <div className="bg-[#1E1F22] p-3.5 rounded-xl border border-[#3A3C41] space-y-3">
            <div className="font-bold text-[#F2F3F5] flex items-center gap-1.5">
              {localSettings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#23A55A]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#ED4245]" />
              )}
              Audio & Ringtones
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-[#949BA4]">
                Synthesized Ringtones & DTMF Dial Tones
              </span>
              <input
                type="checkbox"
                checked={localSettings.soundEnabled}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, soundEnabled: e.target.checked }))
                }
                className="w-4 h-4 accent-[#5865F2] cursor-pointer"
              />
            </label>

            {audioDevices.length > 0 && (
              <div>
                <label className="text-[11px] text-[#949BA4] block mb-1">Microphone Input</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#2B2D31] border border-[#3A3C41] rounded-lg text-xs text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* BARA AI Model Parameters */}
          <div className="bg-[#1E1F22] p-3.5 rounded-xl border border-[#3A3C41] space-y-3">
            <div className="font-bold text-[#F2F3F5] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#5865F2]" />
                BARA On-Device CAE Calibration
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[10px] text-[#5865F2] hover:underline"
              >
                Reset Defaults
              </button>
            </div>

            {/* Threshold Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#949BA4]">Reconstruction MSE Cutoff:</span>
                <span className="font-bold font-mono text-[#F2F3F5]">
                  {localSettings.threshold.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="45"
                step="0.5"
                value={localSettings.threshold}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    threshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-[#5865F2] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#949BA4] mt-0.5">
                <span>20.0 (Strict)</span>
                <span className="text-[#23A55A] font-semibold">32.0 (Real p97)</span>
                <span>45.0 (Lenient)</span>
              </div>
            </div>

            {/* Fake Ratio Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#949BA4]">Rolling Window Suspicion Threshold:</span>
                <span className="font-bold font-mono text-[#F2F3F5]">
                  {(localSettings.fakeRatioThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.6"
                step="0.05"
                value={localSettings.fakeRatioThreshold}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    fakeRatioThreshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-[#5865F2] cursor-pointer"
              />
            </div>
          </div>

          {/* Signaling Server URL */}
          <div className="bg-[#1E1F22] p-3.5 rounded-xl border border-[#3A3C41] space-y-2">
            <div className="font-bold text-[#F2F3F5] flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#5865F2]" />
              Signaling Backend Server
            </div>
            <input
              type="text"
              value={localSettings.customServerUrl}
              onChange={(e) =>
                setLocalSettings((prev) => ({ ...prev, customServerUrl: e.target.value }))
              }
              placeholder="wss://your-render-app.onrender.com"
              className="w-full px-3 py-2 bg-[#2B2D31] border border-[#3A3C41] rounded-lg text-xs text-[#F2F3F5] font-mono focus:outline-none focus:border-[#5865F2]"
            />
            <p className="text-[10px] text-[#949BA4]">
              Signaling facilitates WebRTC session handshakes and contact presence updates.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3A3C41] bg-[#1E1F22] flex items-center justify-between">
          <span className="text-xs text-[#23A55A] flex items-center gap-1">
            {savedToast && (
              <>
                <Check className="w-3.5 h-3.5" /> Saved changes!
              </>
            )}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#949BA4] hover:text-[#F2F3F5] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
