package com.example.swaraksha

import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CONTROL_CHANNEL = "com.swaraksha.app/bara_feature_control"
    private val CHUNK_CHANNEL = "com.swaraksha.app/bara_feature_chunks"

    private var eventSink: EventChannel.EventSink? = null

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // MethodChannel for attach/detach lifecycle
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CONTROL_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "attach" -> {
                    // Attach BaraAudioTap to WebRTC output
                    result.success(true)
                }
                "detach" -> {
                    // Detach BaraAudioTap
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }

        // EventChannel to stream 4s spectrogram feature chunks to Dart
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, CHUNK_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    eventSink = events
                }

                override fun onCancel(arguments: Any?) {
                    eventSink = null
                }
            }
        )
    }
}
