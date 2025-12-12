import { describe, it, expect, beforeEach, vi } from "vitest";
import { eventStreamService, EventStreamService } from "../event-stream-service";
import type { Response } from "express";

describe("EventStreamService", () => {
  let service: EventStreamService;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    service = new EventStreamService();
    mockResponse = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    };
  });

  it("should add a connection", () => {
    const connectionId = service.addConnection("user-1", "tenant-1", mockResponse as Response);

    expect(connectionId).toBeDefined();
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
  });

  it("should remove a connection", () => {
    const connectionId = service.addConnection("user-1", "tenant-1", mockResponse as Response);
    const initialCount = service.getConnectionCount();

    service.removeConnection(connectionId);

    expect(service.getConnectionCount()).toBeLessThan(initialCount);
  });

  it("should broadcast to user", () => {
    const connectionId = service.addConnection("user-1", "tenant-1", mockResponse as Response);

    service.broadcastToUser("user-1", {
      type: "message",
      payload: { test: "data" },
      timestamp: new Date().toISOString(),
    });

    expect(mockResponse.write).toHaveBeenCalled();
  });

  it("should broadcast to tenant", () => {
    service.addConnection("user-1", "tenant-1", mockResponse as Response);
    const mockResponse2 = { ...mockResponse, write: vi.fn() };
    service.addConnection("user-2", "tenant-1", mockResponse2 as Response);

    service.broadcastToTenant("tenant-1", {
      type: "notification",
      payload: { test: "data" },
      timestamp: new Date().toISOString(),
    });

    expect(mockResponse.write).toHaveBeenCalled();
    expect(mockResponse2.write).toHaveBeenCalled();
  });

  it("should get connection count", () => {
    expect(service.getConnectionCount()).toBe(0);

    service.addConnection("user-1", "tenant-1", mockResponse as Response);
    expect(service.getConnectionCount()).toBe(1);

    service.addConnection("user-2", "tenant-1", mockResponse as Response);
    expect(service.getConnectionCount()).toBe(2);
  });
});

