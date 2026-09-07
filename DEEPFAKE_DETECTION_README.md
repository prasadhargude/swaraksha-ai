# On-Device AI Voice Deepfake Detection — Project Log

## 1. What we're building

A feature inside an existing Flutter calling app (LiveKit-based VoIP calls) that:
- Listens to the **remote caller's voice** during a live call
- Runs it through an already-trained AI model, entirely **on-device** (no backend/server)
- Every ~2 seconds, checks a rolling window of recent results
- Shows a **Truecaller-style warning overlay** in the call screen if it suspects the voice is AI-generated/deepfaked

The original version of this app used a deployed backend to do this detection. The goal of this whole effort was to move detection fully on-device.

---

## 2. The model itself

- Architecture: **"BARA"** — a Gammatone-filterbank feature extractor feeding a **Convolutional Autoencoder (CAE)** built in PyTorch (`bara_denoising_cae.pt`).
- **Not a classifier.** It's trained only on real human voices. It tries to reconstruct its input; if the reconstruction error is high, that means "this doesn't look like real speech" → flagged as FAKE.
- A threshold (97th percentile of reconstruction error on known-real audio, from `real_errors.npy`) decides the FAKE/REAL cutoff per chunk.
- Audio is processed in **4-second chunks with 50% overlap** (so a new chunk's result arrives roughly every 2 seconds).
- **New decision rule** (added during this project): instead of trusting a single chunk, keep the last **10 chunk results**; if more than **20%** of them are FAKE, the rolling verdict is FAKE.

### Feature extraction — Gammatone filterbank
- 64 channels, 25ms window, 10ms hop, 16kHz sample rate.
- Original Python pipeline used the `gammatone` package's `gtgram()` function.
- On-device, we approximate this with: **STFT (Fast Fourier Transform) → power spectrum → project onto a precomputed 64×257 gammatone-weighted filter matrix → log-compress.**
- This is a very close approximation of true gammatone filtering, not a byte-for-byte match. **This still needs to be validated** — compare one native-extracted chunk against the same audio's Python-extracted chunk before fully trusting on-device output.
- The filter matrix itself is exported once from Python (`export_gammatone_filterbank.py`, using the same `gammatone` package) and shipped as a binary asset (`gammatone_filterbank.bin`) that the app loads at runtime.
- Confirmed real numbers from export: filterbank shape `(64, 257)`, FFT size `512`.

### Model conversion pipeline (for mobile)
PyTorch doesn't run directly on phones efficiently, so:
```
PyTorch (.pt) → ONNX (.onnx) → TensorFlow SavedModel → TFLite (.tflite)
```
Tools used: `torch.onnx.export(..., dynamo=False)` (legacy exporter — more reliable for Conv2d/ConvTranspose2d), then `onnx2tf`, then `tf.lite.TFLiteConverter`.

**Status: converted, but not yet numerically verified as correct.**
- Dynamic-range quantized version: 53.7 KB, runs without crashing.
- INT8 calibrated version: 55.9 KB, runs without crashing (after fixing an input-shape mismatch that was causing a native crash — see Known Issues).
- **Problem found and not yet resolved:** when fed a real audio chunk, the TFLite model's output range is compressed/wrong compared to the original PyTorch model's output on the *same* input (PyTorch: -11.7 to -0.14; TFLite: -1.5 to -0.1). This means **the converted model may not be behaving identically to the original** — needs further investigation (see Known Issues below) before it can be trusted for real detection.

---

## 3. Getting the caller's raw audio (the native Android piece)

This was the hardest architectural problem. LiveKit (built on Google's WebRTC library) does not give Flutter/Dart code direct access to raw audio samples — it just plays the remote voice through the phone speaker automatically. To analyze that audio, we needed to intercept it at the native Android layer.

### What we tried first (abandoned)
Originally planned to patch/fork the `flutter_webrtc` plugin's source code to expose a way to grab a specific audio track and attach a custom "sink" to it (`AudioTrackSink`/`addSink`). A GitHub fork was created (`pruthviraj-cpu/flutter-webrtc`) for this purpose, and the `pubspec.yaml` was pointed at it.

**This was abandoned** once we found a better existing mechanism (below). The fork is no longer needed — `pubspec.yaml` should use the plain `flutter_webrtc: ^1.6.0` from pub.dev, not the git fork.

### What we actually used (current approach)
`flutter_webrtc`'s own source code already contains a class called **`AudioTrackInterceptor`** (in package `com.cloudwebrtc.webrtc.record`), originally built to support the plugin's own call-recording feature. It wraps Android's real audio output track and intercepts every `write()` call — meaning it captures the decoded voice audio right before it's played out the speaker.

There's also a helper, `WebRtcAudioTrackUtils.attachOutputCallback(callback, audioDeviceModule)`, that wires this interceptor into WebRTC's internal audio pipeline via reflection.

And critically, `FlutterWebRTCPlugin.java` (the plugin's main class) already exposes:
```java
public JavaAudioDeviceModule getAudioDeviceModule()
```
publicly, via a static singleton (`FlutterWebRTCPlugin.sharedSingleton`). **This meant no fork or patch was needed at all** — everything required is already public in the stock plugin.

### Native files written (new code, inside your app, same package as the plugin so it can see internals)
Located at: `android/app/src/main/java/com/cloudwebrtc/webrtc/bara/`

- **`BaraAudioTap.java`** — implements `SamplesReadyCallback`; receives raw PCM audio samples, resamples them, runs the gammatone extraction, and emits finished 4-second feature chunks.
- **`Resampler.java`** — simple linear-interpolation resampler (WebRTC typically outputs 48kHz; our model needs 16kHz).
- **`GammatoneExtractor.java`** — does the STFT + filterbank projection described above, using a manually-implemented radix-2 FFT (no external DSP library needed).
- **`GammatoneFilterbankAsset.java`** — loads the precomputed `gammatone_filterbank.bin` matrix from Flutter's asset bundle at runtime.

### Kotlin wiring
`android/app/src/main/kotlin/com/example/client/MainActivity.kt` — registers two channels for Flutter to talk to this native code:
- A `MethodChannel` (`com.yourapp/bara_feature_control`) with `attach`/`detach` methods — called when a call connects/ends.
- An `EventChannel` (`com.yourapp/bara_feature_chunks`) — streams finished feature chunks back to Dart as they're ready.

---

## 4. The Flutter/Dart side

### New files
- `lib/services/deepfake/bara_feature_extractor.dart` — Dart-side wrapper around the native channels above.
- `lib/services/deepfake/deepfake_model_service.dart` — loads the `.tflite` model, runs inference per chunk, compares reconstruction error against the threshold.
- `lib/services/deepfake/detection_window_service.dart` — implements the rolling 10-chunk / 20%-fake-ratio rule.
- `lib/providers/detection_provider.dart` — Riverpod provider exposing a live `bool` (suspicious or not) to the UI; loads the model once, listens to the chunk stream.
- `lib/screens/home/widgets/spoof_overlay_widget.dart` — the red warning banner widget.

### Edited existing files
- `lib/services/livekit_service.dart` — now takes a `BaraFeatureExtractor` in its constructor; calls `attachToTrack()` on the remote audio track once it subscribes (inside the `TrackSubscribedEvent` listener), and `detach()` when the call ends.
- `lib/providers/call_provider.dart` — `liveKitServiceProvider` now injects the extractor.
- `lib/screens/call/active_call_screen.dart` — calls `startMonitoring()`/`stopMonitoring()` on call connect/end, and renders `SpoofOverlayWidget()` in the call UI.

**Important correction made along the way:** the extractor must attach to the **remote peer's** audio track (the person calling), not the local microphone. An earlier draft of `pubspec.yaml` included a `record` package for local mic capture — this should NOT be wired into the detection pipeline, since it would analyze the wrong voice.

---

## 5. Where assets live

```
assets/
├── models/
│   └── bara_denoising_cae.tflite      ← converted from bara_denoising_cae.pt
├── gammatone_filterbank.bin            ← exported filter matrix
└── bara_config.json                    ← threshold value + SR/CHANNELS/etc. constants
```
Registered in `pubspec.yaml` under `flutter: assets:`.

---

## 6. Known issues / unfinished work (as of this writing)

1. **TFLite model output doesn't match PyTorch's output on the same real audio input** (see Section 2). This is the most important open item — until resolved, the model's FAKE/REAL judgments on-device can't be trusted to match what it was actually trained to do. Next diagnostic step in progress: comparing a float32-only (no quantization at all) TFLite conversion against PyTorch, to isolate whether the bug is in quantization or in the ONNX/TF graph conversion itself.

2. **`GammatoneExtractor`'s FFT-based approach is an approximation of the original Python `gtgram()`,** not a verified exact match. Needs a side-by-side comparison of one real chunk's output from both pipelines.

3. **Android build has been fighting a Gradle/AGP/Flutter version compatibility problem** for a large part of this session, unrelated to the app's actual code:
   - Started on AGP 9.1.0, which built successfully but Flutter's tooling couldn't locate the resulting APK ("Task has not declared any outputs despite executing actions" — likely due to AGP 9+'s new DSL output-declaration format not being read correctly by this Flutter version).
   - Tried lowering to AGP 8.7.0 — too old, Flutter demanded minimum 8.11.1.
   - Tried AGP 8.11.1 with a newer Gradle wrapper version (8.13) — hit a `ConnectException: Connection timed out` while Gradle tried to download that new wrapper distribution (network/firewall issue on the current WiFi).
   - Also hit a **Gradle daemon out-of-memory crash** (`-Xmx8G` heap requested on a 7GB RAM machine) — fixed by lowering to `-Xmx3G` in `android/gradle.properties`.
   - Tried `android.newDsl=false` flag — already present, didn't resolve it alone.
   - **Current plan in progress:** AGP `8.11.1` (Flutter's explicitly stated minimum) + existing cached Gradle `9.3.1` (to avoid another network download) + the lowered memory setting. Not yet confirmed working as of the last message in this conversation.

4. Two now-obsolete files should be deleted if still present: `AudioTapSink.kt` and `BaraFeaturePlugin.kt` (leftovers from the abandoned fork-based approach).

5. The `flutter_webrtc` git fork (`pruthviraj-cpu/flutter-webrtc`) is no longer needed. `pubspec.yaml` should reference the plain `flutter_webrtc: ^1.6.0` from pub.dev.

---

## 7. Suggested next steps, in order

1. **Get the Android build working** — resolve the AGP/Gradle/Flutter version compatibility issue once and for all (see Known Issue #3).
2. **Verify the TFLite model's correctness** against the original PyTorch model on real audio (Known Issue #1) — this blocks trusting any detection result.
3. **Verify the native gammatone approximation** against the Python reference implementation on the same audio (Known Issue #2).
4. Only after 2 and 3 are confirmed correct: test the full pipeline end-to-end on two real devices in an actual LiveKit call, and tune the rolling-window threshold (currently 10 chunks / 20%) based on real results.
