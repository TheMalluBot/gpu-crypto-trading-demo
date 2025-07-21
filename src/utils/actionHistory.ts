export interface Action {
  id: string;
  type: 'trade' | 'bot_action' | 'settings_change';
  description: string;
  timestamp: Date;
  data: any;
  undoFn?: () => Promise<void>;
}

class ActionHistoryManager {
  private history: Action[] = [];
  private maxHistorySize = 50;

  addAction(action: Omit<Action, 'id' | 'timestamp'>) {
    const newAction: Action = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.history.unshift(newAction);
    
    // Keep only the last maxHistorySize actions
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    return newAction.id;
  }

  getRecentActions(limit: number = 10): Action[] {
    return this.history.slice(0, limit);
  }

  async undoLastAction(): Promise<boolean> {
    const lastAction = this.history[0];
    if (!lastAction || !lastAction.undoFn) {
      return false;
    }

    try {
      await lastAction.undoFn();
      this.history.shift();
      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }

  clear() {
    this.history = [];
  }
}

export const actionHistory = new ActionHistoryManager();