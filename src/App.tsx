import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserModel,
  CallModel,
  DetectionState,
  TranscriptSegment,
  PresenceStatus,
  CallHistoryItem,
  BaraSettings,
} from './types';
import { AuthService } from './services/authService';
import { webSocketService } from './services/websocketService';
import { deepfakeService } from './services/deepfakeService';
import { soundEffects } from './services/soundEffects';
import { ApiConstants } from './constants';
import { UsernameScreen } from './components/UsernameScreen';
import { HomeScreen } from './components/HomeScreen';
import { IncomingCallScreen } from './components/IncomingCallScreen';
import { ActiveCallScreen } from './components/ActiveCallScreen';
import { AndroidFrame } from './components/AndroidFrame';
import { Loader2 } from 'lucide-react';
import {
  TrustedContact,
  DemoScenarioId,
  DemoScenario,
  ActiveVerificationState,
  SpeakerSegmentResult,
} from './types/speakerFingerprint';
import { TrustedContactsStore } from './services/trustedContactsStore';
import { DEMO_SCENARIOS } from './services/demoScenarios';
import {
  continuousSpeakerVerification,
  neuralVoiceAuthenticity,
  conversationNLP,
  activeVerificationEvaluator,
  multiSignalRiskEngine,
} from './services/speakerVerificationEngine';
import { webrtcCallService } from './services/webrtcCallService';
import { liveSpeechToText } from './services/liveSpeechToText';
import { RealAudioEngine } from './services/realAudioEngine';
import { callerSpeechService } from './services/callerSpeechService';

const DEFAULT_SETTINGS: BaraSettings = {
  threshold: ApiConstants.baraConfig.threshold,
  fakeRatioThreshold: ApiConstants.baraConfig.fakeRatioThreshold,
  windowSize: ApiConstants.baraConfig.windowSize,
  vadSilenceThreshold: ApiConstants.baraConfig.maxSilenceRatio,
  soundEnabled: true,
  autoInspectVoice: true,
  customServerUrl: ApiConstants.renderWsUrl,
};

