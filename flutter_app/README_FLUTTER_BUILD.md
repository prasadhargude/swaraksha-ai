# Swaraksha — Native Android Flutter Build Guide

This directory contains the **Flutter & Native Android** implementation of Swaraksha with on-device AI voice deepfake detection.

---

## 1. Why Flutter for Android APKs?

An Android APK cannot run raw `.tsx` files directly as native code. An APK requires compiled Dalvik/ART `.dex` bytecode and native ARM `.so` binaries. 

Flutter compiles Dart ahead-of-time (AOT) into `libapp.so`, enabling:
- Real-time on-device TensorFlow Lite (`tflite_flutter`) model inference
- Native WebRTC `AudioTrackInterceptor` capturing remote audio frames before phone speaker playback
- 0ms cloud latency deepfake detection during live phone calls

---

## 2. Directory Structure

```
flutter_app/
├── assets/
│   ├── models/bara_denoising_cae.tflite    # On-device CAE Deepfake model
│   ├── gammatone_filterbank.bin             # Precomputed filter matrix
│   └── bara_config.json                     # Threshold (32.0) & settings
├── lib/
│   ├── main.dart                            # Flutter app entry point
│   ├── models/
│   │   └── detection_state.dart             # Verdict & chunk metrics
│   ├── providers/
│   │   └── detection_provider.dart          # Riverpod state management
│   ├── screens/
│   │   ├── active_call_screen.dart          # Native in-call UI with BARA shield
│   │   ├── home_screen.dart                 # Recents, Contacts, Keypad
│   │   └── widgets/
│   │       └── spoof_overlay_widget.dart    # Floating Truecaller-style alert
│   └── services/
│       └── deepfake/
│           ├── bara_feature_extractor.dart  # Native EventChannel bridge
│           ├── deepfake_model_service.dart  # TFLite inference engine
│           └── detection_window_service.dart# 10-chunk rolling 20% window
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml              # Permissions (RECORD_AUDIO, etc.)
│       ├── kotlin/com/example/swaraksha/MainActivity.kt
│       └── java/com/cloudwebrtc/webrtc/bara/BaraAudioTap.java
└── pubspec.yaml                             # Dependencies
```

---

## 3. How to Build the Real Android APK

### Step 1: Export or Clone this Repository
In Google AI Studio, click the top-right menu (`...` or Settings) and choose **Export to GitHub** or **Download ZIP**.

### Step 2: Open Terminal in the `flutter_app` folder
```bash
cd flutter_app
```

### Step 3: Install Flutter Dependencies
```bash
flutter pub get
```

### Step 4: Run on your Android Phone or Emulator
Connect your Android device with USB debugging enabled:
```bash
flutter run
```

### Step 5: Build Standalone Release APK
```bash
flutter build apk --release
```

The compiled Android `.apk` will be output to:
```
flutter_app/build/app/outputs/flutter-apk/app-release.apk
```
You can now transfer and install this APK directly onto any Android smartphone.
