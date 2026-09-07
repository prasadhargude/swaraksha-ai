enum DetectionVerdict {
  clean,
  suspicious,
  fake,
  unknown,
}

class ChunkResult {
  final double mse;
  final bool isFake;
  final DateTime timestamp;
  final List<double> channelEnergies;

  const ChunkResult({
    required this.mse,
    required this.isFake,
    required this.timestamp,
    this.channelEnergies = const [],
  });
}

class TranscriptEntry {
  final String id;
  final String text;
  final String speaker; // 'Caller' or 'Me'
  final DateTime timestamp;
  final bool isSuspicious;
  final List<String> flaggedKeywords;
  final double chunkMse;

  const TranscriptEntry({
    required this.id,
    required this.text,
    required this.speaker,
    required this.timestamp,
    this.isSuspicious = false,
    this.flaggedKeywords = const [],
    this.chunkMse = 0.0,
  });
}

class CallRecord {
  final String id;
  final String callerName;
  final DateTime timestamp;
  final Duration duration;
  final DetectionVerdict verdict;
  final double peakMse;
  final double avgMse;
  final int fakeChunks;
  final List<TranscriptEntry> transcript;

  const CallRecord({
    required this.id,
    required this.callerName,
    required this.timestamp,
    required this.duration,
    required this.verdict,
    required this.peakMse,
    required this.avgMse,
    required this.fakeChunks,
    this.transcript = const [],
  });
}

class DetectionState {
  final DetectionVerdict verdict;
  final double lastMse;
  final double threshold;
  final double fakeRatio;
  final int totalChunksProcessed;
  final int fakeChunksInWindow;
  final List<double> recentMses;
  final List<double> channelEnergies;
  final List<TranscriptEntry> transcripts;
  final bool isMonitoring;
  final bool isSttActive;
  final List<String> detectedKeywords;

  const DetectionState({
    this.verdict = DetectionVerdict.unknown,
    this.lastMse = 0.0,
    this.threshold = 32.0,
    this.fakeRatio = 0.0,
    this.totalChunksProcessed = 0,
    this.fakeChunksInWindow = 0,
    this.recentMses = const [],
    this.channelEnergies = const [],
    this.transcripts = const [],
    this.isMonitoring = false,
    this.isSttActive = true,
    this.detectedKeywords = const [],
  });

  DetectionState copyWith({
    DetectionVerdict? verdict,
    double? lastMse,
    double? threshold,
    double? fakeRatio,
    int? totalChunksProcessed,
    int? fakeChunksInWindow,
    List<double>? recentMses,
    List<double>? channelEnergies,
    List<TranscriptEntry>? transcripts,
    bool? isMonitoring,
    bool? isSttActive,
    List<String>? detectedKeywords,
  }) {
    return DetectionState(
      verdict: verdict ?? this.verdict,
      lastMse: lastMse ?? this.lastMse,
      threshold: threshold ?? this.threshold,
      fakeRatio: fakeRatio ?? this.fakeRatio,
      totalChunksProcessed: totalChunksProcessed ?? this.totalChunksProcessed,
      fakeChunksInWindow: fakeChunksInWindow ?? this.fakeChunksInWindow,
      recentMses: recentMses ?? this.recentMses,
      channelEnergies: channelEnergies ?? this.channelEnergies,
      transcripts: transcripts ?? this.transcripts,
      isMonitoring: isMonitoring ?? this.isMonitoring,
      isSttActive: isSttActive ?? this.isSttActive,
      detectedKeywords: detectedKeywords ?? this.detectedKeywords,
    );
  }
}
