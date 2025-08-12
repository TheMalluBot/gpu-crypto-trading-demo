/**
 * Centralized notification system for user feedback
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  autoClose?: boolean;
  duration?: number;
}

class NotificationManager {
  private static notifications: Notification[] = [];
  private static listeners: Array<(notifications: Notification[]) => void> = [];
  private static nextId = 1;

  /**
   * Add a notification
   */
  static add(
    type: NotificationType,
    title: string,
    message: string,
    options: { autoClose?: boolean; duration?: number } = {}
  ): string {
    const notification: Notification = {
      id: `notification-${this.nextId++}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      autoClose: options.autoClose ?? true,
      duration: options.duration ?? (type === 'error' ? 8000 : 5000),
    };

    this.notifications.unshift(notification);
    this.notifyListeners();

    // Auto-remove notification after duration
    if (notification.autoClose) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }

  /**
   * Remove a notification
   */
  static remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  static clear(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Get all notifications
   */
  static getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification changes
   */
  static subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.notifications]);
    });
  }

  /**
   * Convenience methods for different notification types
   */
  static success(
    title: string,
    message: string,
    options?: { autoClose?: boolean; duration?: number }
  ): string {
    return this.add('success', title, message, options);
  }

  static error(
    title: string,
    message: string,
    options?: { autoClose?: boolean; duration?: number }
  ): string {
    return this.add('error', title, message, options);
  }

  static warning(
    title: string,
    message: string,
    options?: { autoClose?: boolean; duration?: number }
  ): string {
    return this.add('warning', title, message, options);
  }

  static info(
    title: string,
    message: string,
    options?: { autoClose?: boolean; duration?: number }
  ): string {
    return this.add('info', title, message, options);
  }
}

export default NotificationManager;
