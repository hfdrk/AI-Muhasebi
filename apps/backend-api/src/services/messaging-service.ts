/**
 * Messaging Service
 * 
 * Handles direct messaging between accountants and clients
 */

import { prisma } from "../lib/prisma";
import { NotFoundError, ForbiddenError } from "@repo/shared-utils";

export interface MessageThread {
  id: string;
  tenantId: string;
  clientCompanyId: string | null;
  subject: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    lastReadAt: Date | null;
  }>;
  unreadCount?: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateMessageThreadInput {
  tenantId: string;
  clientCompanyId?: string | null;
  subject?: string | null;
  participantUserIds: string[];
}

export interface SendMessageInput {
  threadId: string;
  senderId: string;
  content: string;
}

export class MessagingService {
  /**
   * Create a new message thread
   */
  async createThread(input: CreateMessageThreadInput): Promise<MessageThread> {
    let finalParticipantIds = [...input.participantUserIds];

    // If client company is provided, automatically add ReadOnly users for that company
    if (input.clientCompanyId) {
      const clientCompany = await prisma.clientCompany.findFirst({
        where: {
          id: input.clientCompanyId,
          tenantId: input.tenantId,
        },
      });

      if (!clientCompany) {
        throw new NotFoundError("Client company not found");
      }

      // Find ReadOnly users associated with this client company (by email match)
      if (clientCompany.contactEmail) {
        const readonlyUsers = await prisma.userTenantMembership.findMany({
          where: {
            tenantId: input.tenantId,
            role: "ReadOnly",
            status: "active",
            user: {
              email: {
                equals: clientCompany.contactEmail,
                mode: "insensitive",
              },
            },
          },
          include: {
            user: true,
          },
        });

        // Add ReadOnly user IDs to participants if not already included
        readonlyUsers.forEach((membership) => {
          if (!finalParticipantIds.includes(membership.userId)) {
            finalParticipantIds.push(membership.userId);
          }
        });
      }
    }

    // Verify all participants belong to the tenant
    const participants = await prisma.userTenantMembership.findMany({
      where: {
        tenantId: input.tenantId,
        userId: { in: finalParticipantIds },
        status: "active",
      },
      include: {
        user: true,
      },
    });

    if (participants.length !== finalParticipantIds.length) {
      throw new ForbiddenError("Some participants are not members of this tenant");
    }

    // Create thread
    const thread = await prisma.messageThread.create({
      data: {
        tenantId: input.tenantId,
        clientCompanyId: input.clientCompanyId || null,
        subject: input.subject || null,
        participants: {
          create: finalParticipantIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    return this.mapToMessageThread(thread);
  }

  /**
   * List message threads for a user
   */
  async listThreads(
    tenantId: string,
    userId: string,
    filters: {
      clientCompanyId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    data: MessageThread[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    const where: any = {
      tenantId,
      participants: {
        some: {
          userId,
        },
      },
    };

    if (filters.clientCompanyId) {
      where.clientCompanyId = filters.clientCompanyId;
    }

    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        include: {
          participants: {
            include: {
              user: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.messageThread.count({ where }),
    ]);

    // Calculate unread counts for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const participant = thread.participants.find((p) => p.userId === userId);
        const lastReadAt = participant?.lastReadAt;

        const unreadCount = await prisma.message.count({
          where: {
            threadId: thread.id,
            senderId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });

        return {
          ...this.mapToMessageThread(thread),
          unreadCount,
        };
      })
    );

    return {
      data: threadsWithUnread,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single thread with messages
   */
  async getThread(
    tenantId: string,
    threadId: string,
    userId: string
  ): Promise<MessageThread & { messages: Message[] }> {
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        tenantId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      throw new NotFoundError("Message thread not found");
    }

    // Update last read time for this user
    await prisma.messageThreadParticipant.updateMany({
      where: {
        threadId,
        userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    return {
      ...this.mapToMessageThread(thread),
      messages: thread.messages.map(this.mapToMessage),
    };
  }

  /**
   * Send a message in a thread
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    // Verify thread exists and user is a participant
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: input.threadId,
        participants: {
          some: {
            userId: input.senderId,
          },
        },
      },
    });

    if (!thread) {
      throw new NotFoundError("Message thread not found or you are not a participant");
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        threadId: input.threadId,
        senderId: input.senderId,
        content: input.content,
      },
      include: {
        sender: true,
      },
    });

    // Update thread's last message time
    await prisma.messageThread.update({
      where: { id: input.threadId },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return this.mapToMessage(message);
  }

  /**
   * Mark messages as read
   */
  async markAsRead(threadId: string, userId: string): Promise<void> {
    // Verify user is a participant
    const participant = await prisma.messageThreadParticipant.findFirst({
      where: {
        threadId,
        userId,
      },
    });

    if (!participant) {
      throw new NotFoundError("You are not a participant in this thread");
    }

    // Mark all unread messages as read
    await prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    // Update participant's last read time
    await prisma.messageThreadParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });
  }

  private mapToMessageThread(thread: any): MessageThread {
    return {
      id: thread.id,
      tenantId: thread.tenantId,
      clientCompanyId: thread.clientCompanyId,
      subject: thread.subject,
      lastMessageAt: thread.lastMessageAt,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      participants: thread.participants.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user.fullName,
        userEmail: p.user.email,
        lastReadAt: p.lastReadAt,
      })),
    };
  }

  private mapToMessage(message: any): Message {
    return {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      senderEmail: message.sender.email,
      content: message.content,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}

export const messagingService = new MessagingService();

