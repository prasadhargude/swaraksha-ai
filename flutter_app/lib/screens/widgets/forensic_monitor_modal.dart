import 'package:flutter/material.dart';
import '../../models/detection_state.dart';

class ForensicMonitorModal extends StatelessWidget {
  final DetectionState state;

  const ForensicMonitorModal({Key? key, required this.state}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF181A1D),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF353942),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.analytics_outlined, color: Color(0xFF5865F2)),
                    SizedBox(width: 8),
                    Text(
                      'BARA Acoustic Forensics',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF949BA4)),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Top Status Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2025),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF2B2D31)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'RECONSTRUCTION MSE',
                          style: TextStyle(fontSize: 10, color: Color(0xFF949BA4), fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          state.lastMse.toStringAsFixed(2),
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: state.lastMse > state.threshold
                                ? const Color(0xFFED4245)
                                : const Color(0xFF23A55A),
                          ),
                        ),
                        Text(
                          'Cutoff: ${state.threshold.toStringAsFixed(1)} (97th %ile)',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF949BA4)),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 48, color: const Color(0xFF2B2D31)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'WINDOW FAKE RATIO',
                          style: TextStyle(fontSize: 10, color: Color(0xFF949BA4), fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${(state.fakeRatio * 100).toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: state.fakeRatio >= 0.20
                                ? const Color(0xFFED4245)
                                : const Color(0xFF23A55A),
                          ),
                        ),
                        Text(
                          'Trigger rule: >= 20% in 10 chunks',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF949BA4)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // 64-Channel Gammatone Filterbank Visualization
            const Text(
              '64-CHANNEL GAMMATONE COCHLEAR FILTERBANK (16kHz)',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: Color(0xFF949BA4),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              height: 70,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2025),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF2B2D31)),
              ),
              child: state.channelEnergies.isEmpty
                  ? const Center(
                      child: Text(
                        'Awaiting audio frame packets...',
                        style: TextStyle(fontSize: 11, color: Color(0xFF949BA4)),
                      ),
                    )
                  : Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: state.channelEnergies.map((val) {
                        final h = (val.clamp(0.0, 1.0) * 48.0) + 4.0;
                        return Expanded(
                          child: Container(
                            height: h,
                            margin: const EdgeInsets.symmetric(horizontal: 0.5),
                            decoration: BoxDecoration(
                              color: state.lastMse > state.threshold
                                  ? const Color(0xFFED4245)
                                  : const Color(0xFF5865F2),
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),

            const SizedBox(height: 16),

            // Recent Chunks Timeline
            const Text(
              '10-CHUNK SLIDING WINDOW MSE PROFILE',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: Color(0xFF949BA4),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E2025),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF2B2D31)),
              ),
              child: state.recentMses.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: Text(
                          'No chunk data yet',
                          style: TextStyle(fontSize: 11, color: Color(0xFF949BA4)),
                        ),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: state.recentMses.map((mse) {
                        final isOver = mse > state.threshold;
                        return Column(
                          children: [
                            Container(
                              width: 22,
                              height: (mse.clamp(0.0, 60.0) / 60.0 * 50) + 8,
                              decoration: BoxDecoration(
                                color: isOver
                                    ? const Color(0xFFED4245)
                                    : const Color(0xFF23A55A),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              mse.toStringAsFixed(0),
                              style: TextStyle(
                                fontSize: 9,
                                color: isOver
                                    ? const Color(0xFFED4245)
                                    : const Color(0xFF949BA4),
                              ),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
            ),

            const SizedBox(height: 16),

            // Edge Architecture Details
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF141619),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF2B2D31)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'On-Device Execution Pipeline',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  SizedBox(height: 6),
                  Text(
                    '• Input: Decoded WebRTC 16kHz PCM (BaraAudioTap.java)\n'
                    '• Feature: 64-Channel Gammatone Filterbank [1, 64, 400, 1]\n'
                    '• Model: Denoising Convolutional Autoencoder (TFLite Int8/FP32)\n'
                    '• STT: Edge Speech Recognition & Scam Keyword Heuristics\n'
                    '• Latency: ~18ms on ARM Cortex-A7x (NNAPI acceleration)',
                    style: TextStyle(fontSize: 11, color: Color(0xFF949BA4), height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
