import 'dart:collection';
import '../../models/detection_state.dart';

class DetectionWindowService {
  static const int defaultWindowSize = 10;
  static const double fakeRatioThreshold = 0.20; // 20% rule

  final Queue<ChunkResult> _window = Queue<ChunkResult>();
  int _totalProcessed = 0;
  double _threshold = 32.0;

  double get threshold => _threshold;
  set threshold(double val) => _threshold = val;

  void reset() {
    _window.clear();
    _totalProcessed = 0;
  }

  DetectionState addResult(ChunkResult result, {
    List<TranscriptEntry> transcripts = const [],
    bool isSttActive = true,
    List<String> keywords = const [],
  }) {
    _totalProcessed++;
    _window.addLast(result);

    while (_window.length > defaultWindowSize) {
      _window.removeFirst();
    }

    final recentMses = _window.map((c) => c.mse).toList();
    final fakeCount = _window.where((c) => c.mse > _threshold).length;
    final fakeRatio = _window.isEmpty ? 0.0 : fakeCount / _window.length;

    DetectionVerdict verdict;
    if (_window.length < 3) {
      verdict = DetectionVerdict.unknown;
    } else if (fakeRatio >= fakeRatioThreshold) {
      verdict = fakeRatio >= 0.40 ? DetectionVerdict.fake : DetectionVerdict.suspicious;
    } else {
      verdict = DetectionVerdict.clean;
    }

    return DetectionState(
      verdict: verdict,
      lastMse: result.mse,
      threshold: _threshold,
      fakeRatio: fakeRatio,
      totalChunksProcessed: _totalProcessed,
      fakeChunksInWindow: fakeCount,
      recentMses: recentMses,
      channelEnergies: result.channelEnergies,
      transcripts: transcripts,
      isMonitoring: true,
      isSttActive: isSttActive,
      detectedKeywords: keywords,
    );
  }
}
