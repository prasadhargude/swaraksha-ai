import 'package:flutter/material.dart';
import '../../models/detection_state.dart';

class TranscriptOverlayWidget extends StatelessWidget {
  final List<TranscriptEntry> transcripts;
  final bool isVisible;
  final VoidCallback onToggle;

  const TranscriptOverlayWidget({
    Key? key,
    required this.transcripts,
    required this.isVisible,
    required this.onToggle,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (!isVisible) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        child: OutlinedButton.icon(
          onPressed: onToggle,
          icon: const Icon(Icons.subtitles, size: 16, color: Color(0xFF7289DA)),
          label: const Text(
            'Show Live In-Device Transcripts',
            style: TextStyle(color: Color(0xFF7289DA), fontSize: 12),
          ),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Color(0xFF2B2D31)),
            backgroundColor: const Color(0xFF1E2025).withOpacity(0.8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      constraints: const BoxConstraints(maxHeight: 180),
      decoration: BoxDecoration(
        color: const Color(0xFF1E2025).withOpacity(0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF2B2D31)),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 4),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 8, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.record_voice_over, size: 14, color: Color(0xFF23A55A)),
                    SizedBox(width: 6),
                    Text(
                      'EDGE SPEECH-TO-TEXT & INTENT MONITOR',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                        color: Color(0xFF949BA4),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 16, color: Color(0xFF949BA4)),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: onToggle,
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFF2B2D31)),
          Expanded(
            child: transcripts.isEmpty
                ? const Center(
                    child: Text(
                      'Listening for speech frames on device...',
                      style: TextStyle(fontSize: 12, color: Color(0xFF949BA4), fontStyle: FontStyle.italic),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    reverse: true,
                    itemCount: transcripts.length,
                    itemBuilder: (context, idx) {
                      final item = transcripts[transcripts.length - 1 - idx];
                      final isScam = item.isSuspicious;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isScam
                              ? const Color(0xFF3B1E22)
                              : const Color(0xFF141619),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isScam
                                ? const Color(0xFFED4245).withOpacity(0.5)
                                : const Color(0xFF23A55A).withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  item.speaker,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isScam ? const Color(0xFFED4245) : const Color(0xFF23A55A),
                                  ),
                                ),
                                const Spacer(),
                                if (isScam)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFED4245),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'PHISHING / SCAM SUSPECTED',
                                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              item.text,
                              style: const TextStyle(fontSize: 12, color: Colors.white),
                            ),
                            if (item.flaggedKeywords.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Wrap(
                                spacing: 4,
                                children: item.flaggedKeywords.map((kw) {
                                  return Chip(
                                    label: Text('! $kw', style: const TextStyle(fontSize: 9, color: Colors.white)),
                                    backgroundColor: const Color(0xFFED4245).withOpacity(0.7),
                                    padding: EdgeInsets.zero,
                                    visualDensity: VisualDensity.compact,
                                  );
                                }).toList(),
                              ),
                            ]
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