export function App() {
  const [checkedSession, setCheckedSession] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserModel | null>(null);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Call state
  const [activeCall, setActiveCall] = useState<CallModel | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [snackBarMessage, setSnackBarMessage] = useState<string | null>(null);

  // Call History state
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('swaraksha_call_history');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  // Settings state
  const [settings, setSettings] = useState<BaraSettings>(() => {
    try {
      const stored = localStorage.getItem('swaraksha_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (_) {
      return DEFAULT_SETTINGS;
    }
  });

  // Trusted Contacts with Voice Fingerprints state
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>(() =>
    TrustedContactsStore.getContacts()
  );

  // Active Verification State for currently active call
  const [activeVerificationState, setActiveVerificationState] =
    useState<ActiveVerificationState | null>(null);

  const scenarioStepTimersRef = useRef<number[]>([]);
  const activeScenarioRef = useRef<DemoScenario | null>(null);

  // Deepfake detection state
  const [detectionState, setDetectionState] = useState<DetectionState>(deepfakeService.getState());

  const activeCallRef = useRef<CallModel | null>(null);
  activeCallRef.current = activeCall;

  const ringTimerRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const pendingOfferSdpRef = useRef<RTCSessionDescriptionInit | string | null>(null);
  const speakerVerificationTimerRef = useRef<number | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Set up WebRTC callbacks to route remote audio to deepfake evaluator & speaker verification
  useEffect(() => {
    webrtcCallService.setCallbacks({
      onRemoteStream: (remoteStream) => {
        remoteStreamRef.current = remoteStream;
        deepfakeService.evaluateAudioStream(remoteStream);
      },
      onError: (err) => {
        console.warn('WebRTC peer error:', err);
      },
    });
  }, []);

  // Continuous real-time Voice Fingerprint verification loop (checks against all enrolled contacts)
  useEffect(() => {
    if (!activeCall || activeCall.state !== 'connected') {
      if (speakerVerificationTimerRef.current) {
        clearInterval(speakerVerificationTimerRef.current);
        speakerVerificationTimerRef.current = null;
      }
      return;
    }

    const audioCtx = RealAudioEngine.getAudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    const timeDomainBuffer = new Float32Array(analyser.fftSize);

    // Prefer incoming remote stream from caller, fall back to local stream if testing on single device
    const activeStream =
      remoteStreamRef.current ||
      webrtcCallService.getRemoteStream() ||
      callerSpeechService.getAudioStream() ||
      localStreamRef.current;

    let sourceNode: MediaStreamAudioSourceNode | null = null;
    if (activeStream) {
      try {
        sourceNode = audioCtx.createMediaStreamSource(activeStream);
        sourceNode.connect(analyser);
      } catch (err) {
        console.warn('Speaker verification audio stream routing notice:', err);
      }
    }

    const segmentHistory: SpeakerSegmentResult[] = [];

    speakerVerificationTimerRef.current = window.setInterval(async () => {
      analyser.getFloatTimeDomainData(timeDomainBuffer);

      let sumSq = 0;
      for (let i = 0; i < timeDomainBuffer.length; i++) {
        sumSq += timeDomainBuffer[i] * timeDomainBuffer[i];
      }
      const rms = Math.sqrt(sumSq / timeDomainBuffer.length);

      // Only evaluate when vocal energy is detected
      if (rms < 0.008) return;

      const liveEmbedding = RealAudioEngine.extractAcousticEmbedding(
        timeDomainBuffer,
        audioCtx.sampleRate
      );

      // Verify against ALL enrolled contacts in directory!
      const result = await continuousSpeakerVerification.verifyAgainstAllEnrolled(
        liveEmbedding,
        trustedContacts,
        activeCall.peerUsername,
        segmentHistory
      );

      segmentHistory.push(result);
      if (segmentHistory.length > 10) segmentHistory.shift();

      // Find verification questions for matched or expected contact
      const relevantContact = trustedContacts.find(
        (c) =>
          (result.matchedContactId && c.id === result.matchedContactId) ||
          c.name.toLowerCase() === activeCall.peerUsername.toLowerCase() ||
          activeCall.peerUsername.toLowerCase().includes(c.name.toLowerCase())
      );

      setActiveVerificationState((prev) => ({
        isTriggered:
          prev?.isTriggered ||
          result.status === 'unknown' ||
          result.status === 'possibleMismatch',
        triggerReason:
          result.status !== 'match' ? result.statusLabel : prev?.triggerReason || '',
        question:
          prev?.question ||
          (relevantContact && relevantContact.verificationQuestions.length > 0
            ? relevantContact.verificationQuestions[0]
            : undefined),
        receiverAsked: prev?.receiverAsked || false,
        evaluationResult: prev?.evaluationResult,
        currentSegment: result,
      }));
    }, 1800);

    return () => {
      if (speakerVerificationTimerRef.current) {
        clearInterval(speakerVerificationTimerRef.current);
        speakerVerificationTimerRef.current = null;
      }
      if (sourceNode) {
        try {
          sourceNode.disconnect();
        } catch (_) {}
      }
    };
  }, [activeCall?.state, activeCall?.peerUserId, activeCall?.peerUsername, trustedContacts]);

  // Save history on change
  useEffect(() => {
    try {
      localStorage.setItem('swaraksha_call_history', JSON.stringify(callHistory));
    } catch (_) {}
  }, [callHistory]);

  // Save settings on change
  const handleUpdateSettings = (newSettings: BaraSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('swaraksha_settings', JSON.stringify(newSettings));
    } catch (_) {}
  };

  const handleClearHistory = () => {
    setCallHistory([]);
    try {
      localStorage.removeItem('swaraksha_call_history');
    } catch (_) {}
    showToast('Call history cleared.');
  };

  // Show temporary snackbar message
  const showToast = (msg: string) => {
    setSnackBarMessage(msg);
    setTimeout(() => {
      setSnackBarMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // 1. Session restoration
  useEffect(() => {
    AuthService.loadStoredUser()
      .then((stored) => {
        if (stored) {
          setCurrentUser(stored);
        }
      })
      .finally(() => {
        setCheckedSession(true);
      });
  }, []);

  // 2. Subscribe to BARA deepfake detection engine updates
  useEffect(() => {
    const unsubscribe = deepfakeService.subscribe((state) => {
      setDetectionState(state);
    });
    return unsubscribe;
  }, []);

  // 3. Connect WebSocket when user is known
  useEffect(() => {
    if (!currentUser) return;

    webSocketService.connect(currentUser.userId);

    const unsubConn = webSocketService.onConnectionChange((connected) => {
      setIsWsConnected(connected);
      if (!connected && activeCallRef.current?.state === 'connected') {
        setIsReconnecting(true);
      } else {
        setIsReconnecting(false);
      }
    });

    const unsubMsg = webSocketService.onMessage((msg) => {
      switch (msg.type) {
        case 'presence_update': {
          if (Array.isArray(msg.users)) {
            const parsed = msg.users.map((u) => ({
              userId: u.user_id,
              username: u.username,
              status: (u.status as PresenceStatus) || 'offline',
            }));
            setUsers(parsed);
          }
          break;
        }

        case 'user_online': {
          if (msg.user) {
            const u = msg.user;
            setUsers((prev) => {
              const exists = prev.some((x) => x.userId === u.user_id);
              if (exists) {
                return prev.map((x) => (x.userId === u.user_id ? { ...x, status: 'online' } : x));
              }
              return [...prev, { userId: u.user_id, username: u.username, status: 'online' }];
            });
          }
          break;
        }

        case 'user_offline': {
          if (msg.user_id) {
            const uid = msg.user_id;
            setUsers((prev) =>
              prev.map((x) => (x.userId === uid ? { ...x, status: 'offline' } : x))
            );
          }
          break;
        }

        case 'call_offer': {
          if (msg.to_user_id !== currentUser.userId) return;

          if (activeCallRef.current) {
            webSocketService.send({
              type: 'call_reject',
              call_id: msg.call_id,
              from_user_id: currentUser.userId,
              to_user_id: msg.from_user_id,
              reason: 'busy',
            });
            return;
          }

          pendingOfferSdpRef.current = msg.sdp || null;

          setActiveCall({
            callId: msg.call_id || 'call-' + Date.now(),
            peerUserId: msg.from_user_id || 'unknown',
            peerUsername: msg.from_username || 'Caller',
            state: 'ringingIncoming',
          });
          setTranscriptSegments([]);
          break;
        }

        case 'call_answer': {
          if (msg.to_user_id !== currentUser.userId) return;
          if (ringTimerRef.current) {
            clearTimeout(ringTimerRef.current);
            ringTimerRef.current = null;
          }

          if (msg.sdp) {
            webrtcCallService
              .handleReceivedAnswer(msg.sdp as RTCSessionDescriptionInit)
              .catch(console.warn);
          }

          if (activeCallRef.current) {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
            deepfakeService.startMonitoring();

            if (localStreamRef.current) {
              deepfakeService.evaluateAudioStream(localStreamRef.current);
            }

            // Start live STT captioning on caller microphone to stream to receiver
            liveSpeechToText.start((text, isFinal) => {
              webrtcCallService.sendSignal({
                type: 'live_transcript',
                call_id: activeCallRef.current?.callId,
                text,
                is_final: isFinal,
                from_user_id: currentUser?.userId,
                to_user_id: activeCallRef.current?.peerUserId,
              });

              // If testing on a single device where peer is a simulated/test user, local mic is the caller speech
              const isTest =
                activeCallRef.current?.peerUsername.toLowerCase().includes('tester') ||
                activeCallRef.current?.peerUserId.startsWith('tester');
              if (isTest) {
                const seg: TranscriptSegment = { text, isFinal, receivedAt: new Date() };
                setTranscriptSegments((prev) => {
                  if (prev.length > 0 && !prev[prev.length - 1].isFinal) {
                    return [...prev.slice(0, -1), seg];
                  }
                  return [...prev.slice(-19), seg];
                });
              }
            });
          }
          break;
        }

        case 'ice_candidate': {
          if (msg.to_user_id !== currentUser.userId) return;
          if (msg.candidate) {
            webrtcCallService.handleIceCandidate(msg.candidate).catch(console.warn);
          }
          break;
        }

        case 'call_reject':
        case 'call_end': {
          if (msg.to_user_id !== currentUser.userId) return;
          if (msg.reason === 'busy') {
            showToast(`${activeCallRef.current?.peerUsername || 'User'} is on another call.`);
          } else if (msg.reason === 'no_answer') {
            showToast(`${activeCallRef.current?.peerUsername || 'User'} did not answer.`);
          }
          endCallLocally('remote');
          break;
        }

        case 'live_transcript': {
          if (
            msg.to_user_id &&
            msg.to_user_id !== currentUser?.userId &&
            msg.to_user_id !== 'broadcast'
          ) {
            return;
          }
          if (msg.text && msg.text.trim()) {
            const newSegment: TranscriptSegment = {
              text: msg.text.trim(),
              isFinal: msg.is_final ?? false,
              receivedAt: new Date(),
            };
            setTranscriptSegments((prev) => {
              // Replace preceding interim segment if updating in-flight speech
              if (prev.length > 0 && !prev[prev.length - 1].isFinal) {
                return [...prev.slice(0, -1), newSegment];
              }
              return [...prev.slice(-19), newSegment];
            });
          }
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubConn();
      unsubMsg();
      webSocketService.disconnect();
    };
  }, [currentUser]);

  // Start outgoing call
  const handleStartCall = async (targetUser: UserModel) => {
    if (activeCall) {
      showToast('You are already on a call.');
      return;
    }

    try {
      // Acquire real microphone stream for bi-directional WebRTC
      const stream = await webrtcCallService.getMicrophoneStream();
      localStreamRef.current = stream;

      const callId = 'call-' + Math.random().toString(36).substring(2, 9);
      callStartTimeRef.current = Date.now();

      setActiveCall({
        callId,
        peerUserId: targetUser.userId,
        peerUsername: targetUser.username,
        state: 'ringingOutgoing',
      });
      setTranscriptSegments([]);

      // Create WebRTC Offer with local microphone audio
      const offer = await webrtcCallService.createCallOffer(callId, targetUser.userId, stream);

      webrtcCallService.sendSignal({
        type: 'call_offer',
        call_id: callId,
        from_user_id: currentUser?.userId,
        from_username: currentUser?.username,
        to_user_id: targetUser.userId,
        sdp: offer,
      });

      // 30s timeout matching Flutter _ringTimeout
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = window.setTimeout(() => {
        if (activeCallRef.current?.state === 'ringingOutgoing') {
          showToast(`${targetUser.username} did not answer.`);
          handleEndCall();
        }
      }, 30000);

      // Auto-connect standalone/demo call after 2 seconds for offline or tester contacts
      const isTesterPeer =
        targetUser.username.toLowerCase().includes('tester') ||
        targetUser.username.toLowerCase().includes('ai') ||
        targetUser.userId.includes('alex') ||
        targetUser.status === 'offline';

      if (isTesterPeer) {
        setTimeout(() => {
          if (
            activeCallRef.current?.callId === callId &&
            activeCallRef.current?.state === 'ringingOutgoing'
          ) {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
            soundEffects.stopAll();
            deepfakeService.startMonitoring();
            deepfakeService.evaluateAudioStream(stream);

            // Check if this contact has an enrolled voice fingerprint
            const enrolled = trustedContacts.find(
              (c) =>
                c.name.toLowerCase() === targetUser.username.toLowerCase() ||
                targetUser.username.toLowerCase().includes(c.name.toLowerCase())
            );

            // Contact actually speaks aloud through device speakers!
            const greeting = enrolled
              ? `Hey! I see your call. Glad you reached out. My voice fingerprint should be verified on your screen.`
              : `Hello! I see your call. My audio stream is connected.`;

            callerSpeechService.speakCallerText(greeting, {
              pitch: 0.95,
              rate: 1.0,
              onStart: () => {
                setTranscriptSegments([
                  {
                    text: `${targetUser.username}: "${greeting}"`,
                    isFinal: true,
                    receivedAt: new Date(),
                  },
                ]);
              },
            });

            const hasSim = !!enrolled;
            const segment: SpeakerSegmentResult = {
              segmentId: 'seg-start-' + Date.now(),
              timestamp: Date.now(),
              similarityScore: hasSim ? 0.94 : 0.2,
              hasSimilarity: hasSim,
              status: hasSim ? 'match' : 'unknown',
              statusLabel: hasSim
                ? `Voice verified: Matches enrolled fingerprint for ${enrolled.name}${enrolled.relationship ? ` (${enrolled.relationship})` : ''}`
                : 'No voice similarity: Caller does not match any enrolled fingerprint',
              speakerChanged: false,
              activeSpeakerLabel: targetUser.username,
              embeddingSnapshot: [],
              matchedContactName: hasSim ? enrolled.name : undefined,
              matchedRelationship: hasSim ? enrolled.relationship : undefined,
            };

            setActiveVerificationState({
              isTriggered: false,
              triggerReason: '',
              question: enrolled?.verificationQuestions[0],
              receiverAsked: false,
              currentSegment: segment,
            });
          }
        }, 1800);
      }
    } catch (err) {
      console.error('Call initiation error:', err);
      showToast('Could not access microphone. Please grant mic permission.');
    }
  };

  // Callee accepts incoming call
  const handleAcceptCall = async () => {
    if (!activeCall) return;

    soundEffects.stopRingtone();
    callStartTimeRef.current = Date.now();

    const audioCtx = RealAudioEngine.getAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }

    // If an incoming scenario was simulated, begin caller spoken conversation
    if (activeScenarioRef.current) {
      setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
      deepfakeService.startMonitoring();
      startScenarioExecution(activeScenarioRef.current);
      return;
    }

    try {
      const stream = await webrtcCallService.getMicrophoneStream();
      localStreamRef.current = stream;

      let answerSdp: RTCSessionDescriptionInit | null = null;
      if (pendingOfferSdpRef.current) {
        answerSdp = await webrtcCallService.handleReceivedOffer(
          activeCall.callId,
          activeCall.peerUserId,
          pendingOfferSdpRef.current as RTCSessionDescriptionInit,
          stream
        );
      }

      webrtcCallService.sendSignal({
        type: 'call_answer',
        call_id: activeCall.callId,
        from_user_id: currentUser?.userId,
        to_user_id: activeCall.peerUserId,
        sdp: answerSdp,
      });

      setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
      deepfakeService.startMonitoring();
      deepfakeService.evaluateAudioStream(stream);

      // Start live STT captioning on callee microphone to send across to caller
      liveSpeechToText.start((text, isFinal) => {
        webrtcCallService.sendSignal({
          type: 'live_transcript',
          call_id: activeCall.callId,
          text,
          is_final: isFinal,
          from_user_id: currentUser?.userId,
          to_user_id: activeCall.peerUserId,
        });
      });
    } catch (err) {
      console.error('Accept call error:', err);
      showToast('Microphone error during call answer.');
    }
  };

  // Callee rejects incoming call
  const handleRejectCall = () => {
    if (!activeCall) return;

    webrtcCallService.sendSignal({
      type: 'call_reject',
      call_id: activeCall.callId,
      from_user_id: currentUser?.userId,
      to_user_id: activeCall.peerUserId,
    });

    endCallLocally('rejected');
  };

  // End active call locally and notify peer
  const handleEndCall = () => {
    if (activeCall) {
      webrtcCallService.sendSignal({
        type: 'call_end',
        call_id: activeCall.callId,
        from_user_id: currentUser?.userId,
        to_user_id: activeCall.peerUserId,
      });
    }
    endCallLocally('ended');
  };

  const endCallLocally = (reason: 'ended' | 'rejected' | 'remote' = 'ended') => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (speakerVerificationTimerRef.current) {
      clearInterval(speakerVerificationTimerRef.current);
      speakerVerificationTimerRef.current = null;
    }

    liveSpeechToText.stop();
    webrtcCallService.closePeerConnection();
    deepfakeService.stopMonitoring();
    pendingOfferSdpRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    soundEffects.stopAll();

    // Log call into Call History
    if (activeCall) {
      const durationSec = callStartTimeRef.current
        ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
        : 0;

      const direction =
        activeCall.state === 'ringingIncoming' && reason === 'rejected'
          ? 'missed'
          : activeCall.state === 'ringingIncoming'
          ? 'incoming'
          : 'outgoing';

      const historyItem: CallHistoryItem = {
        id: 'hist-' + Date.now(),
        peerUserId: activeCall.peerUserId,
        peerUsername: activeCall.peerUsername,
        direction,
        timestamp: Date.now(),
        durationSec,
        verdict: detectionState.verdict,
        peakMse: detectionState.lastMse,
      };

      setCallHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
    }

    // Clear any scenario simulation timers & speech synthesis
    callerSpeechService.stop();
    activeScenarioRef.current = null;
    scenarioStepTimersRef.current.forEach((t) => window.clearTimeout(t));
    scenarioStepTimersRef.current = [];

    setActiveCall(null);
    setTranscriptSegments([]);
    setActiveVerificationState(null);
    setIsReconnecting(false);
    callStartTimeRef.current = null;
  };

  // Toggle Mute
  const handleToggleMute = (muted: boolean) => {
    webrtcCallService.setMute(muted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  };

  // Trigger active verification question
  const handleTriggerActiveVerification = useCallback(() => {
    if (!activeCall) return;

    // Find contact
    const contact = trustedContacts.find(
      (c) =>
        c.name.toLowerCase() === activeCall.peerUsername.toLowerCase() ||
        activeCall.peerUsername.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!contact || contact.verificationQuestions.length === 0) {
      showToast('No pre-approved verification questions available for this contact.');
      return;
    }

    const question = contact.verificationQuestions[0];
    setActiveVerificationState((prev) => ({
      isTriggered: true,
      triggerReason: 'User initiated security verification',
      question,
      receiverAsked: true,
      userPromptedAt: Date.now(),
      evaluationResult: 'PENDING',
      currentSegment: prev?.currentSegment || null,
    }));
    soundEffects.playSpoofAlert();
  }, [activeCall, trustedContacts]);

  // Evaluate answered active verification question
  const handleEvaluateActiveAnswer = useCallback(
    async (answerText: string) => {
      if (!activeVerificationState?.question) return;

      const evalResult = await activeVerificationEvaluator.evaluateAnswer(
        activeVerificationState.question.answerHash,
        answerText
      );

      setActiveVerificationState((prev) =>
        prev
          ? {
              ...prev,
              callerResponseText: answerText,
              evaluationResult: evalResult,
              completedAt: Date.now(),
            }
          : null
      );

      if (evalResult === 'CORRECT') {
        showToast('Active Verification PASSED: Voice & shared secret match!');
      } else {
        showToast('Active Verification FAILED: Secret answer did not match!');
        soundEffects.playSpoofAlert();
      }
    },
    [activeVerificationState]
  );

  // Refresh trusted contacts from store
  const handleRefreshTrustedContacts = useCallback(() => {
    setTrustedContacts(TrustedContactsStore.getContacts());
  }, []);

  // Progressive execution of scenario conversation once call is accepted and connected
  const startScenarioExecution = (scenario: DemoScenario) => {
    scenarioStepTimersRef.current.forEach((t) => window.clearTimeout(t));
    scenarioStepTimersRef.current = [];

    const contact =
      trustedContacts.find(
        (c) => c.name.toLowerCase() === scenario.contactName.toLowerCase()
      ) ||
      TrustedContactsStore.getContacts().find(
        (c) => c.name.toLowerCase() === scenario.contactName.toLowerCase()
      );

    let accumulatedDelay = 600;

    scenario.transcriptSteps.forEach((step, idx) => {
      const timer = window.setTimeout(() => {
        if (!activeCallRef.current || activeCallRef.current.state !== 'connected') {
          return;
        }

        // Persona vocal characteristics
        let pitch = 1.0;
        let rate = 1.0;
        if (step.speaker.toLowerCase().includes('cloned') || step.syntheticScore >= 0.8) {
          pitch = 0.84;
          rate = 0.94;
        } else if (step.speaker.toLowerCase().includes('unknown')) {
          pitch = 1.22;
          rate = 1.05;
        } else if (scenario.relationship.toLowerCase().includes('brother')) {
          pitch = 0.95;
          rate = 1.0;
        }

        // Caller speaks the dialogue aloud through the device audio pipeline!
        if (step.text) {
          callerSpeechService.speakCallerText(step.text, {
            pitch,
            rate,
            onStart: () => {
              // Incoming voice STT generates transcript segment
              setTranscriptSegments((prev) => [
                ...prev,
                {
                  text: `${step.speaker}: "${step.text}"`,
                  isFinal: true,
                  receivedAt: new Date(),
                },
              ]);
            },
          });
        }

        // Speaker verification: detect if there is similarity with ANY enrolled fingerprint
        const isMatch = step.status === 'match';
        const isMismatch = step.status === 'possibleMismatch';

        let statusLabel = '';
        if (isMatch) {
          statusLabel = `Voice similarity verified: Matches enrolled fingerprint for ${scenario.contactName}${
            scenario.relationship ? ` (${scenario.relationship})` : ''
          }`;
        } else if (isMismatch) {
          statusLabel = `Voice divergence: Caller voice does not match enrolled profile for ${scenario.contactName}`;
        } else {
          statusLabel = `No voice similarity: Caller does not match any enrolled fingerprint`;
        }

        const segment: SpeakerSegmentResult = {
          segmentId: `seg-${idx}-${Date.now()}`,
          timestamp: Date.now(),
          similarityScore: step.similarity,
          hasSimilarity: isMatch,
          status: step.status,
          statusLabel,
          speakerChanged: step.speakerChanged || false,
          activeSpeakerLabel: step.speaker,
          embeddingSnapshot: [],
          matchedContactName: isMatch ? scenario.contactName : undefined,
          matchedRelationship: isMatch ? scenario.relationship : undefined,
        };

        // BARA neural acoustic classifier
        if (step.syntheticScore >= 0.7) {
          setDetectionState((prev) => ({
            ...prev,
            verdict: 'fake',
            anomalyScore: step.syntheticScore,
            lastMse: 0.082,
            realConfidence: 1 - step.syntheticScore,
          }));
        } else {
          setDetectionState((prev) => ({
            ...prev,
            verdict: 'real',
            anomalyScore: step.syntheticScore,
            lastMse: 0.008,
            realConfidence: 1 - step.syntheticScore,
          }));
        }

        // Active verification state
        setActiveVerificationState((prev) => {
          const isTriggered = prev?.isTriggered || step.triggerVerification || false;
          const question =
            prev?.question ||
            (contact && contact.verificationQuestions.length > 0
              ? contact.verificationQuestions[0]
              : undefined);

          let evalRes: 'CORRECT' | 'INCORRECT' | 'UNCERTAIN' | 'PENDING' | undefined =
            prev?.evaluationResult;

          if (step.simulatedCallerResponse) {
            evalRes = step.simulatedCallerAnswerCorrect ? 'CORRECT' : 'INCORRECT';

            // Caller actually speaks answer response aloud
            window.setTimeout(() => {
              if (
                activeCallRef.current?.state === 'connected' &&
                step.simulatedCallerResponse
              ) {
                callerSpeechService.speakCallerText(step.simulatedCallerResponse, {
                  pitch,
                  rate,
                  onStart: () => {
                    setTranscriptSegments((p) => [
                      ...p,
                      {
                        text: `${step.speaker}: "${step.simulatedCallerResponse}"`,
                        isFinal: true,
                        receivedAt: new Date(),
                      },
                    ]);
                  },
                });
              }
            }, 1200);
          } else if (step.triggerVerification && !evalRes) {
            evalRes = 'PENDING';
          }

          return {
            isTriggered,
            triggerReason: step.triggerVerification
              ? `High financial urgency & conversation risk detected (${step.domain || 'Financial'})`
              : prev?.triggerReason || '',
            question,
            receiverAsked: prev?.receiverAsked || step.triggerVerification || false,
            callerResponseText: step.simulatedCallerResponse || prev?.callerResponseText,
            evaluationResult: evalRes,
            currentSegment: segment,
          };
        });

        if (step.triggerVerification) {
          soundEffects.playSpoofAlert();
        }
      }, accumulatedDelay);

      scenarioStepTimersRef.current.push(timer);
      const estimatedSpeechDuration = Math.max(2800, (step.text?.length || 30) * 65);
      accumulatedDelay += step.delayMs + estimatedSpeechDuration;
    });
  };

  // Simulate a Scenario incoming call
  const handleSimulateScenario = useCallback(
    (scenarioId: DemoScenarioId) => {
      // Clear any prior speech or timers
      callerSpeechService.stop();
      scenarioStepTimersRef.current.forEach((t) => window.clearTimeout(t));
      scenarioStepTimersRef.current = [];

      const scenario = DEMO_SCENARIOS[scenarioId];
      if (!scenario) return;

      activeScenarioRef.current = scenario;

      const contact =
        trustedContacts.find(
          (c) => c.name.toLowerCase() === scenario.contactName.toLowerCase()
        ) ||
        TrustedContactsStore.getContacts().find(
          (c) => c.name.toLowerCase() === scenario.contactName.toLowerCase()
        ) ||
        TrustedContactsStore.getContacts()[0];

      const testCallId = 'scen-' + Date.now();

      // Ring incoming call
      setActiveCall({
        callId: testCallId,
        peerUserId: contact ? contact.id : 'contact_amit',
        peerUsername: scenario.contactName,
        state: 'ringingIncoming',
      });

      // Play real ringtone sound
      soundEffects.playRingtone();

      // Initial pending banner
      setTranscriptSegments([
        {
          text: `Incoming call from ${scenario.contactName} (${scenario.relationship})...`,
          isFinal: false,
          receivedAt: new Date(),
        },
      ]);

      // Reset verification state until call is answered
      setActiveVerificationState(null);
    },
    [trustedContacts]
  );

  // Simulate an incoming call for testing purposes
  const handleSimulateIncomingCall = (
    callerName = 'Dr. Vikram (VoIP Test)',
    isFake = false
  ) => {
    if (activeCall) return;
    const testCallId = 'sim-' + Date.now();
    setActiveCall({
      callId: testCallId,
      peerUserId: 'sim-caller-01',
      peerUsername: callerName,
      state: 'ringingIncoming',
    });

    setTranscriptSegments([
      {
        text: isFake
          ? 'Urgent bank alert: We require immediate voice biometric confirmation to stop unauthorized wire transfer.'
          : 'Hello! Calling to follow up on the cybersecurity architecture review meeting.',
        isFinal: false,
        receivedAt: new Date(),
      },
    ]);
  };

  // Add custom contact
  const handleAddCustomContact = (name: string, status: PresenceStatus) => {
    const newUid = 'user-' + Math.random().toString(36).substring(2, 8);
    setUsers((prev) => [...prev, { userId: newUid, username: name, status }]);
    showToast(`Added ${name} to presence roster.`);
  };

  // Sign out
  const handleSignOut = () => {
    AuthService.signOut();
    setCurrentUser(null);
    setUsers([]);
    setActiveCall(null);
  };

  // Splash Screen while restoring session
  if (!checkedSession) {
    return (
      <div className="min-h-screen w-full bg-[#1E1F22] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#5865F2]" />
      </div>
    );
  }

  // Not signed in
  if (!currentUser) {
    return (
      <AndroidFrame>
        <UsernameScreen onUserRegistered={(user) => setCurrentUser(user)} />
      </AndroidFrame>
    );
  }

  return (
    <AndroidFrame>
      <div className="flex-1 w-full h-full bg-[#121316] relative flex flex-col overflow-hidden">
        {/* Home Screen (Contacts list, Keypad, Recents, BARA Shield, Header) */}
        <HomeScreen
          currentUser={currentUser}
          users={users}
          isWsConnected={isWsConnected}
          callHistory={callHistory}
          detectionState={detectionState}
          settings={settings}
          trustedContacts={trustedContacts}
          onStartCall={handleStartCall}
          onRefreshPresence={() => webSocketService.refreshPresence()}
          onSignOut={handleSignOut}
          onSimulateIncomingCall={handleSimulateIncomingCall}
          onSimulateScenario={handleSimulateScenario}
          onRefreshTrustedContacts={handleRefreshTrustedContacts}
          onAddCustomContact={handleAddCustomContact}
          onClearHistory={handleClearHistory}
          onUpdateSettings={handleUpdateSettings}
        />

        {/* Incoming Call Screen Overlay */}
        {activeCall && activeCall.state === 'ringingIncoming' && (
          <IncomingCallScreen
            call={activeCall}
            transcriptSegments={transcriptSegments}
            trustedContact={trustedContacts.find(
              (c) =>
                c.name.toLowerCase() === activeCall.peerUsername.toLowerCase() ||
                activeCall.peerUsername.toLowerCase().includes(c.name.toLowerCase())
            )}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}

        {/* Active Call Screen Overlay (Ringing outgoing & Connected) */}
        {activeCall &&
          (activeCall.state === 'ringingOutgoing' || activeCall.state === 'connected') && (
            <ActiveCallScreen
              call={activeCall}
              detectionState={detectionState}
              transcriptSegments={transcriptSegments}
              isReconnecting={isReconnecting}
              trustedContact={trustedContacts.find(
                (c) =>
                  c.name.toLowerCase() === activeCall.peerUsername.toLowerCase() ||
                  activeCall.peerUsername.toLowerCase().includes(c.name.toLowerCase())
              )}
              activeVerificationState={activeVerificationState || undefined}
              onEndCall={handleEndCall}
              onToggleMute={handleToggleMute}
              onTriggerActiveVerification={handleTriggerActiveVerification}
              onEvaluateActiveAnswer={handleEvaluateActiveAnswer}
            />
          )}

        {/* Snackbar / Notification Toast */}
        {snackBarMessage && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#2B2D31] text-[#F2F3F5] text-xs font-medium rounded-full shadow-2xl border border-[#3A3C41] animate-fadeIn flex items-center gap-2 max-w-[90%] text-center">
            {snackBarMessage}
          </div>
        )}
      </div>
    </AndroidFrame>
  );
}

export default App;
