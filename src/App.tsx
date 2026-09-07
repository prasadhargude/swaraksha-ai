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

  // Deepfake detection state
  const [detectionState, setDetectionState] = useState<DetectionState>(deepfakeService.getState());

  const activeCallRef = useRef<CallModel | null>(null);
  activeCallRef.current = activeCall;

  const ringTimerRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const simIntervalRef = useRef<number | null>(null);

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
          if (activeCallRef.current) {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
            deepfakeService.startMonitoring();
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
          if (msg.text && msg.text.trim()) {
            const newSegment: TranscriptSegment = {
              text: msg.text.trim(),
              isFinal: msg.is_final ?? false,
              receivedAt: new Date(),
            };
            setTranscriptSegments((prev) => [...prev.slice(-19), newSegment]);
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
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
        } catch (_) {
          console.warn('Microphone permission not granted, proceeding with VoIP audio shell');
        }
      }

      const callId = 'call-' + Math.random().toString(36).substring(2, 9);
      callStartTimeRef.current = Date.now();

      setActiveCall({
        callId,
        peerUserId: targetUser.userId,
        peerUsername: targetUser.username,
        state: 'ringingOutgoing',
      });
      setTranscriptSegments([]);

      webSocketService.send({
        type: 'call_offer',
        call_id: callId,
        from_user_id: currentUser?.userId,
        from_username: currentUser?.username,
        to_user_id: targetUser.userId,
      });

      // 30s timeout matching Flutter _ringTimeout
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = window.setTimeout(() => {
        if (activeCallRef.current?.state === 'ringingOutgoing') {
          showToast(`${targetUser.username} did not answer.`);
          handleEndCall();
        }
      }, 30000);

      // Auto-connect standalone/demo call after 2 seconds
      setTimeout(() => {
        if (
          activeCallRef.current?.callId === callId &&
          activeCallRef.current?.state === 'ringingOutgoing'
        ) {
          callStartTimeRef.current = Date.now();
          setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
          deepfakeService.startMonitoring();

          // Auto inject natural human speech sample
          deepfakeService.injectSampleChunk('real');
          setTranscriptSegments([
            {
              text: `Hello ${currentUser?.username}, this is ${targetUser.username}. Secure VoIP channel established.`,
              isFinal: false,
              receivedAt: new Date(),
            },
          ]);
        }
      }, 2200);
    } catch (err) {
      showToast('Could not start call. Check microphone permission.');
    }
  };

  // Callee accepts incoming call
  const handleAcceptCall = async () => {
    if (!activeCall) return;

    callStartTimeRef.current = Date.now();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        deepfakeService.evaluateAudioStream(stream);
      } catch (_) {
        console.warn('Mic access skipped or simulated');
      }
    }

    webSocketService.send({
      type: 'call_answer',
      call_id: activeCall.callId,
      from_user_id: currentUser?.userId,
      to_user_id: activeCall.peerUserId,
    });

    setActiveCall((prev) => (prev ? { ...prev, state: 'connected' } : null));
    deepfakeService.startMonitoring();

    // If simulated deepfake test caller, automatically feed synthetic chunks after 1s
    if (
      activeCall.peerUsername.toLowerCase().includes('spoof') ||
      activeCall.peerUsername.toLowerCase().includes('fake')
    ) {
      let count = 0;
      simIntervalRef.current = window.setInterval(() => {
        count++;
        deepfakeService.injectSampleChunk('fake');
        if (count >= 8 && simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      }, 1200);
    } else {
      // Natural human caller
      let count = 0;
      simIntervalRef.current = window.setInterval(() => {
        count++;
        deepfakeService.injectSampleChunk('real');
        if (count >= 6 && simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      }, 1500);
    }
  };

  // Callee rejects incoming call
  const handleRejectCall = () => {
    if (!activeCall) return;

    webSocketService.send({
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
      webSocketService.send({
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

    // Clear any scenario simulation timers
    scenarioStepTimersRef.current.forEach((t) => window.clearTimeout(t));
    scenarioStepTimersRef.current = [];

    deepfakeService.stopMonitoring();
    setActiveCall(null);
    setTranscriptSegments([]);
    setActiveVerificationState(null);
    setIsReconnecting(false);
    callStartTimeRef.current = null;
  };

  // Toggle Mute
  const handleToggleMute = (muted: boolean) => {
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

  // Simulate a Demo Scenario
  const handleSimulateScenario = useCallback(
    (scenarioId: DemoScenarioId) => {
      // Clear existing
      scenarioStepTimersRef.current.forEach((t) => window.clearTimeout(t));
      scenarioStepTimersRef.current = [];

      const scenario = DEMO_SCENARIOS[scenarioId];
      if (!scenario) return;

      // Find or create trusted contact for this scenario
      const contact =
        trustedContacts.find(
          (c) => c.name.toLowerCase() === scenario.contactName.toLowerCase()
        ) ||
        TrustedContactsStore.getContacts().find(
          (c) => c.name.toLowerCase() === scenario.contactName.toLowerCase()
        ) ||
        TrustedContactsStore.getContacts()[0];

      const testCallId = 'scen-' + Date.now();

      // Start call
      setActiveCall({
        callId: testCallId,
        peerUserId: contact ? contact.id : 'contact_amit',
        peerUsername: scenario.contactName,
        state: 'ringingIncoming',
      });

      // Initial transcript
      const initialStep = scenario.transcriptSteps[0];
      setTranscriptSegments([
        {
          text: initialStep?.text || 'Incoming call...',
          isFinal: false,
          receivedAt: new Date(),
        },
      ]);

      // Set initial verification state
      setActiveVerificationState({
        isTriggered: initialStep?.triggerVerification || false,
        triggerReason: initialStep?.triggerVerification ? 'Risk threshold exceeded' : '',
        question:
          initialStep?.triggerVerification && contact?.verificationQuestions.length > 0
            ? contact.verificationQuestions[0]
            : undefined,
        receiverAsked: false,
        evaluationResult: initialStep?.triggerVerification ? 'PENDING' : undefined,
        currentSegment: {
          segmentId: 'seg-init',
          timestamp: Date.now(),
          similarityScore: initialStep?.similarity ?? 0.94,
          status: initialStep?.status ?? 'match',
          statusLabel: initialStep?.status === 'match' ? 'Match: Amit' : 'Analyzing',
          speakerChanged: false,
          activeSpeakerLabel: initialStep?.speaker || scenario.contactName,
          embeddingSnapshot: [],
        },
      });

      // Automatically schedule progressive steps once call progresses
      let accumulatedDelay = 0;
      scenario.transcriptSteps.forEach((step, idx) => {
        accumulatedDelay += step.delayMs;
        const timer = window.setTimeout(() => {
          // Update transcript
          if (step.text) {
            setTranscriptSegments((prev) => [
              ...prev,
              {
                text: `${step.speaker}: "${step.text}"`,
                isFinal: true,
                receivedAt: new Date(),
              },
            ]);
          }

          // Update speaker verification segment
          const segment: SpeakerSegmentResult = {
            segmentId: `seg-${idx}-${Date.now()}`,
            timestamp: Date.now(),
            similarityScore: step.similarity,
            status: step.status,
            statusLabel:
              step.status === 'match'
                ? `Match: ${scenario.contactName} (${Math.round(step.similarity * 100)}%)`
                : step.status === 'possibleMismatch'
                ? `Mismatch Alert (${Math.round(step.similarity * 100)}%)`
                : `Unknown Speaker (${Math.round(step.similarity * 100)}%)`,
            speakerChanged: step.speakerChanged || false,
            activeSpeakerLabel: step.speaker,
            embeddingSnapshot: [],
          };

          // Update detectionState synthetic verdict
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

          // Update active verification state
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
      });
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
