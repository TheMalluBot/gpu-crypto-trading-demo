import { EventEmitter } from 'events';

export type WebSocketState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

export interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  protocols?: string | string[];
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface QueuedMessage {
  message: any;
  timestamp: number;
  attempts: number;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private isIntentionallyClosed = false;
  private lastPingTime = 0;
  private lastPongTime = 0;

  constructor(config: WebSocketConfig) {
    super();
    
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageQueueSize: config.messageQueueSize ?? 100,
      protocols: config.protocols,
    };
  }

  // Connection Management
  public connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.warn('WebSocket is already connected or connecting');
      return;
    }

    this.isIntentionallyClosed = false;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.setState('disconnecting');
    this.cleanup();
  }

  public reconnect(): void {
    if (!this.config.reconnect || this.isIntentionallyClosed) {
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached', this.reconnectAttempts);
      this.setState('disconnected');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Message Handling
  public send(data: any): boolean {
    if (this.state !== 'connected' || !this.ws) {
      this.queueMessage(data);
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      this.emit('messageSent', data);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      this.queueMessage(data);
      return false;
    }
  }

  public sendBatch(messages: any[]): number {
    let sent = 0;
    for (const message of messages) {
      if (this.send(message)) {
        sent++;
      }
    }
    return sent;
  }

  // Queue Management
  private queueMessage(data: any): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }

    this.messageQueue.push({
      message: data,
      timestamp: Date.now(),
      attempts: 0,
    });

    this.emit('messageQueued', {
      queueSize: this.messageQueue.length,
      message: data,
    });
  }

  private processQueue(): void {
    if (this.state !== 'connected' || this.messageQueue.length === 0) {
      return;
    }

    const processed: QueuedMessage[] = [];
    const failed: QueuedMessage[] = [];

    for (const queued of this.messageQueue) {
      queued.attempts++;
      
      if (this.send(queued.message)) {
        processed.push(queued);
      } else {
        if (queued.attempts < 3) {
          failed.push(queued);
        } else {
          this.emit('messageDropped', queued);
        }
      }
    }

    this.messageQueue = failed;
    
    if (processed.length > 0) {
      this.emit('queueProcessed', {
        processed: processed.length,
        remaining: this.messageQueue.length,
      });
    }
  }

  // Event Handlers Setup
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
  }

  private handleOpen(event: Event): void {
    this.setState('connected');
    this.reconnectAttempts = 0;
    
    this.emit('connected', {
      url: this.config.url,
      timestamp: Date.now(),
    });

    this.startHeartbeat();
    this.processQueue();
  }

  private handleClose(event: CloseEvent): void {
    this.setState('disconnected');
    
    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    this.cleanup();

    if (!this.isIntentionallyClosed && this.config.reconnect) {
      this.reconnect();
    }
  }

  private handleError(error: Error | Event): void {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket error';
    
    this.setState('error');
    this.emit('error', {
      message: errorMessage,
      timestamp: Date.now(),
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      let data: any;
      
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch {
          data = event.data;
        }
      } else {
        data = event.data;
      }

      // Handle ping/pong for heartbeat
      if (data && data.type === 'pong') {
        this.lastPongTime = Date.now();
        this.emit('pong', this.lastPongTime - this.lastPingTime);
        return;
      }

      const message: WebSocketMessage = {
        type: data?.type || 'message',
        data,
        timestamp: Date.now(),
      };

      this.emit('message', message);
      
      // Emit typed events
      if (data?.type) {
        this.emit(`message:${data.type}`, data);
      }
    } catch (error) {
      this.emit('parseError', {
        rawData: event.data,
        error: (error as Error).message,
      });
    }
  }

  // Heartbeat Management
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'connected' && this.ws) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping', timestamp: this.lastPingTime });
        
        // Check for stale connection
        if (this.lastPongTime > 0 && 
            Date.now() - this.lastPongTime > this.config.heartbeatInterval * 2) {
          this.emit('connectionStale');
          this.reconnect();
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // State Management
  private setState(state: WebSocketState): void {
    const previousState = this.state;
    this.state = state;
    
    this.emit('stateChange', {
      from: previousState,
      to: state,
      timestamp: Date.now(),
    });
  }

  // Cleanup
  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      
      this.ws = null;
    }
  }

  // Public Getters
  public getState(): WebSocketState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'connected';
  }

  public getQueueSize(): number {
    return this.messageQueue.length;
  }

  public clearQueue(): void {
    this.messageQueue = [];
    this.emit('queueCleared');
  }

  public getMetrics() {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length,
      lastPingTime: this.lastPingTime,
      lastPongTime: this.lastPongTime,
      latency: this.lastPongTime > this.lastPingTime 
        ? this.lastPongTime - this.lastPingTime 
        : null,
    };
  }
}