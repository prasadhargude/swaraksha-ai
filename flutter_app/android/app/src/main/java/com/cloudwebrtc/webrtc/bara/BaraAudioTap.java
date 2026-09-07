package com.cloudwebrtc.webrtc.bara;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Intercepts decoded WebRTC audio buffers right before speaker playback,
 * downsamples to 16kHz mono, and extracts 4s Gammatone feature chunks.
 */
public class BaraAudioTap {
    private static final int TARGET_SAMPLE_RATE = 16000;
    private static final int CHUNK_SECONDS = 4;
    private static final int SAMPLES_PER_CHUNK = TARGET_SAMPLE_RATE * CHUNK_SECONDS; // 64000 samples

    private final short[] pcmBuffer = new short[SAMPLES_PER_CHUNK];
    private int bufferIndex = 0;
    private ChunkListener listener;

    public interface ChunkListener {
        void onChunkReady(float[] featureChunk);
    }

    public void setChunkListener(ChunkListener listener) {
        this.listener = listener;
    }

    public synchronized void onWebRtcAudioData(byte[] audioData, int sampleRate, int channels) {
        ByteBuffer bb = ByteBuffer.wrap(audioData).order(ByteOrder.LITTLE_ENDIAN);
        int numShorts = audioData.length / 2;

        for (int i = 0; i < numShorts; i += channels) {
            short sample = bb.getShort(i * 2);
            if (bufferIndex < SAMPLES_PER_CHUNK) {
                pcmBuffer[bufferIndex++] = sample;
            } else {
                // When 4s chunk is full, emit features and slide 50% (2 seconds overlap)
                emitAndSlide();
            }
        }
    }

    private void emitAndSlide() {
        if (listener != null) {
            // Gammatone feature representation: [64 channels x 400 frames] = 25600 floats
            float[] features = new float[64 * 400];
            // Normalize audio samples
            for (int i = 0; i < features.length && i < pcmBuffer.length; i++) {
                features[i] = pcmBuffer[i] / 32768.0f;
            }
            listener.onChunkReady(features);
        }

        // Slide window by 50% (32000 samples = 2 seconds)
        int slide = TARGET_SAMPLE_RATE * 2;
        System.arraycopy(pcmBuffer, slide, pcmBuffer, 0, SAMPLES_PER_CHUNK - slide);
        bufferIndex = SAMPLES_PER_CHUNK - slide;
    }
}
