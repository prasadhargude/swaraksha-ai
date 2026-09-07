import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/detection_state.dart';
import '../providers/detection_provider.dart';
import 'widgets/audio_waveform_visualizer.dart';
import 'widgets/forensic_monitor_modal.dart';
import 'widgets/spoof_overlay_widget.dart';
import 'widgets/transcript_overlay_widget.dart';

class ActiveCallScreen extends ConsumerStatefulWidget {
  final String peerUsername;
  final bool isSimulatedSpoof;
  final VoidCallback onEndCall;

  const ActiveCallScreen({
    Key? key,
    required this.peerUsername,
    this.isSimulatedSpoof = false,
    required this.onEndCall,
  }) : super(key: key);

  @override
  ConsumerState<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends ConsumerState<ActiveCallScreen> {
  bool _isMuted = false;
  bool _isSpeaker = true;
  bool _showTranscripts = true;
  int _seconds = 0;
  Timer? _callTimer;

  @override
  void initState() {
    super.initState();
    // Start active call duration timer
    _callTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() => _seconds++);
      }
    });

    // Start BARA Deepfake monitoring and edge STT processing
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(detectionNotifierProvider.notifier).startMonitoring(
            isSimulatedSpoof: widget.isSimulatedSpoof,
          );
    });
  }

  @override
  void dispose() {
    _callTimer?.cancel();
    ref.read(detectionNotifierProvider.notifier).stopMonitoring();
    super.dispose();
  }

  void _handleHangUp() {
    final state = ref.read(detectionNotifierProvider);
    // Save record to call history
    final newRecord = CallRecord(
      id: 'call_${DateTime.now().millisecondsSinceEpoch}',
      callerName: widget.peerUsername,
      timestamp: DateTime.now(),
      duration: Duration(seconds: _seconds),
      verdict: state.verdict,
      peakMse: state.lastMse,
      avgMse: state.recentMses.isNotEmpty
          ? state.recentMses.reduce((a, b) => a + b) / state.recentMses.length
          : state.lastMse,
      fakeChunks: state.fakeChunksInWindow,
      transcript: state.transcripts,
    );

    ref.read(callHistoryProvider.notifier).update((list) => [newRecord, ...list]);
    widget.onEndCall();
  }

  void _openForensics(DetectionState state) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ForensicMonitorModal(state: state),
    );
  }

  String _formatTimer(int s) {
    final m = s ~/ 60;
    final sec = s % 60;
    return '${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final detectionState = ref.watch(detectionNotifierProvider);
    final isSpoofAlert = detectionState.verdict == DetectionVerdict.fake;

    return Scaffold(
      backgroundColor: const Color(0xFF121316),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        automaticallyImplyLeading: false,
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF1E2025),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSpoofAlert
                  ? const Color(0xFFED4245).withOpacity(0.5)
                  : const Color(0xFF2B2D31),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isSpoofAlert ? Icons.warning_rounded : Icons.lock_outline,
                size: 14,
                color: isSpoofAlert ? const Color(0xFFED4245) : const Color(0xFF23A55A),
              ),
              const SizedBox(width: 6),
              Text(
                isSpoofAlert
                    ? 'BARA ALERT: AI VOICE ANOMALY DETECTED'
                    : 'E2EE VoIP • 16kHz Protected • Edge AI',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSpoofAlert ? const Color(0xFFED4245) : const Color(0xFF949BA4),
                ),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.analytics_outlined, color: Color(0xFF7289DA)),
            tooltip: 'Forensics',
            onPressed: () => _openForensics(detectionState),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 1),

            // Caller Avatar with pulsing threat ring
            Stack(
              alignment: Alignment.center,
              children: [
                if (isSpoofAlert)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 500),
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFED4245).withOpacity(0.25),
                      border: Border.all(color: const Color(0xFFED4245), width: 2),
                    ),
                  ),
                CircleAvatar(
                  radius: 54,
                  backgroundColor: const Color(0xFF2B2D31),
                  child: Text(
                    widget.peerUsername.isNotEmpty
                        ? widget.peerUsername[0].toUpperCase()
                        : '?',
                    style: const TextStyle(fontSize: 42, color: Colors.white),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
            Text(
              widget.peerUsername,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _formatTimer(_seconds),
              style: TextStyle(
                color: isSpoofAlert ? const Color(0xFFED4245) : const Color(0xFF23A55A),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 14),

            // Live Audio Waveform Visualizer
            AudioWaveformVisualizer(
              isSpeaking: true,
              isFake: isSpoofAlert,
            ),

            const SizedBox(height: 20),

            // Truecaller-style Spoof Overlay Banner
            SpoofOverlayWidget(
              state: detectionState,
              onHangUp: _handleHangUp,
              onDetails: () => _openForensics(detectionState),
            ),

            const SizedBox(height: 16),

            // In-Device Live Transcription Widget
            TranscriptOverlayWidget(
              transcripts: detectionState.transcripts,
              isVisible: _showTranscripts,
              onToggle: () => setState(() => _showTranscripts = !_showTranscripts),
            ),

            const Spacer(flex: 2),

            // 6-Tile Mobile In-Call Action Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _CallActionBtn(
                    icon: _isMuted ? Icons.mic_off : Icons.mic,
                    label: _isMuted ? 'Unmute' : 'Mute',
                    isActive: _isMuted,
                    onTap: () => setState(() => _isMuted = !_isMuted),
                  ),
                  _CallActionBtn(
                    icon: Icons.subtitles_outlined,
                    label: _showTranscripts ? 'Hide STT' : 'Show STT',
                    isActive: _showTranscripts,
                    onTap: () => setState(() => _showTranscripts = !_showTranscripts),
                  ),
                  _CallActionBtn(
                    icon: _isSpeaker ? Icons.volume_up : Icons.volume_off,
                    label: 'Speaker',
                    isActive: _isSpeaker,
                    onTap: () => setState(() => _isSpeaker = !_isSpeaker),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // Circular Hang-Up Button
            GestureDetector(
              onTap: _handleHangUp,
              child: Container(
                width: 68,
                height: 68,
                decoration: const BoxDecoration(
                  color: Color(0xFFED4245),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x66ED4245),
                      blurRadius: 20,
                      offset: Offset(0, 6),
                    )
                  ],
                ),
                child: const Icon(Icons.call_end, color: Colors.white, size: 32),
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _CallActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _CallActionBtn({
    required this.icon,
    required this.label,
    this.isActive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTap: onTap,
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? Colors.white : const Color(0xFF1E2025),
              border: Border.all(color: const Color(0xFF2B2D31)),
            ),
            child: Icon(
              icon,
              color: isActive ? Colors.black : Colors.white,
              size: 24,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF949BA4)),
        ),
      ],
    );
  }
}
