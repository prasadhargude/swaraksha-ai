import 'package:flutter/material.dart';
import '../../models/detection_state.dart';

class SpoofOverlayWidget extends StatelessWidget {
  final DetectionState state;
  final VoidCallback? onHangUp;
  final VoidCallback? onDetails;

  const SpoofOverlayWidget({
    Key? key,
    required this.state,
    this.onHangUp,
    this.onDetails,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (state.verdict == DetectionVerdict.clean || state.verdict == DetectionVerdict.unknown) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1E2025).withOpacity(0.9),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF2B2D31)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: Color(0xFF23A55A),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              state.verdict == DetectionVerdict.clean
                ? 'Human Voice Verified (MSE ${state.lastMse.toStringAsFixed(1)})'
                : 'BARA Guard: Calibrating audio...',
              style: const TextStyle(
                color: Color(0xFF949BA4),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      );
    }

    final isHighConfidence = state.verdict == DetectionVerdict.fake;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF2B1416),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFED4245).withOpacity(0.8),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFED4245).withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFED4245).withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  color: Color(0xFFED4245),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isHighConfidence
                          ? 'HIGH RISK: AI VOICE SPOOF DETECTED'
                          : 'POTENTIAL SYNTHETIC SPEECH',
                      style: const TextStyle(
                        color: Color(0xFFED4245),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Reconstruction MSE: ${state.lastMse.toStringAsFixed(1)} (Cutoff: ${state.threshold})',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (onDetails != null)
                TextButton(
                  onPressed: onDetails,
                  child: const Text(
                    'Forensics',
                    style: TextStyle(color: Color(0xFF7289DA), fontSize: 12),
                  ),
                ),
              if (onHangUp != null)
                ElevatedButton.icon(
                  onPressed: onHangUp,
                  icon: const Icon(Icons.call_end, size: 14),
                  label: const Text('Hang Up Now'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFED4245),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
            ],
          )
        ],
      ),
    );
  }
}
