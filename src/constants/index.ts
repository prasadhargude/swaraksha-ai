export const AppColors = {
  background: '#1E1F22',
  surface: '#2B2D31',
  surfaceHigh: '#313338',
  sidebar: '#1A1B1E',
  primary: '#5865F2', // Discord blurple
  primaryDark: '#4752C4',
  online: '#23A55A',
  offline: '#80848E',
  busy: '#F23F42',
  textPrimary: '#F2F3F5',
  textSecondary: '#949BA4',
  divider: '#3A3C41',
  danger: '#ED4245',
  success: '#23A55A',
} as const;

export const ApiConstants = {
  renderHttpUrl: 'https://swaraksha-app-36el.onrender.com',
  renderWsUrl: 'wss://swaraksha-app-36el.onrender.com',
  livekitServerUrl: 'wss://mybot-02r08nwi.livekit.cloud',
  
  registerUserPath: '/api/users/register',
  livekitTokenPath: '/api/livekit/token',
  
  presenceSocketPath: (userId: string) => `/ws/presence/${userId}`,
  audioAnalysisSocketPath: (userId: string, callId: string) => `/ws/audio-analysis/${userId}/${callId}`,
  
  audioSampleRate: 16000,
  audioChunkMillis: 100,
  
  // BARA Deepfake Detection Config (from bara_config.json & validation logs)
  baraConfig: {
    sampleRate: 16000,
    channels: 64,
    winTime: 0.025,
    hopTime: 0.010,
    maxFrames: 400,
    threshold: 32.0, // Calibrated for on-device TFLite/BARA model scale
    fakeRatioThreshold: 0.30, // Hysteresis threshold
    minReliableVotes: 5, // Requires 5 reliable votes in 10-chunk rolling window
    windowSize: 10,
    maxSilenceRatio: 0.50,
    vadEnergyThreshold: 0.008,
    requiredConsecutiveFakeWindows: 2,
  },
} as const;

export const SignalType = {
  presenceUpdate: 'presence_update',
  userOnline: 'user_online',
  userOffline: 'user_offline',
  callOffer: 'call_offer',
  callAnswer: 'call_answer',
  iceCandidate: 'ice_candidate',
  callEnd: 'call_end',
  callReject: 'call_reject',
  liveTranscript: 'live_transcript',
  presenceRefresh: 'presence_refresh',
} as const;
