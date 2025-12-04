/**
 * Test data constants for E2E tests
 */

export const TEST_CREDENTIALS = {
  email: "test@example.com",
  password: "Test123!@#",
};

export const TEST_COMPANY = {
  name: `E2E Test Company ${Date.now()}`,
  taxNumber: `${Date.now()}`,
  legalType: "Limited" as const,
};

export const TEST_INVOICE = {
  externalId: `INV-E2E-${Date.now()}`,
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  totalAmount: "1000",
  vatAmount: "180",
  netAmount: "820",
};

export const TEST_DOCUMENT = {
  fileName: "test-document.pdf",
  type: "INVOICE" as const,
};


