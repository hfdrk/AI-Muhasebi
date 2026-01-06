/**
 * Event Stream Service
 * 
 * Manages Server-Sent Events (SSE) connections for real-time updates
 * Supports: messages, notifications, document status, contract expiration
 */

import type { Response } from "express";
import { logger } from "@repo/shared-utils";

export type EventType = "message" | "notification" | "document_status" | "contract_expiration" | "ping";

export interface EventData {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface Connection {
  userId: string;
  tenantId: string;
  response: Response;
  lastPing: Date;
}

export class EventStreamService {
  private connections: Map<string, Connection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start ping interval to keep connections alive and detect dead connections
    this.startPingInterval();
  }

  /**
   * Add a new SSE connection
   */
  addConnection(userId: string, tenantId: string, response: Response): string {
    const connectionId = `${userId}:${tenantId}:${Date.now()}`;
    
    // Set SSE headers
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

    // Store connection
    this.connections.set(connectionId, {
      userId,
      tenantId,
      response,
      lastPing: new Date(),
    });

    // Send initial connection event
    this.sendEvent(connectionId, {
      type: "ping",
      payload: { message: "connected" },
      timestamp: new Date().toISOString(),
    });

    // Handle client disconnect
    response.on("close", () => {
      this.removeConnection(connectionId);
    });

    logger.info(`[EventStream] Connection added: ${connectionId} (Total: ${this.connections.size})`);
    return connectionId;
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        // Connection already closed
      }
      this.connections.delete(connectionId);
      logger.info(`[EventStream] Connection removed: ${connectionId} (Total: ${this.connections.size})`);
    }
  }

  /**
   * Send event to a specific connection
   */
  private sendEvent(connectionId: string, event: EventData): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      const data = JSON.stringify(event);
      connection.response.write(`data: ${data}\n\n`);
      connection.lastPing = new Date();
    } catch (error: any) {
      logger.error(`[EventStream] Error sending event to ${connectionId}:`, { error: error.message });
      this.removeConnection(connectionId);
    }
  }

  /**
   * Broadcast event to all connections for a user
   */
  broadcastToUser(userId: string, event: EventData): void {
    let sent = 0;
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.userId === userId) {
        this.sendEvent(connectionId, event);
        sent++;
      }
    }
    if (sent > 0) {
      logger.info(`[EventStream] Broadcasted ${event.type} to ${sent} connection(s) for user ${userId}`);
    }
  }

  /**
   * Broadcast event to all connections for a tenant
   */
  broadcastToTenant(tenantId: string, event: EventData): void {
    let sent = 0;
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.tenantId === tenantId) {
        this.sendEvent(connectionId, event);
        sent++;
      }
    }
    if (sent > 0) {
      logger.info(`[EventStream] Broadcasted ${event.type} to ${sent} connection(s) for tenant ${tenantId}`);
    }
  }

  /**
   * Broadcast event to specific users in a tenant
   */
  broadcastToUsers(userIds: string[], tenantId: string, event: EventData): void {
    const userIdSet = new Set(userIds);
    let sent = 0;
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.tenantId === tenantId && userIdSet.has(connection.userId)) {
        this.sendEvent(connectionId, event);
        sent++;
      }
    }
    if (sent > 0) {
      logger.info(`[EventStream] Broadcasted ${event.type} to ${sent} connection(s) for users in tenant ${tenantId}`);
    }
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = new Date();
      const pingEvent: EventData = {
        type: "ping",
        payload: { timestamp: now.toISOString() },
        timestamp: now.toISOString(),
      };

      // Send ping to all connections and remove dead ones
      for (const [connectionId, connection] of this.connections.entries()) {
        try {
          connection.response.write(`data: ${JSON.stringify(pingEvent)}\n\n`);
          connection.lastPing = now;
        } catch (error) {
          // Connection is dead, remove it
          this.removeConnection(connectionId);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }
  }
}

export const eventStreamService = new EventStreamService();


