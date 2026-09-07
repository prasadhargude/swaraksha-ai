import { UserModel } from '../types';
import { ApiConstants } from '../constants';

const KEY_USERNAME = 'auth_username';
const KEY_USER_ID = 'auth_user_id';
const KEY_API_URL = 'auth_custom_api_url';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class AuthService {
  public static getApiBaseUrl(): string {
    return localStorage.getItem(KEY_API_URL) || ApiConstants.renderHttpUrl;
  }

  public static setApiBaseUrl(url: string): void {
    localStorage.setItem(KEY_API_URL, url.trim().replace(/\/$/, ''));
  }

  public static async loadStoredUser(): Promise<UserModel | null> {
    const username = localStorage.getItem(KEY_USERNAME);
    const userId = localStorage.getItem(KEY_USER_ID);
    if (!username || !userId) return null;

    // Always attempt re-register with backend on launch, matching Flutter AuthService
    try {
      await fetch(`${this.getApiBaseUrl()}${ApiConstants.registerUserPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, user_id: userId }),
      });
    } catch (_) {
      // If backend is offline or sleeping, still allow user in
    }

    return { userId, username, status: 'online' };
  }

  public static async createUser(username: string): Promise<UserModel> {
    const userId = generateUuid();

    try {
      await fetch(`${this.getApiBaseUrl()}${ApiConstants.registerUserPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, user_id: userId }),
      });
    } catch (_) {
      // Backend might be warming up
    }

    localStorage.setItem(KEY_USERNAME, username);
    localStorage.setItem(KEY_USER_ID, userId);

    return { userId, username, status: 'online' };
  }

  public static signOut(): void {
    localStorage.removeItem(KEY_USERNAME);
    localStorage.removeItem(KEY_USER_ID);
  }
}
