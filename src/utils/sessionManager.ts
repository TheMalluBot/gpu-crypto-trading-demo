/**
 * Secure session management with automatic timeouts and credential expiration
 */

import { ErrorHandler } from './errorHandling';

interface SessionData {
  sessionId: string;
  userId?: string;
  loginTime: number;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
  permissions: string[];
}

interface SessionConfig {
  sessionTimeout: number; // milliseconds
  credentialExpiration: number; // milliseconds
  autoRefreshThreshold: number; // milliseconds before expiry to auto-refresh
  maxConcurrentSessions: number;
}

const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes of inactivity
  credentialExpiration: 24 * 60 * 60 * 1000, // 24 hours total
  autoRefreshThreshold: 60 * 60 * 1000, // 1 hour before expiry
  maxConcurrentSessions: 3,
};

export class SecureSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private config: SessionConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private activityListeners: Set<(sessionId: string) => void> = new Set();
  private expirationCallbacks: Set<(sessionId: string, reason: string) => void> = new Set();

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
    this.setupActivityTracking();
  }

  /**
   * Create a new secure session
   */
  createSession(userId?: string, permissions: string[] = []): string {
    const sessionId = this.generateSecureSessionId();
    const now = Date.now();

    const sessionData: SessionData = {
      sessionId,
      userId,
      loginTime: now,
      lastActivity: now,
      expiresAt: now + this.config.credentialExpiration,
      isActive: true,
      permissions,
    };

    // Enforce max concurrent sessions
    this.enforceSessionLimits(userId);

    this.sessions.set(sessionId, sessionData);

    // Log session creation
    console.info(`Session created: ${sessionId}${userId ? ` for user ${userId}` : ''}`);

    return sessionId;
  }

  /**
   * Validate and refresh session if needed
   */
  validateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive) {
      return false;
    }

    const now = Date.now();

    // Check if session has expired
    if (now > session.expiresAt) {
      this.expireSession(sessionId, 'Session expired after 24 hours');
      return false;
    }

    // Check for inactivity timeout
    if (now - session.lastActivity > this.config.sessionTimeout) {
      this.expireSession(sessionId, 'Session expired due to inactivity');
      return false;
    }

    // Update last activity
    session.lastActivity = now;

    // Auto-refresh if close to expiration
    if (session.expiresAt - now < this.config.autoRefreshThreshold) {
      this.refreshSession(sessionId);
    }

    return true;
  }

  /**
   * Manually refresh a session (extend expiration)
   */
  refreshSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive) {
      return false;
    }

    const now = Date.now();
    session.expiresAt = now + this.config.credentialExpiration;
    session.lastActivity = now;

    console.info(`Session refreshed: ${sessionId}`);
    return true;
  }

  /**
   * Record user activity to prevent timeout
   */
  recordActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (session && session.isActive) {
      session.lastActivity = Date.now();

      // Notify activity listeners
      this.activityListeners.forEach(listener => {
        try {
          listener(sessionId);
        } catch (error) {
          ErrorHandler.handle(error, { showNotification: false });
        }
      });
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);

    if (!session || !this.validateSession(sessionId)) {
      return null;
    }

    return { ...session }; // Return copy to prevent mutation
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(sessionId: string): number {
    const session = this.sessions.get(sessionId);

    if (!session || !session.isActive) {
      return 0;
    }

    return Math.max(0, session.expiresAt - Date.now());
  }

  /**
   * Check if session will expire soon
   */
  isNearExpiry(sessionId: string): boolean {
    const timeLeft = this.getTimeUntilExpiry(sessionId);
    return timeLeft > 0 && timeLeft < this.config.autoRefreshThreshold;
  }

  /**
   * Manually expire a session
   */
  expireSession(sessionId: string, reason: string = 'Manual expiration'): void {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.isActive = false;

      console.info(`Session expired: ${sessionId} - ${reason}`);

      // Notify expiration callbacks
      this.expirationCallbacks.forEach(callback => {
        try {
          callback(sessionId, reason);
        } catch (error) {
          ErrorHandler.handle(error, { showNotification: false });
        }
      });

      // Remove session after delay to allow for cleanup
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 5000);
    }
  }

  /**
   * Expire all sessions for a user
   */
  expireUserSessions(userId: string, reason: string = 'User logout'): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.isActive) {
        this.expireSession(sessionId, reason);
      }
    }
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): SessionData[] {
    const userSessions: SessionData[] = [];

    for (const session of this.sessions.values()) {
      if (
        session.userId === userId &&
        session.isActive &&
        this.validateSession(session.sessionId)
      ) {
        userSessions.push({ ...session });
      }
    }

    return userSessions;
  }

  /**
   * Add activity listener
   */
  onActivity(listener: (sessionId: string) => void): void {
    this.activityListeners.add(listener);
  }

  /**
   * Add expiration callback
   */
  onExpiration(callback: (sessionId: string, reason: string) => void): void {
    this.expirationCallbacks.add(callback);
  }

  /**
   * Remove listeners
   */
  removeListener(listener: Function): void {
    this.activityListeners.delete(listener as any);
    this.expirationCallbacks.delete(listener as any);
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    nearExpiryCount: number;
  } {
    let activeSessions = 0;
    let expiredSessions = 0;
    let nearExpiryCount = 0;

    for (const session of this.sessions.values()) {
      if (session.isActive) {
        if (this.validateSession(session.sessionId)) {
          activeSessions++;
          if (this.isNearExpiry(session.sessionId)) {
            nearExpiryCount++;
          }
        } else {
          expiredSessions++;
        }
      } else {
        expiredSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      nearExpiryCount,
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      // Remove sessions that have been inactive for too long or expired
      if (
        !session.isActive ||
        now > session.expiresAt ||
        now - session.lastActivity > this.config.sessionTimeout
      ) {
        if (session.isActive) {
          this.expireSession(sessionId, 'Cleanup: Session expired');
        } else {
          toRemove.push(sessionId);
        }
      }
    }

    // Remove dead sessions
    toRemove.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (toRemove.length > 0) {
      console.info(`Cleaned up ${toRemove.length} expired sessions`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    ); // Clean up every 5 minutes
  }

  /**
   * Setup automatic activity tracking
   */
  private setupActivityTracking(): void {
    // Track common user interactions
    const events = ['mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const activityHandler = () => {
      // Get current session from localStorage or context
      const currentSessionId = this.getCurrentSessionId();
      if (currentSessionId) {
        this.recordActivity(currentSessionId);
      }
    };

    // Add event listeners if in browser environment
    if (typeof window !== 'undefined') {
      events.forEach(event => {
        window.addEventListener(event, activityHandler, { passive: true });
      });
    }
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSecureSessionId(): string {
    const array = new Uint8Array(32);

    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback - use Math.random (less secure but functional)
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Enforce maximum concurrent sessions per user
   */
  private enforceSessionLimits(userId?: string): void {
    if (!userId) return;

    const userSessions = this.getUserSessions(userId);

    if (userSessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = userSessions.sort((a, b) => a.loginTime - b.loginTime)[0];
      this.expireSession(oldestSession.sessionId, 'Maximum concurrent sessions exceeded');
    }
  }

  /**
   * Get current session ID from storage
   */
  getCurrentSessionId(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('sessionId');
    }
    return null;
  }

  /**
   * Destroy the session manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.sessions.clear();
    this.activityListeners.clear();
    this.expirationCallbacks.clear();
  }
}

// Global session manager instance
let globalSessionManager: SecureSessionManager | null = null;

/**
 * Get or create the global session manager
 */
export function getSessionManager(): SecureSessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SecureSessionManager();
  }
  return globalSessionManager;
}

/**
 * Initialize session management
 */
export function initializeSessionManagement(config?: Partial<SessionConfig>): SecureSessionManager {
  if (globalSessionManager) {
    globalSessionManager.destroy();
  }

  globalSessionManager = new SecureSessionManager(config);

  // Setup expiration notifications
  globalSessionManager.onExpiration((_sessionId, reason) => {
    // Import notification manager dynamically to avoid circular dependencies
    import('./notifications').then(({ default: NotificationManager }) => {
      NotificationManager.warning(
        'Session Expired',
        reason + '. Please log in again for security.'
      );
    });
  });

  return globalSessionManager;
}

/**
 * React hook for session management
 */
export function useSession() {
  const sessionManager = getSessionManager();
  const currentSessionId = sessionManager.getCurrentSessionId();

  return {
    sessionId: currentSessionId,
    isValid: currentSessionId ? sessionManager.validateSession(currentSessionId) : false,
    timeUntilExpiry: currentSessionId ? sessionManager.getTimeUntilExpiry(currentSessionId) : 0,
    isNearExpiry: currentSessionId ? sessionManager.isNearExpiry(currentSessionId) : false,
    refresh: () => (currentSessionId ? sessionManager.refreshSession(currentSessionId) : false),
    expire: (reason?: string) =>
      currentSessionId ? sessionManager.expireSession(currentSessionId, reason) : void 0,
  };
}
