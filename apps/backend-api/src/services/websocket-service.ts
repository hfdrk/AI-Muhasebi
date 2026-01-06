import { Server as HTTPServer } from "http";
// @ts-ignore - socket.io types may not be available
import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "@repo/shared-utils";
import { prisma } from "../lib/prisma";

/**
 * WebSocket Service
 * 
 * Provides real-time features using WebSocket:
 * - Real-time messaging updates
 * - Live notification delivery
 * - Real-time document processing status
 * - Live risk score updates
 * - Online/offline user status
 * - Typing indicators
 */
export interface WebSocketMessage {
  type: "notification" | "message" | "document_status" | "risk_update" | "typing" | "user_status";
  payload: Record<string, unknown>;
  timestamp: Date;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private tenantSockets: Map<string, Set<string>> = new Map(); // tenantId -> Set of socketIds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      },
      path: "/socket.io",
    });

    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info("WebSocket server initialized");
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Authenticate socket
    socket.on("authenticate", async (data: { token: string; tenantId: string }) => {
      try {
        // Verify token and get user (simplified - would use proper auth)
        const { verifyToken } = await import("@repo/shared-utils");
        const decoded = verifyToken(data.token);
        const userId = decoded.userId;
        const tenantId = data.tenantId || decoded.tenantId;

        // Store socket mappings
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);
        this.socketUsers.set(socket.id, userId);

        if (tenantId) {
          if (!this.tenantSockets.has(tenantId)) {
            this.tenantSockets.set(tenantId, new Set());
          }
          this.tenantSockets.get(tenantId)!.add(socket.id);
        }

        socket.join(`user:${userId}`);
        if (tenantId) {
          socket.join(`tenant:${tenantId}`);
        }

        socket.emit("authenticated", { success: true });

        // Notify others of user online status
        this.broadcastToTenant(tenantId, {
          type: "user_status",
          payload: { userId, status: "online" },
          timestamp: new Date(),
        });

        logger.info(`WebSocket authenticated: ${socket.id} -> user ${userId}, tenant ${tenantId}`);
      } catch (error) {
        logger.error("WebSocket authentication error:", error);
        socket.emit("authenticated", { success: false, error: "Authentication failed" });
        socket.disconnect();
      }
    });

    // Handle typing indicators
    socket.on("typing", (data: { threadId: string; isTyping: boolean }) => {
      const userId = this.socketUsers.get(socket.id);
      if (userId) {
        socket.to(`thread:${data.threadId}`).emit("typing", {
          userId,
          threadId: data.threadId,
          isTyping: data.isTyping,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userId = this.socketUsers.get(socket.id);
      if (userId) {
        this.userSockets.get(userId)?.delete(socket.id);
        this.socketUsers.delete(socket.id);

        // Remove from tenant sockets
        for (const [tenantId, sockets] of this.tenantSockets.entries()) {
          sockets.delete(socket.id);
        }

        // Notify others of user offline status
        if (userId) {
          // Get tenant ID from socket rooms (simplified)
          const tenantRoom = Array.from(socket.rooms)
            .find((room) => typeof room === "string" && room.startsWith("tenant:"));
          const tenantId = typeof tenantRoom === "string" ? tenantRoom.replace("tenant:", "") : undefined;

          if (tenantId) {
            this.broadcastToTenant(tenantId, {
              type: "user_status",
              payload: { userId, status: "offline" },
              timestamp: new Date(),
            });
          }
        }
      }

      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  }

  /**
   * Send notification to user
   */
  sendNotification(userId: string, notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    severity?: string;
  }): void {
    if (!this.io) return;

    const message: WebSocketMessage = {
      type: "notification",
      payload: notification,
      timestamp: new Date(),
    };

    this.io.to(`user:${userId}`).emit("notification", message);
  }

  /**
   * Send message update
   */
  sendMessageUpdate(threadId: string, message: {
    id: string;
    threadId: string;
    senderId: string;
    content: string;
    createdAt: Date;
  }): void {
    if (!this.io) return;

    const wsMessage: WebSocketMessage = {
      type: "message",
      payload: message,
      timestamp: new Date(),
    };

    this.io.to(`thread:${threadId}`).emit("message", wsMessage);
  }

  /**
   * Send document processing status update
   */
  sendDocumentStatus(documentId: string, status: {
    documentId: string;
    status: string;
    progress?: number;
    message?: string;
  }): void {
    if (!this.io) return;

    const message: WebSocketMessage = {
      type: "document_status",
      payload: status,
      timestamp: new Date(),
    };

    this.io.to(`document:${documentId}`).emit("document_status", message);
  }

  /**
   * Send risk score update
   */
  sendRiskUpdate(tenantId: string, clientCompanyId: string, riskScore: {
    clientCompanyId: string;
    overallScore: number;
    severity: string;
    updatedAt: Date;
  }): void {
    if (!this.io) return;

    const message: WebSocketMessage = {
      type: "risk_update",
      payload: riskScore,
      timestamp: new Date(),
    };

    this.io.to(`tenant:${tenantId}`).emit("risk_update", message);
  }

  /**
   * Broadcast to all users in a tenant
   */
  private broadcastToTenant(tenantId: string, message: WebSocketMessage): void {
    if (!this.io) return;
    this.io.to(`tenant:${tenantId}`).emit("broadcast", message);
  }

  /**
   * Get online users for a tenant
   */
  getOnlineUsers(tenantId: string): string[] {
    const sockets = this.tenantSockets.get(tenantId) || new Set();
    const userIds = new Set<string>();

    for (const socketId of sockets) {
      const userId = this.socketUsers.get(socketId);
      if (userId) {
        userIds.add(userId);
      }
    }

    return Array.from(userIds);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }
}

export const websocketService = new WebSocketService();

