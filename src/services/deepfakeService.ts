import { ApiConstants } from '../constants';
import { DetectionState, DetectionVerdict } from '../types';
import { LiveAudioStreamProcessor, AcousticAnalysisMetrics } from './realAudioEngine';

export class DetectionWindowService {
  private windowSize = ApiConstants.baraConfig.windowSize;
  private fakeRatioThreshold = ApiConstants.baraConfig.fakeRatioThreshold;
  private minReliableVotes = ApiConstants.baraConfig.minReliableVotes;
  private requiredConsecutiveFakeWindows = ApiConstants.baraConfig.requiredConsecutiveFakeWindows;

  private recentChunks: (boolean | null)[] = [];
  private consecutiveFakeCount = 0;

  public addChunkResult(isFake: boolean, isReliable: boolean): {
    verdict: DetectionVerdict;
    fakeRatio: number;
    reliableVotes: number;
  } {
    this.recentChunks.push(isReliable ? isFake : null);
    if (this.recentChunks.length > this.windowSize) {
      this.recentChunks.shift();
    }

    const validVotes = this.recentChunks.filter((v): v is boolean => v !== null);
    const reliableVotes = validVotes.length;

    if (reliableVotes < this.minReliableVotes) {
      return { verdict: 'unknown', fakeRatio: 0, reliableVotes };
    }

    const fakeCount = validVotes.filter((v) => v === true).length;
    const fakeRatio = fakeCount / validVotes.length;

    if (fakeRatio > this.fakeRatioThreshold) {
      this.consecutiveFakeCount++;
      if (this.consecutiveFakeCount >= this.requiredConsecutiveFakeWindows) {
        return { verdict: 'fake', fakeRatio, reliableVotes };
      }
      return { verdict: 'real', fakeRatio, reliableVotes };
    } else {
      this.consecutiveFakeCount = 0;
      return { verdict: 'real', fakeRatio, reliableVotes };
    }
  }

  public reset(): void {
    this.recentChunks = [];
    this.consecutiveFakeCount = 0;
  }
}

export interface ChunkAnalysisResult {
  mse: number;
  isFake: boolean;
  isReliable: boolean;
  silenceRatio: number;
  rmsEnergy: number;
}

export class DeepfakeDetectionEngine {
  private windowService = new DetectionWindowService();
  private threshold = ApiConstants.baraConfig.threshold;
  private isMonitoring = false;
  private subscribers: ((state: DetectionState) => void)[] = [];
  
  private currentState: DetectionState = {
    verdict: 'unknown',
    lastMse: 0.0,
    threshold: ApiConstants.baraConfig.threshold,
    isSuspicious: false,
    silenceRatio: 0,
    isReliable: false,
    fakeRatio: 0,
    reliableVotesCount: 0,
  };

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private intervalId: number | null = null;
  private liveProcessor: LiveAudioStreamProcessor | null = null;

  public subscribe(callback: (state: DetectionState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.currentState);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify(): void {
    for (const sub of this.subscribers) {
      sub(this.currentState);
    }
  }

  public startMonitoring(): void {
    this.isMonitoring = true;
    this.windowService.reset();
    this.currentState = {
      verdict: 'unknown',
      lastMse: 0.0,
      threshold: this.threshold,
      isSuspicious: false,
      silenceRatio: 0,
      isReliable: false,
      fakeRatio: 0,
      reliableVotesCount: 0,
    };
    this.notify();
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.windowService.reset();
    if (this.liveProcessor) {
      this.liveProcessor.stop();
      this.liveProcessor = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
      this.analyser = null;
    }
    this.currentState = {
      verdict: 'unknown',
      lastMse: 0.0,
      threshold: this.threshold,
      isSuspicious: false,
      silenceRatio: 0,
      isReliable: false,
      fakeRatio: 0,
      reliableVotesCount: 0,
    };
    this.notify();
  }

  /**
   * Process a 4s chunk result (either from real Web Audio spectral extraction or simulation test)
   */
  public processChunk(result: ChunkAnalysisResult): void {
    if (!this.isMonitoring) return;

    const windowResult = this.windowService.addChunkResult(result.isFake, result.isReliable);

    this.currentState = {
      verdict: windowResult.verdict,
      lastMse: Number(result.mse.toFixed(2)),
      threshold: this.threshold,
      isSuspicious: windowResult.verdict === 'fake',
      silenceRatio: Number(result.silenceRatio.toFixed(2)),
      isReliable: result.isReliable,
      fakeRatio: Number(windowResult.fakeRatio.toFixed(2)),
      reliableVotesCount: windowResult.reliableVotes,
    };

    this.notify();
  }

  /**
   * Evaluates audio buffer energy and computes real-time BARA autoencoder reconstruction error
   */
  public evaluateAudioStream(mediaStream: MediaStream): void {
    try {
      if (this.liveProcessor) {
        this.liveProcessor.stop();
      }
      this.isMonitoring = true;
      this.liveProcessor = new LiveAudioStreamProcessor(mediaStream, (metrics) => {
        if (!this.isMonitoring) return;
        this.processChunk({
          mse: metrics.reconstructionMse,
          isFake: metrics.isFake,
          isReliable: metrics.isReliable,
          silenceRatio: metrics.silenceRatio,
          rmsEnergy: metrics.rmsEnergy,
        });
      });
      this.liveProcessor.start();
    } catch (e) {
      console.error('Failed to initialize audio stream analyzer:', e);
    }
  }

  private calculateSpectralCentroid(data: Uint8Array): number {
    let num = 0;
    let den = 0;
    for (let i = 0; i < data.length; i++) {
      num += i * data[i];
      den += data[i];
    }
    return den === 0 ? 0 : num / den;
  }

  /**
   * Helper for tests/demo: inject simulated chunk
   */
  public injectSampleChunk(type: 'real' | 'fake' | 'silence'): void {
    if (type === 'real') {
      const mse = 23.0 + Math.random() * 7.5; // range 23 - 30.5 (< 32.0)
      this.processChunk({
        mse,
        isFake: false,
        isReliable: true,
        silenceRatio: 0.15,
        rmsEnergy: 0.18,
      });
    } else if (type === 'fake') {
      const mse = 34.0 + Math.random() * 16.0; // range 34 - 50 (> 32.0)
      this.processChunk({
        mse,
        isFake: true,
        isReliable: true,
        silenceRatio: 0.10,
        rmsEnergy: 0.22,
      });
    } else {
      this.processChunk({
        mse: 18.0,
        isFake: false,
        isReliable: false, // Filtered out by VAD
        silenceRatio: 0.75,
        rmsEnergy: 0.002,
      });
    }
  }

  public getState(): DetectionState {
    return this.currentState;
  }
}

export const deepfakeService = new DeepfakeDetectionEngine();
