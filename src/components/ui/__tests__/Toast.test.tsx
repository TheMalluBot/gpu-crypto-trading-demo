import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast, useToastActions } from '../Toast';
import React from 'react';

// Test component that uses the toast hook
const TestComponent: React.FC = () => {
  const { addToast } = useToast();
  const actions = useToastActions();

  return (
    <div>
      <button onClick={() => addToast({ type: 'success', title: 'Success!' })}>
        Add Success
      </button>
      <button onClick={() => actions.error('Error!', 'Something went wrong')}>
        Add Error
      </button>
      <button onClick={() => actions.warning('Warning!')}>
        Add Warning
      </button>
      <button onClick={() => actions.info('Info!')}>
        Add Info
      </button>
    </div>
  );
};

describe('Toast System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('provides toast context to children', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByText('Add Success')).toBeInTheDocument();
    });

    it('throws error when useToast is used outside provider', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');
      
      spy.mockRestore();
    });
  });

  describe('Toast Rendering', () => {
    it('renders success toast when triggered', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Add Success');
      await userEvent.click(button);

      expect(screen.getByText('Success!')).toBeInTheDocument();
      const toast = screen.getByText('Success!').closest('div');
      expect(toast?.className).toContain('bg-green');
    });

    it('renders error toast with description', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Add Error');
      await userEvent.click(button);

      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      const toast = screen.getByText('Error!').closest('div');
      expect(toast?.className).toContain('bg-red');
    });

    it('renders multiple toasts', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await userEvent.click(screen.getByText('Add Success'));
      await userEvent.click(screen.getByText('Add Error'));
      await userEvent.click(screen.getByText('Add Warning'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('limits number of toasts to maxToasts prop', async () => {
      render(
        <ToastProvider maxToasts={2}>
          <TestComponent />
        </ToastProvider>
      );

      await userEvent.click(screen.getByText('Add Success'));
      await userEvent.click(screen.getByText('Add Error'));
      await userEvent.click(screen.getByText('Add Warning'));

      // Only 2 most recent toasts should be visible
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });
  });

  describe('Toast Auto-dismiss', () => {
    it('auto-dismisses toast after default duration', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await userEvent.click(screen.getByText('Add Success'));
      expect(screen.getByText('Success!')).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      });
    });

    it('uses longer duration for error toasts', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await userEvent.click(screen.getByText('Add Error'));
      expect(screen.getByText('Error!')).toBeInTheDocument();

      // Fast-forward less than error duration
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText('Error!')).toBeInTheDocument();

      // Fast-forward past error duration
      act(() => {
        vi.advanceTimersByTime(3500);
      });

      await waitFor(() => {
        expect(screen.queryByText('Error!')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toast Interactions', () => {
    it('closes toast when close button is clicked', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await userEvent.click(screen.getByText('Add Success'));
      expect(screen.getByText('Success!')).toBeInTheDocument();

      const closeButton = screen.getByText('Success!').closest('div')?.querySelector('button:last-child');
      if (closeButton) {
        await userEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      });
    });

    it('handles action button in toast', async () => {
      const actionHandler = vi.fn();
      
      const TestWithAction: React.FC = () => {
        const { addToast } = useToast();
        
        return (
          <button
            onClick={() =>
              addToast({
                type: 'info',
                title: 'Action Toast',
                action: {
                  label: 'Undo',
                  onClick: actionHandler,
                },
              })
            }
          >
            Add Toast with Action
          </button>
        );
      };

      render(
        <ToastProvider>
          <TestWithAction />
        </ToastProvider>
      );

      await userEvent.click(screen.getByText('Add Toast with Action'));
      
      const undoButton = screen.getByText('Undo');
      await userEvent.click(undoButton);
      
      expect(actionHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('useToastActions hook', () => {
    it('provides convenience methods for different toast types', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Test each convenience method
      await userEvent.click(screen.getByText('Add Success'));
      await userEvent.click(screen.getByText('Add Error'));
      await userEvent.click(screen.getByText('Add Warning'));
      await userEvent.click(screen.getByText('Add Info'));

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
      expect(screen.getByText('Info!')).toBeInTheDocument();
    });
  });
});