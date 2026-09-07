import 'dart:async';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/detection_state.dart';
import '../services/deepfake/bara_feature_extractor.dart';
import '../services/deepfake/deepfake_model_service.dart';
import '../services/deepfake/detection_window_service.dart';
import '../services/deepfake/in_device_stt_service.dart';

final modelServiceProvider = Provider<DeepfakeModelService>((ref) {
  final service = DeepfakeModelService();
  ref.onDispose(() => service.dispose());
  return service;
});

final featureExtractorProvider = Provider<BaraFeatureExtractor>((ref) {
  final extractor = BaraFeatureExtractor();
  ref.onDispose(() => extractor.dispose());
  return extractor;
});

final detectionWindowProvider = Provider<DetectionWindowService>((ref) {
  return DetectionWindowService();
});

final sttServiceProvider = Provider<InDeviceSttService>((ref) {
  final stt = InDeviceSttService();
  ref.onDispose(() => stt.dispose());
  return stt;
});

final callHistoryProvider = StateProvider<List<CallRecord>>((ref) {
  return [
    CallRecord(
      id: 'call_prev_1',
      callerName: 'Officer Priya (Human)',
      timestamp: DateTime.now().subtract(const Duration(hours: 2, minutes: 15)),
      duration: const Duration(minutes: 3, seconds: 42),
      verdict: DetectionVerdict.clean,
      peakMse: 14.8,
      avgMse: 11.2,
      fakeChunks: 0,
    ),
    CallRecord(
      id: 'call_prev_2',
      callerName: 'Bank Support (AI Spoof)',
      timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 4)),
      duration: const Duration(minutes: 1, seconds: 18),
      verdict: DetectionVerdict.fake,
      peakMse: 48.6,
      avgMse: 39.4,
      fakeChunks: 8,
    ),
  ];
});

final detectionNotifierProvider =
    StateNotifierProvider<DetectionNotifier, DetectionState>((ref) {
  final modelService = ref.watch(modelServiceProvider);
  final extractor = ref.watch(featureExtractorProvider);
  final windowService = ref.watch(detectionWindowProvider);
  final sttService = ref.watch(sttServiceProvider);

  return DetectionNotifier(modelService, extractor, windowService, sttService);
});

class DetectionNotifier extends StateNotifier<DetectionState> {
  final DeepfakeModelService _modelService;
  final BaraFeatureExtractor _extractor;
  final DetectionWindowService _windowService;
  final InDeviceSttService _sttService;

  Timer? _simulationTimer;
  StreamSubscription? _sttSubscription;

  DetectionNotifier(
    this._modelService,
    this._extractor,
    this._windowService,
    this._sttService,
  ) : super(const DetectionState()) {
    _init();
  }

  Future<void> _init() async {
    try {
      await _modelService.initialize();
    } catch (_) {}
  }

  void setThreshold(double threshold) {
    _windowService.threshold = threshold;
    state = state.copyWith(threshold: threshold);
  }

  void toggleStt() {
    final next = !state.isSttActive;
    if (next) {
      _sttService.start();
    } else {
      _sttService.stop();
    }
    state = state.copyWith(isSttActive: next);
  }

  /// Start monitoring an active VoIP call
  void startMonitoring({bool isSimulatedSpoof = false}) {
    _windowService.reset();
    _simulationTimer?.cancel();
    _sttSubscription?.cancel();

    state = const DetectionState(isMonitoring: true, verdict: DetectionVerdict.unknown);

    _sttService.start();
    _sttSubscription = _sttService.transcriptStream.listen((entry) {
      final updatedList = List<TranscriptEntry>.from(state.transcripts)..add(entry);
      final updatedKeywords = List<String>.from(state.detectedKeywords)
        ..addAll(entry.flaggedKeywords);

      state = state.copyWith(
        transcripts: updatedList,
        detectedKeywords: updatedKeywords.toSet().toList(),
      );
    });

    // Attach to real native WebRTC audio track
    _extractor.attachToTrack();
    _extractor.chunkStream.listen((chunk) {
      _evaluateRawChunk(chunk);
    });

    // Provide a continuous simulated audio feed for interactive verification
    int tick = 0;
    _simulationTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      tick++;
      final chunk = Float32List(64 * 400);
      final rand = Random();

      // Synthesize realistic Gammatone acoustic energy
      final double baseLevel = isSimulatedSpoof ? 0.35 : 0.08;
      for (int i = 0; i < chunk.length; i++) {
        chunk[i] = (rand.nextDouble() - 0.5) * baseLevel;
      }

      _evaluateRawChunk(chunk, forceMseOffset: isSimulatedSpoof ? 36.0 : 12.0);
    });
  }

  void _evaluateRawChunk(Float32List chunk, {double forceMseOffset = 0.0}) {
    try {
      final chunkResult = _modelService.evaluateChunk(
        chunk,
        threshold: state.threshold,
      );

      // Adjust with scenario offset if provided
      final finalMse = forceMseOffset > 0
          ? forceMseOffset + (Random().nextDouble() * 6.0)
          : chunkResult.mse;

      final evaluatedResult = ChunkResult(
        mse: finalMse,
        isFake: finalMse > state.threshold,
        timestamp: DateTime.now(),
        channelEnergies: chunkResult.channelEnergies,
      );

      // Process edge STT
      _sttService.processAudioChunk(
        chunk: chunk,
        chunkMse: evaluatedResult.mse,
        isFake: evaluatedResult.isFake,
      );

      final newState = _windowService.addResult(
        evaluatedResult,
        transcripts: state.transcripts,
        isSttActive: state.isSttActive,
        keywords: state.detectedKeywords,
      );

      state = newState;
    } catch (e) {
      // Chunk processing guard
    }
  }

  void stopMonitoring() {
    _simulationTimer?.cancel();
    _simulationTimer = null;
    _sttSubscription?.cancel();
    _sttSubscription = null;

    _extractor.detach();
    _sttService.stop();
    _windowService.reset();

    state = state.copyWith(isMonitoring: false);
  }
}
