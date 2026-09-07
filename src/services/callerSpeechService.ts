/**
 * Real Caller Speech & Audio Synthesis Service
 * 
 * Ensures that whenever an incoming caller (simulated contact, scenario caller,
 * or AI tester) speaks during an active call, real, clear, and audible speech
 * is played directly out of the device speakers/headphones.
 * 
 * Features:
 * - Natural vocal speech synthesis via browser SpeechSynthesis API
 * - Synchronous Web Audio formant/tone engine routing directly to AudioContext.destination
 * - Real-time audio stream routing to Audio Analyser for live DSP and waveform visualization
 * - Instant cancellation on call hang up or mute
 */

import { RealAudioEngine } from './realAudioEngine';

export interface CallerSpeechOptions {
  pitch?: number; // 0.5 (deep) to 1.5 (high)
  rate?: number; // 0.8 (slow) to 1.4 (fast)
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onWord?: (word: string) => void;
}

export class CallerSpeechService {
  private isSpeaking = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  public get speaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Speaks caller text aloud through speakers and feeds into Web Audio graph
   */
  public async speakCallerText(text: string, options: CallerSpeechOptions = {}): Promise<void> {
    if (!text || !text.trim()) return;

    // Ensure audio context is unmuted and active
    const audioCtx = RealAudioEngine.getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }

    this.stop(); // Stop prior in-flight speech
    this.isSpeaking = true;

    if (options.onStart) options.onStart();

    // 1. Play vocal speech through window.speechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.lang = 'en-US';

      // Pick best natural voice available in browser
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word' && options.onWord) {
          const word = text.substring(event.charIndex, event.charIndex + (event.charLength || 5));
          options.onWord(word);
        }
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.stopAcousticTone();
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.stopAcousticTone();
        if (options.onEnd) options.onEnd();
      };

      // Speak aloud
      window.speechSynthesis.speak(utterance);
    }

    // 2. Concurrently generate acoustic carrier formant through Web Audio API
    // This guarantees speaker output and gives real frequency data to the visualizer & DSP analyser
    this.playAcousticCarrier(audioCtx, options.pitch ?? 1.0, text.length * 75);
  }

  /**
   * Generates realistic voice harmonics and formant resonance
   * routed to system speakers (audioCtx.destination) and analyser
   */
  private playAcousticCarrier(audioCtx: AudioContext, pitchMultiplier: number, durationMs: number): void {
    try {
      const baseFreq = 135 * pitchMultiplier; // Typical human vocal fundamental frequency

      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2.01, audioCtx.currentTime);

      // Formant filter (vocal tract resonance around 800Hz - 1800Hz)
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100 * pitchMultiplier, audioCtx.currentTime);
      filter.Q.setValueAtTime(3.5, audioCtx.currentTime);

      // Gentle gain so it supports speech synthesis naturally without overpowering
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0.03, audioCtx.currentTime + Math.max(0.2, durationMs / 1000 - 0.2));
      gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      // Connect to speakers so real audio plays
      gain.connect(audioCtx.destination);

      // Also create media stream destination if available for audio visualizer
      if (!this.mediaStreamDest) {
        try {
          this.mediaStreamDest = audioCtx.createMediaStreamDestination();
        } catch (_) {}
      }
      if (this.mediaStreamDest) {
        gain.connect(this.mediaStreamDest);
      }

      osc1.start();
      osc2.start();

      this.activeOscillators.push(osc1, osc2);
      this.activeGainNodes.push(gain);

      setTimeout(() => {
        this.cleanupOscillator(osc1, osc2, gain);
      }, durationMs);
    } catch (e) {
      console.warn('Carrier audio synthesis notice:', e);
    }
  }

  private cleanupOscillator(osc1: OscillatorNode, osc2: OscillatorNode, gain: GainNode): void {
    try {
      osc1.stop();
      osc2.stop();
      osc1.disconnect();
      osc2.disconnect();
      gain.disconnect();
    } catch (_) {}
    this.activeOscillators = this.activeOscillators.filter((o) => o !== osc1 && o !== osc2);
    this.activeGainNodes = this.activeGainNodes.filter((g) => g !== gain);
  }

  private stopAcousticTone(): void {
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    }
    for (const gain of this.activeGainNodes) {
      try {
        gain.disconnect();
      } catch (_) {}
    }
    this.activeOscillators = [];
    this.activeGainNodes = [];
  }

  public getAudioStream(): MediaStream | null {
    return this.mediaStreamDest ? this.mediaStreamDest.stream : null;
  }

  /**
   * Stop all caller speech immediately (on call hang up or mute)
   */
  public stop(): void {
    this.isSpeaking = false;
    this.currentUtterance = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    this.stopAcousticTone();
  }
}

export const callerSpeechService = new CallerSpeechService();
