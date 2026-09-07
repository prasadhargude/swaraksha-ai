# Phase 2 platform setup (do this once, in your real `flutter create` project)

## Android — android/app/src/main/AndroidManifest.xml
Add inside <manifest>, above <application>:

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

If using ws:// (not wss://) against a local backend during dev, also add
android:usesCleartextTraffic="true" to the <application> tag, or add a
network_security_config allowing cleartext for your dev host — Android
blocks plaintext HTTP/WS by default on API 28+.

## iOS — ios/Runner/Info.plist
Add:

    <key>NSMicrophoneUsageDescription</key>
    <string>We need mic access so you can make voice calls.</string>

For local dev over ws:// (not wss://), also add an App Transport Security
exception for your dev host, e.g.:

    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>

(Tighten this to a specific NSExceptionDomains entry before shipping.)

## Minimum SDK
flutter_webrtc requires Android minSdkVersion 24+. Set this in
android/app/build.gradle under defaultConfig if it's currently lower.

## Phase 3 — audio capture for spoof detection
The `record` package (used by `audio_capture_service.dart`) reuses the same
RECORD_AUDIO / NSMicrophoneUsageDescription permissions already listed
above — no extra manifest entries needed.

Current design only taps the LOCAL mic on each client and streams it to
`/ws/audio-analysis/{user_id}/{call_id}` as raw PCM16 chunks (~100ms /
3200 bytes at 16kHz mono). It does NOT tap the remote party's decoded
audio — flutter_webrtc doesn't expose raw PCM frames from a
MediaStreamTrack in pure Dart. Two ways to get both sides analyzed:

1. **Both clients capture their own mic** (works today, zero extra infra):
   both callers stream their local audio under the same `call_id`; the
   backend correlates the two `user_id` streams per call and can flag
   either leg as spoofed/AI-generated independently.
2. **Move to a server-side SFU** (LiveKit / mediasoup) so the backend can
   tap both legs centrally, including audio that already passed through
   a device's speaker/mic loop — more robust, bigger infra lift. Revisit
   this if you need to analyze audio you don't control the sending
   client for.

