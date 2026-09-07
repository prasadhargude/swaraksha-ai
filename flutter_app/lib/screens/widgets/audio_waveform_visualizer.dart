import 'dart:math';
import 'package:flutter/material.dart';

class AudioWaveformVisualizer extends StatefulWidget {
  final bool isSpeaking;
  final bool isFake;

  const AudioWaveformVisualizer({
    Key? key,
    required this.isSpeaking,
    required this.isFake,
  }) : super(key: key);

  @override
  State<AudioWaveformVisualizer> createState() => _AudioWaveformVisualizerState();
}

class _AudioWaveformVisualizerState extends State<AudioWaveformVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeColor = widget.isFake
        ? const Color(0xFFED4245)
        : const Color(0xFF23A55A);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(24, (index) {
            double height = 4.0;
            if (widget.isSpeaking) {
              final phase = (_controller.value * 2 * pi) + (index * 0.3);
              height = 8.0 + (sin(phase).abs() * 24.0);
            }

            return Container(
              width: 3,
              height: height,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: widget.isSpeaking
                    ? activeColor
                    : const Color(0xFF353942),
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        );
      },
    );
  }
}
