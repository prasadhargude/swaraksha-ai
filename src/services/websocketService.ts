import { ApiConstants } from '../constants';
import { SignalMessage, UserModel } from '../types';

type MessageListener = (msg: SignalMessage) => void;
type ConnectionListener = (connected: boolean) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private currentUserId: string | null = null;
  private reconnectTimer: number | null = null;
  private messageListeners: MessageListener[] = [];
  private connectionListeners: ConnectionListener[] = [];
  private fallbackTimer: number | null = null;

  public get connected(): boolean {
    return this.isConnected;
  }

  public onMessage(listener: MessageListener): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    };
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.push(listener);
    listener(this.isConnected);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
    };
  }

  public connect(userId: string): void {
    this.currentUserId = userId;
    this.openSocket(userId);
  }

  private openSocket(userId: string): void {
    try {
      const customHttp = localStorage.getItem('auth_custom_api_url');
      let wsBase: string = ApiConstants.renderWsUrl;
      if (customHttp) {
        wsBase = customHttp.replace(/^http/, 'ws');
      }

      const url = `${wsBase}${ApiConstants.presenceSocketPath(userId)}`;
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notifyConnection(true);
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SignalMessage;
          this.notifyMessage(data);
        } catch (_) {}
      };

      this.socket.onclose = () => {
        this.handleDisconnect();
      };

      this.socket.onerror = () => {
        this.handleDisconnect();
      };

      // Set fallback timer in case backend is sleeping (Render free tier sleeps)
      this.fallbackTimer = window.setTimeout(() => {
        if (!this.isConnected) {
          // Provide default contacts so the user can interactively test the app right away
          this.seedInitialContacts(userId);
        }
      }, 3000);
    } catch (_) {
      this.handleDisconnect();
      this.seedInitialContacts(userId);
    }
  }

  private seedInitialContacts(myUserId: string): void {
    // Provide presence list with demo contacts so user is never blocked by sleeping backend
    const demoUsers: UserModel[] = [
      { userId: 'user-pruthvi-01', username: 'pruthviraj_dev', status: 'online' as const },
      { userId: 'user-priya-02', username: 'priya_sharma', status: 'online' as const },
      { userId: 'user-amit-03', username: 'amit_kumar', status: 'offline' as const },
      { userId: 'user-alex-04', username: 'alex_ai_tester', status: 'online' as const },
    ].filter((u) => u.userId !== myUserId);

    this.notifyMessage({
      type: 'presence_update',
      users: demoUsers.map((u) => ({ user_id: u.userId, username: u.username, status: u.status })),
    });
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.notifyConnection(false);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.currentUserId) return;

    this.reconnectTimer = window.setTimeout(() => {
      if (!this.isConnected && this.currentUserId) {
        this.openSocket(this.currentUserId);
      }
    }, 4000);
  }

  public send(payload: Record<string, unknown>): void {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  public refreshPresence(): void {
    if (this.isConnected) {
      this.send({ type: 'presence_refresh' });
    } else if (this.currentUserId) {
      this.seedInitialContacts(this.currentUserId);
    }
  }

  public emitLocalSignal(message: SignalMessage): void {
    // For test simulation / preview demo mode
    this.notifyMessage(message);
  }

  private notifyMessage(msg: SignalMessage): void {
    for (const listener of this.messageListeners) {
      listener(msg);
    }
  }

  private notifyConnection(state: boolean): void {
    for (const listener of this.connectionListeners) {
      listener(state);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.fallbackTimer) clearTimeout(this.fallbackTimer);
    this.currentUserId = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.notifyConnection(false);
  }
}

export const webSocketService = new WebSocketService();
