// Web Audio API synthesized sound generator for VoIP calling & DTMF tones

class SoundEffectManager {
  private audioCtx: AudioContext | null = null;
  private ringbackOsc1: OscillatorNode | null = null;
  private ringbackOsc2: OscillatorNode | null = null;
  private ringbackGain: GainNode | null = null;
  private ringbackInterval: number | null = null;

  private incomingInterval: number | null = null;
  private soundEnabled = true;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Trigger Android haptic vibration if available on device
   */
  public vibrate(pattern: number | number[] = 20): void {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (_) {}
  }

  /**
   * Play standard North American ringback tone (440Hz + 480Hz) cadence: 2s ON, 4s OFF
   */
  public startOutgoingRingback(): void {
    if (!this.soundEnabled) return;
    this.stopOutgoingRingback();

    const playCycle = () => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.95);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.0);
        osc2.stop(now + 2.0);
      } catch (_) {}
    };

    playCycle();
    this.ringbackInterval = window.setInterval(playCycle, 5000);
  }

  public stopOutgoingRingback(): void {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringbackGain) {
      try {
        this.ringbackGain.disconnect();
      } catch (_) {}
      this.ringbackGain = null;
    }
  }

  /**
   * Play melodic incoming call chime cadence
   */
  public startIncomingRingtone(): void {
    if (!this.soundEnabled) return;
    this.stopIncomingRingtone();

    const notes = [
      { freq: 523.25, time: 0, dur: 0.18 }, // C5
      { freq: 659.25, time: 0.2, dur: 0.18 }, // E5
      { freq: 783.99, time: 0.4, dur: 0.25 }, // G5
      { freq: 1046.5, time: 0.7, dur: 0.4 },  // C6
    ];

    const playChime = () => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        notes.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.freq, now + note.time);

          gain.gain.setValueAtTime(0, now + note.time);
          gain.gain.linearRampToValueAtTime(0.12, now + note.time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + note.time);
          osc.stop(now + note.time + note.dur);
        });
      } catch (_) {}
    };

    playChime();
    this.incomingInterval = window.setInterval(playChime, 2800);
  }

  public stopIncomingRingtone(): void {
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
  }

  public playRingtone(): void {
    this.startIncomingRingtone();
  }

  public stopRingtone(): void {
    this.stopIncomingRingtone();
  }

  /**
   * Call connected chime (two rising cheerful beeps)
   */
  public playConnectedChime(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [587.33, 880.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.15);
      });
    } catch (_) {}
  }

  /**
   * Call ended tone (falling sad beeps)
   */
  public playEndedTone(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [480.0, 360.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.14;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch (_) {}
  }

  /**
   * Deepfake warning alarm (subtle urgent dual-frequency pulse)
   */
  public playSpoofAlert(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(400, now + 0.3);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (_) {}
  }

  /**
   * Standard DTMF tones
   */
  public playDtmf(key: string): void {
    if (!this.soundEnabled) return;

    const dtmfFreqs: Record<string, [number, number]> = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477],
    };

    const freqs = dtmfFreqs[key];
    if (!freqs) return;

    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(freqs[0], now);
      osc2.frequency.setValueAtTime(freqs[1], now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.16);
      osc2.stop(now + 0.16);
    } catch (_) {}
  }

  public stopAll(): void {
    this.stopOutgoingRingback();
    this.stopIncomingRingtone();
  }
}

export const soundEffects = new SoundEffectManager();
