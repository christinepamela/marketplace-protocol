/**
 * WebSocket Server
 * Real-time event notifications for protocol events
 * 
 * Path: src/api/websocket/server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { TokenManager } from '../core/auth';
import { InternalError } from '../core/errors';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  did?: string;
  subscriptions: Set<string>;
  isAlive: boolean;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  channel?: string;
  channels?: string[];
}

interface BroadcastMessage {
  event: string;
  data: any;
  timestamp: string;
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    console.log('✅ WebSocket server initialized on /ws');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const socket = ws as AuthenticatedWebSocket;
    socket.subscriptions = new Set();
    socket.isAlive = true;

    // Extract token from query string
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Authentication required');
      return;
    }

    // Verify JWT token
    try {
      const payload = TokenManager.verifyToken(token);
      socket.userId = payload.sub;
      socket.did = payload.did || payload.sub;

      console.log(`[WS] Client connected: ${socket.did}`);

      // Setup message handler
      socket.on('message', (data: Buffer) => {
        this.handleMessage(socket, data);
      });

      // Setup close handler
      socket.on('close', () => {
        this.handleDisconnect(socket);
      });

      // Setup pong handler (for heartbeat)
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'connected',
        userId: socket.did,
        timestamp: new Date().toISOString(),
      }));

    } catch (error: any) {
      console.error('[WS] Authentication failed:', error.message);
      socket.close(4001, 'Invalid authentication token');
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(socket: AuthenticatedWebSocket, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          if (message.channel) {
            this.subscribe(socket, message.channel);
          } else if (message.channels) {
            message.channels.forEach(ch => this.subscribe(socket, ch));
          }
          break;

        case 'unsubscribe':
          if (message.channel) {
            this.unsubscribe(socket, message.channel);
          } else if (message.channels) {
            message.channels.forEach(ch => this.unsubscribe(socket, ch));
          }
          break;

        case 'ping':
          socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        default:
          socket.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown message type: ${message.type}` 
          }));
      }
    } catch (error: any) {
      console.error('[WS] Message handling error:', error.message);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  }

  /**
   * Subscribe socket to a channel
   */
  private subscribe(socket: AuthenticatedWebSocket, channel: string): void {
    // Validate channel format (e.g., "order:ORDER_ID", "user:DID")
    if (!this.isValidChannel(channel)) {
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: `Invalid channel format: ${channel}` 
      }));
      return;
    }

    // Check authorization (user can only subscribe to their own channels or orders they're part of)
    if (!this.isAuthorized(socket, channel)) {
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: `Not authorized to subscribe to: ${channel}` 
      }));
      return;
    }

    // Add subscription
    socket.subscriptions.add(channel);

    // Track in clients map
    if (!this.clients.has(channel)) {
      this.clients.set(channel, new Set());
    }
    this.clients.get(channel)!.add(socket);

    socket.send(JSON.stringify({ 
      type: 'subscribed', 
      channel,
      timestamp: new Date().toISOString(),
    }));

    console.log(`[WS] ${socket.did} subscribed to ${channel}`);
  }

  /**
   * Unsubscribe socket from a channel
   */
  private unsubscribe(socket: AuthenticatedWebSocket, channel: string): void {
    socket.subscriptions.delete(channel);

    const channelClients = this.clients.get(channel);
    if (channelClients) {
      channelClients.delete(socket);
      if (channelClients.size === 0) {
        this.clients.delete(channel);
      }
    }

    socket.send(JSON.stringify({ 
      type: 'unsubscribed', 
      channel,
      timestamp: new Date().toISOString(),
    }));

    console.log(`[WS] ${socket.did} unsubscribed from ${channel}`);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: AuthenticatedWebSocket): void {
    console.log(`[WS] Client disconnected: ${socket.did}`);

    // Remove from all subscriptions
    socket.subscriptions.forEach(channel => {
      const channelClients = this.clients.get(channel);
      if (channelClients) {
        channelClients.delete(socket);
        if (channelClients.size === 0) {
          this.clients.delete(channel);
        }
      }
    });
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  public broadcast(channel: string, event: string, data: any): void {
    const channelClients = this.clients.get(channel);
    
    if (!channelClients || channelClients.size === 0) {
      // No subscribers, skip broadcast
      return;
    }

    const message: BroadcastMessage = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const payload = JSON.stringify(message);
    let sentCount = 0;

    channelClients.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
        sentCount++;
      }
    });

    console.log(`[WS] Broadcasted ${event} to ${sentCount} clients on ${channel}`);
  }

  /**
   * Broadcast to multiple channels at once
   */
  public broadcastToChannels(channels: string[], event: string, data: any): void {
    channels.forEach(channel => this.broadcast(channel, event, data));
  }

  /**
   * Validate channel format
   */
  private isValidChannel(channel: string): boolean {
    // Valid formats: "order:UUID", "user:DID", "proposal:UUID", "global"
    const validPatterns = [
      /^order:[a-f0-9-]{36}$/,           // order:UUID
      /^user:did:[\w:-]+$/,              // user:did:...
      /^proposal:[a-f0-9-]{36}$/,        // proposal:UUID
      /^dispute:[a-f0-9-]{36}$/,         // dispute:UUID
      /^shipment:[a-f0-9-]{36}$/,        // shipment:UUID
      /^global$/,                        // global channel
    ];

    return validPatterns.some(pattern => pattern.test(channel));
  }

  /**
   * Check if user is authorized to subscribe to channel
   * In production, this should query the database to verify permissions
   */
  private isAuthorized(socket: AuthenticatedWebSocket, channel: string): boolean {
    // Global channel - everyone can subscribe
    if (channel === 'global') {
      return true;
    }

    // User's own channel - always authorized
    if (channel === `user:${socket.did}`) {
      return true;
    }

    // For order/dispute/proposal channels, we'd need to verify in database
    // For now, allow all subscriptions (proper auth should be added in production)
    // TODO: Add database checks for order/dispute/proposal ownership
    return true;
  }

  /**
   * Heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const socket = ws as AuthenticatedWebSocket;

        if (socket.isAlive === false) {
          console.log(`[WS] Terminating dead connection: ${socket.did}`);
          return socket.terminate();
        }

        socket.isAlive = false;
        socket.ping();
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Shutdown WebSocket server gracefully
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.wss.clients.forEach(socket => {
      socket.close(1000, 'Server shutting down');
    });

    this.wss.close(() => {
      console.log('✅ WebSocket server closed');
    });
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connectedClients: number;
    activeChannels: number;
    subscriptionsByChannel: Record<string, number>;
  } {
    const subscriptionsByChannel: Record<string, number> = {};
    
    this.clients.forEach((sockets, channel) => {
      subscriptionsByChannel[channel] = sockets.size;
    });

    return {
      connectedClients: this.wss.clients.size,
      activeChannels: this.clients.size,
      subscriptionsByChannel,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(server: Server): WebSocketManager {
  if (wsManager) {
    throw new InternalError('WebSocket server already initialized');
  }
  
  wsManager = new WebSocketManager(server);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new InternalError('WebSocket server not initialized');
  }
  return wsManager;
}