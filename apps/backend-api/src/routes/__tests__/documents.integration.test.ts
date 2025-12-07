// Import env setup FIRST - must run before any routes/services that use config
import "../../test-utils/env-setup.js";

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import {
  createTestApp,
  createTestUser,
  getAuthToken,
  createTestClientCompany,
  createTestDocument,
  getTestPrisma,
} from "../../test-utils";
import { Readable } from "stream";

async function getDocumentProcessor() {
  const module = await import("../../../../worker-jobs/src/processors/document-processor");
  return new module.DocumentProcessor();
}

describe("Documents & Processing Integration Tests", () => {
  const app = createTestApp();

  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let authToken: string;
  let clientCompany: Awaited<ReturnType<typeof createTestClientCompany>>;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: `documents-${Date.now()}@example.com`,
    });
    authToken = await getAuthToken(testUser.user.email, "Test123!@#", app);
    clientCompany = await createTestClientCompany({
      tenantId: testUser.tenant.id,
    });
  });

  describe("POST /api/v1/documents/upload", () => {
    it("should create Document with status UPLOADED", async () => {
      // Ensure testUser is visible before making request
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Create a small test file buffer (simulating a PDF)
      const testFileBuffer = Buffer.from("Test PDF content");
      
      const response = await request(app)
        .post("/api/v1/documents/upload")
        .set("Authorization", `Bearer ${authToken}`)
        .set("X-Tenant-Id", testUser.tenant.id)
        .field("clientCompanyId", clientCompany.id)
        .field("type", "INVOICE")
        .attach("file", testFileBuffer, "test-document.pdf")
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe("UPLOADED");
      expect(response.body.data.originalFileName).toBe("test-document.pdf");

      // Verify in database
      // Reuse prisma from above (line 41)
      const document = await prisma.document.findUnique({
        where: { id: response.body.data.id },
      });
      expect(document).toBeDefined();
      expect(document?.status).toBe("UPLOADED");
      expect(document?.tenantId).toBe(testUser.tenant.id);

      // Verify processing job was created
      // Reuse prisma from above (line 41)
      const job = await prisma.documentProcessingJob.findUnique({
        where: { documentId: document!.id },
      });
      expect(job).toBeDefined();
      expect(job?.status).toBe("PENDING");
    });
  });

  describe("Document Processing", () => {
    it("should process document and create OCR result, parsed data, and risk features", async () => {
      // Create a document with a file in storage
      const testFileBuffer = Buffer.from("Test PDF content for processing");
      const storage = (await import("@repo/config")).getStorage();
      const storagePath = `documents/${testUser.tenant.id}/test-process-${Date.now()}.pdf`;
      
      // Upload file to storage
      const fileStream = Readable.from(testFileBuffer);
      await storage.uploadObject(testUser.tenant.id, storagePath, fileStream, {
        contentType: "application/pdf",
        contentLength: testFileBuffer.length,
      });

      // Create document record
      const document = await createTestDocument({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
        uploadUserId: testUser.user.id,
        storagePath,
        status: "UPLOADED",
      });

      // Ensure document is committed and visible to worker-jobs Prisma client
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      // Verify document exists before processing
      const verifyDocument = await prisma.document.findUnique({
        where: { id: document.id },
      });
      if (!verifyDocument) {
        throw new Error(`Document ${document.id} not found after creation`);
      }

      // Create processing job
      await prisma.documentProcessingJob.create({
        data: {
          tenantId: testUser.tenant.id,
          documentId: document.id,
          status: "PENDING",
          attemptsCount: 0,
        },
      });

      // Ensure job is committed
      await prisma.$queryRaw`SELECT 1`;
      
      // Additional commit check to ensure document is visible to worker-jobs Prisma client
      // The worker-jobs uses a separate Prisma client instance
      await new Promise((resolve) => setTimeout(resolve, 100));
      await prisma.$queryRaw`SELECT 1`;

      // Verify document is visible before processing
      const verifyDocumentAgain = await prisma.document.findUnique({
        where: { id: document.id },
      });
      if (!verifyDocumentAgain) {
        throw new Error(`Document ${document.id} not visible to Prisma client before processing`);
      }

      // Process the document using the processor from worker-jobs
      const documentProcessor = await getDocumentProcessor();
      await documentProcessor.processDocument(testUser.tenant.id, document.id);

      // Verify document status changed to PROCESSED
      const processedDocument = await prisma.document.findUnique({
        where: { id: document.id },
      });
      expect(processedDocument?.status).toBe("PROCESSED");

      // Verify OCR result exists
      const ocrResult = await prisma.documentOCRResult.findUnique({
        where: { documentId: document.id },
      });
      expect(ocrResult).toBeDefined();
      expect(ocrResult?.rawText).toBeDefined();
      expect(ocrResult?.ocrEngine).toBeDefined();

      // Verify parsed data exists
      const parsedData = await prisma.documentParsedData.findUnique({
        where: { documentId: document.id },
      });
      expect(parsedData).toBeDefined();
      expect(parsedData?.documentType).toBeDefined();
      expect(parsedData?.fields).toBeDefined();

      // Verify risk features exist
      const riskFeatures = await prisma.documentRiskFeatures.findUnique({
        where: { documentId: document.id },
      });
      expect(riskFeatures).toBeDefined();
      expect(riskFeatures?.features).toBeDefined();
      expect(riskFeatures?.riskFlags).toBeDefined();
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent user from another tenant accessing document", async () => {
      // Create document in test user's tenant
      const document = await createTestDocument({
        tenantId: testUser.tenant.id,
        clientCompanyId: clientCompany.id,
        uploadUserId: testUser.user.id,
      });

      // Create another tenant and user
      const otherTenant = await createTestUser({
        email: `other-doc-tenant-${Date.now()}@example.com`,
      });
      
      // Ensure both users are visible
      const prisma = getTestPrisma();
      await prisma.$queryRaw`SELECT 1`;
      
      const otherToken = await getAuthToken(
        otherTenant.user.email,
        "Test123!@#",
        app
      );

      // Try to access document from other tenant
      const response = await request(app)
        .get(`/api/v1/documents/${document.id}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .set("X-Tenant-Id", otherTenant.tenant.id)
        .expect(404); // Should be not found (tenant isolation returns 404)

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });
  });
});

