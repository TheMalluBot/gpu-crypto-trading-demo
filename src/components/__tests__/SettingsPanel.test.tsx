// Phase 1 Week 2 Test Engineer - Critical Settings Security Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from '../SettingsPanel';

// Mock Tauri API
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('SettingsPanel - Critical Security Tests', () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const { invoke } = require('@tauri-apps/api/tauri');
    invoke.mockImplementation(mockInvoke);
  });

  it('should mask API credentials in input fields', () => {
    render(<SettingsPanel />);

    // Find API secret input
    const secretInput =
      screen.getByLabelText(/secret/i) ||
      screen.getByPlaceholderText(/secret/i) ||
      screen.getByDisplayValue('');

    if (secretInput) {
      // Should be password type or masked
      expect(
        secretInput.type === 'password' ||
          secretInput.value.includes('*') ||
          secretInput.getAttribute('data-masked') === 'true'
      ).toBe(true);
    }
  });

  it('should validate API key format before saving', async () => {
    render(<SettingsPanel />);

    const apiKeyInput =
      screen.getByLabelText(/api.*key/i) || screen.getByPlaceholderText(/api.*key/i);

    if (apiKeyInput) {
      // Test invalid API key format
      await userEvent.clear(apiKeyInput);
      await userEvent.type(apiKeyInput, 'invalid_key');

      const saveButton = screen.getByText(/save/i) || screen.getByText(/apply/i);
      await userEvent.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid/i) || screen.getByText(/error/i)).toBeInTheDocument();
      });
    }
  });

  it('should enforce testnet/paper trading mode', () => {
    render(<SettingsPanel />);

    // Should show testnet option
    const testnetToggle =
      screen.getByLabelText(/testnet/i) ||
      screen.getByLabelText(/paper/i) ||
      screen.getByLabelText(/demo/i);

    if (testnetToggle) {
      // Should be enabled by default for safety
      expect(testnetToggle.checked || testnetToggle.value === 'true').toBe(true);
    }
  });

  it('should prevent live trading URL configuration', async () => {
    render(<SettingsPanel />);

    const urlInput =
      screen.getByLabelText(/url/i) ||
      screen.getByLabelText(/endpoint/i) ||
      screen.getByPlaceholderText(/url/i);

    if (urlInput) {
      // Try to set live trading URL
      await userEvent.clear(urlInput);
      await userEvent.type(urlInput, 'https://api.binance.com');

      const saveButton = screen.getByText(/save/i) || screen.getByText(/apply/i);
      await userEvent.click(saveButton);

      // Should warn about live trading or reject
      await waitFor(() => {
        const warning =
          screen.queryByText(/live/i) ||
          screen.queryByText(/production/i) ||
          screen.queryByText(/warning/i);

        // Either should show warning or revert to testnet URL
        expect(warning || urlInput.value.includes('testnet')).toBeTruthy();
      });
    }
  });

  it('should not store credentials in localStorage', async () => {
    render(<SettingsPanel />);

    const apiKeyInput =
      screen.getByLabelText(/api.*key/i) || screen.getByPlaceholderText(/api.*key/i);

    if (apiKeyInput) {
      await userEvent.clear(apiKeyInput);
      await userEvent.type(apiKeyInput, 'test_api_key_12345');

      const saveButton = screen.getByText(/save/i) || screen.getByText(/apply/i);
      await userEvent.click(saveButton);

      // Wait a bit for any storage operations
      await waitFor(() => {
        // Check that credentials are not in localStorage
        const localStorageData = JSON.stringify(localStorage);
        expect(localStorageData).not.toContain('test_api_key_12345');
        expect(localStorageData).not.toContain('api_key');
        expect(localStorageData).not.toContain('api_secret');
      });
    }
  });

  it('should sanitize input fields against XSS', async () => {
    render(<SettingsPanel />);

    const inputs = screen.getAllByRole('textbox');

    for (const input of inputs) {
      // Try XSS injection
      await userEvent.clear(input);
      await userEvent.type(input, '<script>alert("xss")</script>');

      // Input should be sanitized
      expect(input.value).not.toContain('<script>');
      expect(input.value).not.toContain('alert(');
    }
  });

  it('should validate URL format and protocol', async () => {
    render(<SettingsPanel />);

    const urlInput =
      screen.getByLabelText(/url/i) ||
      screen.getByLabelText(/endpoint/i) ||
      screen.getByPlaceholderText(/url/i);

    if (urlInput) {
      // Test invalid protocols
      const invalidUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://malicious.com',
      ];

      for (const invalidUrl of invalidUrls) {
        await userEvent.clear(urlInput);
        await userEvent.type(urlInput, invalidUrl);

        const saveButton = screen.getByText(/save/i) || screen.getByText(/apply/i);
        await userEvent.click(saveButton);

        // Should reject invalid URL
        await waitFor(() => {
          expect(screen.getByText(/invalid/i) || screen.getByText(/error/i)).toBeInTheDocument();
        });
      }
    }
  });

  it('should handle settings load errors gracefully', async () => {
    // Mock settings load error
    mockInvoke.mockRejectedValue(new Error('Failed to load settings'));

    render(<SettingsPanel />);

    // Should show error message or fallback state
    await waitFor(() => {
      const errorMessage =
        screen.queryByText(/error/i) ||
        screen.queryByText(/failed/i) ||
        screen.queryByText(/unable/i);

      // Should handle error gracefully (not crash)
      expect(errorMessage || screen.getByTestId('settings-panel')).toBeInTheDocument();
    });
  });

  it('should confirm dangerous setting changes', async () => {
    render(<SettingsPanel />);

    // Find a critical setting (like switching from testnet)
    const testnetToggle = screen.getByLabelText(/testnet/i) || screen.getByLabelText(/paper/i);

    if (testnetToggle && testnetToggle.checked) {
      // Try to disable testnet mode
      await userEvent.click(testnetToggle);

      // Should show confirmation dialog
      await waitFor(() => {
        const confirmation =
          screen.queryByText(/confirm/i) ||
          screen.queryByText(/are you sure/i) ||
          screen.queryByText(/warning/i);

        expect(confirmation).toBeInTheDocument();
      });
    }
  });

  it('should validate API credentials format', async () => {
    render(<SettingsPanel />);

    const apiKeyInput =
      screen.getByLabelText(/api.*key/i) || screen.getByPlaceholderText(/api.*key/i);
    const secretInput = screen.getByLabelText(/secret/i) || screen.getByPlaceholderText(/secret/i);

    if (apiKeyInput && secretInput) {
      // Test various invalid formats
      const invalidCredentials = [
        { key: '', secret: 'valid_secret' },
        { key: 'short', secret: 'valid_secret' },
        { key: 'valid_key_12345678', secret: '' },
        { key: 'valid_key_12345678', secret: 'short' },
      ];

      for (const creds of invalidCredentials) {
        await userEvent.clear(apiKeyInput);
        await userEvent.clear(secretInput);
        await userEvent.type(apiKeyInput, creds.key);
        await userEvent.type(secretInput, creds.secret);

        const saveButton = screen.getByText(/save/i) || screen.getByText(/apply/i);
        await userEvent.click(saveButton);

        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/invalid/i) || screen.getByText(/error/i)).toBeInTheDocument();
        });
      }
    }
  });
});
