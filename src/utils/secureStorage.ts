/**
 * Secure storage utility for sensitive data like API keys
 * Uses simple encryption with browser's SubtleCrypto API
 */

interface SecureData {
  encrypted: string;
  iv: string;
  salt: string;
}

class SecureStorage {
  private static readonly STORAGE_KEY = 'secure_app_data';
  private static readonly ALGORITHM = 'AES-GCM';

  /**
   * Generate a key from password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const passwordBuffer = new TextEncoder().encode(password);

    const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
      'deriveKey',
    ]);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: 256,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a device-specific key based on browser fingerprint
   */
  private static getDeviceKey(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join('|');

    // Simple hash of fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Encrypt and store sensitive data with session validation
   */
  static async store(key: string, data: unknown): Promise<void> {
    // Import session manager dynamically to avoid circular dependencies
    const { getSessionManager } = await import('./sessionManager');
    const sessionManager = getSessionManager();

    // Validate current session before storing sensitive data
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId && !sessionManager.validateSession(sessionId)) {
      throw new Error('Session expired. Please log in again to store data.');
    }
    try {
      const password = this.getDeviceKey();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const cryptoKey = await this.deriveKey(password, salt);
      const dataString = JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(dataString);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        cryptoKey,
        dataBuffer
      );

      const secureData: SecureData = {
        encrypted: Array.from(new Uint8Array(encrypted))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        iv: Array.from(iv)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        salt: Array.from(salt)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
      };

      const existingData = this.getAllSecureData();
      existingData[key] = secureData;

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('Failed to store secure data:', error);
      throw new Error('Failed to encrypt and store data');
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  static async retrieve(key: string): Promise<any | null> {
    try {
      const allData = this.getAllSecureData();
      const secureData = allData[key];

      if (!secureData) {
        return null;
      }

      const password = this.getDeviceKey();
      const salt = new Uint8Array(
        secureData.salt.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      const iv = new Uint8Array(
        secureData.iv.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      const encrypted = new Uint8Array(
        secureData.encrypted.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      const cryptoKey = await this.deriveKey(password, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        cryptoKey,
        encrypted
      );

      const dataString = new TextDecoder().decode(decrypted);
      return JSON.parse(dataString);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  /**
   * Remove encrypted data
   */
  static remove(key: string): void {
    const allData = this.getAllSecureData();
    delete allData[key];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
  }

  /**
   * Check if secure data exists
   */
  static has(key: string): boolean {
    const allData = this.getAllSecureData();
    return key in allData;
  }

  /**
   * Get all secure data from localStorage
   */
  private static getAllSecureData(): Record<string, SecureData> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  /**
   * Clear all secure data
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export default SecureStorage;
