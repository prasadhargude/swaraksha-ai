/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RENDER_HTTP_URL?: string;
  readonly VITE_RENDER_WS_URL?: string;
  readonly VITE_LIVEKIT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
