import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/services.dart';

class BaraFeatureExtractor {
  static const MethodChannel _controlChannel =
      MethodChannel('com.swaraksha.app/bara_feature_control');
  static const EventChannel _chunkChannel =
      EventChannel('com.swaraksha.app/bara_feature_chunks');

  StreamSubscription? _subscription;
  final _chunkStreamController = StreamController<Float32List>.broadcast();

  Stream<Float32List> get chunkStream => _chunkStreamController.stream;

  /// Attaches the native WebRTC AudioTrackInterceptor to the remote audio stream
  Future<void> attachToTrack() async {
    try {
      await _controlChannel.invokeMethod('attach');
      _subscription = _chunkChannel.receiveBroadcastStream().listen(
        (dynamic event) {
          if (event is List) {
            final floatList = Float32List.fromList(event.cast<double>());
            _chunkStreamController.add(floatList);
          } else if (event is Float32List) {
            _chunkStreamController.add(event);
          }
        },
        onError: (error) {
          _chunkStreamController.addError(error);
        },
      );
    } on PlatformException catch (e) {
      // Platform channels not supported in web/mock mode
      print('BaraFeatureExtractor platform error: ${e.message}');
    }
  }

  /// Detaches the native audio interceptor when the call terminates
  Future<void> detach() async {
    try {
      await _subscription?.cancel();
      _subscription = null;
      await _controlChannel.invokeMethod('detach');
    } catch (_) {}
  }

  void dispose() {
    detach();
    _chunkStreamController.close();
  }
}
