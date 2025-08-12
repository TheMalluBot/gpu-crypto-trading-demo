import { invoke } from '@tauri-apps/api/core';

// Type declarations for Tauri globals
interface TauriAPI {
  invoke: (command: string, args?: Record<string, unknown>) => Promise<unknown>;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __TAURI_IPC__?: TauriAPI;
    __TAURI__?: TauriAPI;
    __TAURI_API__?: TauriAPI;
    Tauri?: TauriAPI;
    __tauri__?: TauriAPI;
  }
}

// Enhanced Tauri environment detection
export const isTauriApp = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check multiple ways to detect Tauri
  return !!(
    window.__TAURI_IPC__ ||
    window.__TAURI__ ||
    window.__TAURI_API__ ||
    window.Tauri ||
    window.__tauri__
  );
};

// Get detailed Tauri environment info for debugging
export const getTauriInfo = () => {
  if (typeof window === 'undefined') {
    return { environment: 'server', available: false };
  }

  return {
    environment: 'browser',
    available: isTauriApp(),
    __TAURI_IPC__: typeof window.__TAURI_IPC__,
    __TAURI__: typeof window.__TAURI__,
    __TAURI_API__: typeof window.__TAURI_API__,
    userAgent: navigator.userAgent,
    location: window.location.href,
  };
};

// Test API connection with retry mechanism
export const testApiConnection = async (
  maxRetries = 3
): Promise<{ success: boolean; error?: string; info?: Record<string, unknown> }> => {
  const info = getTauriInfo();

  if (!info.available) {
    return {
      success: false,
      error: 'Tauri environment not detected',
      info,
    };
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Test with a simple command that should always work
      await invoke('cpu_stats');
      return { success: true, info };
    } catch (error) {
      console.warn(`API test attempt ${i + 1}/${maxRetries} failed:`, error);

      if (i === maxRetries - 1) {
        return {
          success: false,
          error: `API test failed after ${maxRetries} attempts: ${error}`,
          info,
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { success: false, error: 'Unexpected error in API test' };
};

// Safe wrapper for Tauri invoke calls
export const safeInvoke = async <T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> => {
  if (!isTauriApp()) {
    console.warn(`Tauri command '${command}' called in browser environment - returning null`);
    return null;
  }

  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);
    return null;
  }
};

// Safe wrapper for Tauri invoke calls with fallback
export const safeInvokeWithFallback = async <T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: T
): Promise<T | null> => {
  if (!isTauriApp()) {
    console.warn(`Tauri command '${command}' called in browser environment - returning fallback`);
    return fallback || null;
  }

  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`Tauri command '${command}' failed:`, error);
    return fallback || null;
  }
};
