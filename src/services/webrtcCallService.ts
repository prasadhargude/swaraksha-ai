/**
 * Real WebRTC Peer-to-Peer VoIP Calling Service
 * 
 * Manages full bidirectional WebRTC audio calls:
 * - Real microphone capture with acoustic echo cancellation
 * - Real audio streaming between peers with RTCPeerConnection
 * - Remote audio playback via HTMLAudioElement
 * - Multi-transport signaling (WebSocket + BroadcastChannel for instant local/multi-tab peer testing)
 * - Remote audio routing to BARA Deepfake AI and Continuous Voice Fingerprinting
 */

import { webSocketService } from './websocketService';
import { RealAudioEngine } from './realAudioEngine';

export interface WebRtcCallCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: string) => void;
}

export class WebRtcCallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentCallId: string | null = null;
  private targetPeerId: string | null = null;
  private callbacks: WebRtcCallCallbacks = {};
  private clientId: string = 'cli_' + Math.random().toString(36).substring(2, 9);
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private remoteAudioSourceNode: MediaStreamAudioSourceNode | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('swaraksha_p2p_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      }
    } catch (_) {}
  }

  public setCallbacks(callbacks: WebRtcCallCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Acquire genuine microphone audio stream
   */
  public async getMicrophoneStream(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });

    this.localStream = stream;
    return stream;
  }

  /**
   * Initialize a new RTCPeerConnection
   */
  private createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.closePeerConnection();
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnection = pc;

    // Attach local audio tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId && this.targetPeerId) {
        this.sendSignal({
          type: 'ice_candidate',
          call_id: this.currentCallId,
          to_user_id: this.targetPeerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle incoming remote audio stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remote = event.streams[0];
        this.remoteStream = remote;
        this.playRemoteAudio(remote);
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(remote);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.callbacks.onConnectionStateChange && pc.connectionState) {
        this.callbacks.onConnectionStateChange(pc.connectionState);
      }
    };

    return pc;
  }

  /**
   * Play audio out loud so caller and receiver actually hear each other
   */
  private playRemoteAudio(stream: MediaStream): void {
    try {
      if (!this.remoteAudioElement || !document.body.contains(this.remoteAudioElement)) {
        this.remoteAudioElement = document.createElement('audio');
        this.remoteAudioElement.id = 'swaraksha_remote_audio_stream';
        this.remoteAudioElement.autoplay = true;
        (this.remoteAudioElement as any).playsInline = true;
        this.remoteAudioElement.style.position = 'fixed';
        this.remoteAudioElement.style.top = '-9999px';
        this.remoteAudioElement.style.opacity = '0';
        this.remoteAudioElement.style.pointerEvents = 'none';
        document.body.appendChild(this.remoteAudioElement);
      }

      this.remoteAudioElement.srcObject = stream;
      this.remoteAudioElement.muted = false;
      this.remoteAudioElement.volume = 1.0;

      const playPromise = this.remoteAudioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio autoPlay play prevented, will resume on user interaction:', err);
        });
      }

      // Also route directly through Web Audio API AudioContext destination
      const audioCtx = RealAudioEngine.getAudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      try {
        if (this.remoteAudioSourceNode) {
          try {
            this.remoteAudioSourceNode.disconnect();
          } catch (_) {}
        }
        this.remoteAudioSourceNode = audioCtx.createMediaStreamSource(stream);
        this.remoteAudioSourceNode.connect(audioCtx.destination);
      } catch (err) {
        // Can throw if already connected or context issue
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  /**
   * Caller initiates WebRTC call offer
   */
  public async createCallOffer(callId: string, toUserId: string, localStream: MediaStream): Promise<RTCSessionDescriptionInit> {
    this.currentCallId = callId;
    this.targetPeerId = toUserId;
    this.localStream = localStream;
    this.pendingIceCandidates = [];

    const pc = this.createPeerConnection();
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Callee accepts call offer and creates answer
   */
  public async handleReceivedOffer(
    callId: string,
    fromUserId: string,
    offerSdp: RTCSessionDescriptionInit,
    localStream: MediaStream
  ): Promise<RTCSessionDescriptionInit> {
    this.currentCallId = callId;
    this.targetPeerId = fromUserId;
    this.localStream = localStream;
    this.pendingIceCandidates = [];

    const pc = this.createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

    // Flush any early-arriving buffered ICE candidates
    await this.flushPendingIceCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return answer;
  }

  /**
   * Caller receives callee's answer
   */
  public async handleReceivedAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
    // Flush any early-arriving buffered ICE candidates
    await this.flushPendingIceCandidates();
  }

  /**
   * Handle ICE Candidate received from peer with buffering support
   */
  public async handleIceCandidate(candidateInit: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingIceCandidates.push(candidateInit);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingIceCandidates.length > 0) {
      const cand = this.pendingIceCandidates.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Error flushing buffered ICE candidate:', e);
        }
      }
    }
  }

  /**
   * Multi-transport signal dispatch (WebSocket + Local BroadcastChannel)
   */
  public sendSignal(message: Record<string, unknown>): void {
    // 1. Send to backend WebSocket
    webSocketService.send(message);

    // 2. Broadcast locally for multi-tab testing (tag with this tab's client ID)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          ...message,
          _broadcastClientId: this.clientId,
        });
      } catch (_) {}
    }
  }

  private handleBroadcastMessage(data: any): void {
    if (!data || !data.type) return;
    // Discard broadcasts originating from this exact client tab
    if (data._broadcastClientId && data._broadcastClientId === this.clientId) {
      return;
    }

    // Feed message into websocket service listener pipeline
    webSocketService.emitLocalSignal(data);
  }

  /**
   * Mute / Unmute microphone track
   */
  public setMute(isMuted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  /**
   * Toggle remote speaker output
   */
  public setSpeaker(isOn: boolean): void {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.volume = isOn ? 1.0 : 0.0;
    }
    if (this.remoteAudioSourceNode) {
      try {
        if (!isOn) {
          this.remoteAudioSourceNode.disconnect();
        } else {
          const audioCtx = RealAudioEngine.getAudioContext();
          this.remoteAudioSourceNode.connect(audioCtx.destination);
        }
      } catch (_) {}
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Clean up all media and connections on call termination
   */
  public closePeerConnection(): void {
    if (this.remoteAudioSourceNode) {
      try {
        this.remoteAudioSourceNode.disconnect();
      } catch (_) {}
      this.remoteAudioSourceNode = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
      if (this.remoteAudioElement.parentNode) {
        this.remoteAudioElement.parentNode.removeChild(this.remoteAudioElement);
      }
      this.remoteAudioElement = null;
    }

    if (this.peerConnection) {
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    this.currentCallId = null;
    this.targetPeerId = null;
    this.pendingIceCandidates = [];
  }
}

export const webrtcCallService = new WebRtcCallService();
