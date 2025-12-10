# ZIP File/Folder Upload with AI Risk Analysis - Implementation Plan

## Overview
This document outlines the implementation plan for adding zip file/folder upload functionality with AI-powered risk analysis for all extracted documents.

## Current Architecture Analysis

### Document Upload Flow
1. **Frontend**: `DocumentUploadModal` → `uploadDocument()` API client
2. **Backend Route**: `POST /api/v1/documents/upload` (multer single file)
3. **Document Service**: `uploadDocument()` → validates → stores → creates `Document` record
4. **Processing Job**: Creates `DocumentProcessingJob` with status `PENDING`
5. **Worker**: Polls jobs every 5 seconds → processes via `DocumentProcessor`
6. **Processing Pipeline**: OCR → Parse → Risk Features → Risk Score Calculation

### Key Components
- **Storage**: `IObjectStorage` interface (local filesystem implementation)
- **File Upload**: Multer with memory storage, max file size limits
- **Job Queue**: `DocumentProcessingJob` table with status tracking
- **AI Services**: LLM client (OpenAI/Anthropic/Mock) for text generation
- **Risk Analysis**: Multi-step pipeline (OCR → Parse → Risk Features → Risk Score)

## Implementation Plan

### Phase 1: Backend - ZIP File Support

#### 1.1 Add ZIP MIME Type Support
**File**: `apps/backend-api/src/routes/document-routes.ts`
- Add `application/zip`, `application/x-zip-compressed` to allowed MIME types
- Increase max file size limit for zip files (e.g., 100MB)

#### 1.2 Create ZIP Extraction Service
**New File**: `apps/backend-api/src/services/zip-extraction-service.ts`
```typescript
export class ZipExtractionService {
  async extractZipFile(zipBuffer: Buffer): Promise<ExtractedFile[]>
  async validateExtractedFiles(files: ExtractedFile[]): Promise<void>
  async filterSupportedFiles(files: ExtractedFile[]): ExtractedFile[]
}
```

**Dependencies**: 
- `adm-zip` or `yauzl` for zip extraction
- File validation (size, type, security checks)

#### 1.3 Create Batch Upload Service
**New File**: `apps/backend-api/src/services/batch-upload-service.ts`
```typescript
export class BatchUploadService {
  async uploadZipContents(
    tenantId: string,
    userId: string,
    zipFile: Buffer,
    metadata: BatchUploadMetadata
  ): Promise<BatchUploadResult>
}
```

**Features**:
- Extract zip file
- Validate all files
- Create multiple `Document` records
- Create processing jobs for each document
- Return batch summary (total, successful, failed)

#### 1.4 Add Batch Upload Route
**File**: `apps/backend-api/src/routes/document-routes.ts`
**New Route**: `POST /api/v1/documents/upload-batch`
- Accept zip file via multer
- Accept metadata: `clientCompanyId`, `type` (optional, can auto-detect)
- Process via `BatchUploadService`
- Return batch result with document IDs

#### 1.5 Create Batch Processing Job Model (Optional)
**Consideration**: Track batch operations separately
- Option A: Use existing `DocumentProcessingJob` (one per document)
- Option B: Add `BatchProcessingJob` table for tracking batch operations
- **Recommendation**: Option A (simpler, reuse existing infrastructure)

### Phase 2: AI Risk Analysis for Batch Uploads

#### 2.1 Enhanced AI Analysis Service
**New File**: `apps/backend-api/src/services/batch-ai-analysis-service.ts`
```typescript
export class BatchAIAnalysisService {
  async analyzeBatchContents(
    tenantId: string,
    documentIds: string[]
  ): Promise<BatchAnalysisResult>
  
  async generateBatchRiskSummary(
    tenantId: string,
    clientCompanyId: string,
    documentIds: string[]
  ): Promise<string>
}
```

**Features**:
- Analyze all documents in batch together
- Generate comprehensive risk summary
- Identify patterns across documents
- Cross-document risk correlation
- Generate executive summary report

#### 2.2 Integrate with LLM Client
**File**: `packages/shared-utils/src/llm-client/interface.ts`
- Extend `LLMClient` interface if needed for batch analysis
- Use existing `generateText()` method with comprehensive prompts

**AI Analysis Prompts**:
- Document type detection
- Risk pattern identification
- Cross-document anomaly detection
- Summary generation

#### 2.3 Batch Risk Analysis Route
**New Route**: `POST /api/v1/documents/batch/:batchId/analyze`
- Trigger AI analysis for a batch
- Return analysis results
- Store analysis in database (new table or extend existing)

### Phase 3: Database Schema Updates

#### 3.1 Batch Upload Tracking (Optional)
**New Table**: `BatchUpload` (if needed)
```prisma
model BatchUpload {
  id            String   @id @default(cuid())
  tenantId      String
  userId        String
  clientCompanyId String
  zipFileName   String
  totalFiles    Int
  processedFiles Int
  failedFiles   Int
  status        String   // PROCESSING, COMPLETED, FAILED
  createdAt     DateTime
  completedAt   DateTime?
}
```

**Alternative**: Track via existing `Document` table with `uploadSource: "zip_batch"` and metadata

#### 3.2 Batch Analysis Results (Optional)
**New Table**: `BatchAnalysisResult`
```prisma
model BatchAnalysisResult {
  id            String   @id @default(cuid())
  batchUploadId String
  tenantId      String
  clientCompanyId String
  summary       Text
  riskScore     Decimal
  findings      Json
  createdAt     DateTime
}
```

**Recommendation**: Start without new tables, use existing schema with metadata fields

### Phase 4: Frontend Implementation

#### 4.1 Update Upload Modal
**File**: `apps/web-app/src/components/document-upload-modal.tsx`
- Add toggle/option: "Single File" vs "ZIP File/Folder"
- Add file input that accepts `.zip` files
- Show upload progress for batch operations
- Display batch summary after upload

#### 4.2 Batch Upload Progress Component
**New File**: `apps/web-app/src/components/batch-upload-progress.tsx`
- Show total files in zip
- Progress bar for processing
- List of files with status (pending, processing, completed, failed)
- Real-time updates via polling or WebSocket

#### 4.3 Batch Analysis Results View
**New File**: `apps/web-app/src/components/batch-analysis-results.tsx`
- Display AI-generated summary
- Show risk breakdown for batch
- Highlight key findings
- Export analysis report

#### 4.4 Update API Client
**File**: `packages/api-client/src/clients/document-client.ts`
- Add `uploadZipFile()` function
- Add `getBatchUploadStatus()` function
- Add `analyzeBatch()` function
- Add `getBatchAnalysisResults()` function

### Phase 5: Worker Jobs Enhancement

#### 5.1 Batch Processing Support
**File**: `apps/worker-jobs/src/worker.ts`
- No changes needed (existing job queue handles individual documents)
- Consider: Priority queue for batch documents vs single uploads

#### 5.2 Batch Completion Notification
**Enhancement**: When all documents in a batch are processed:
- Trigger batch AI analysis automatically
- Send notification to user
- Update batch status

### Phase 6: Security & Validation

#### 6.1 ZIP File Security
- Validate zip file structure
- Check for zip bombs (nested zips, excessive files)
- Limit max files per zip (e.g., 100 files)
- Limit max total size after extraction
- Scan for malicious files

#### 6.2 File Type Validation
- Only extract supported file types (PDF, images)
- Skip unsupported files with warning
- Validate file names (no path traversal)

#### 6.3 Resource Limits
- Max zip file size: 100MB
- Max files per zip: 100
- Max total extracted size: 500MB
- Timeout for extraction: 60 seconds

## Implementation Steps

### Step 1: Backend Foundation
1. ✅ Add zip MIME type support
2. ✅ Install zip extraction library (`adm-zip`)
3. ✅ Create `ZipExtractionService`
4. ✅ Create `BatchUploadService`
5. ✅ Add batch upload route
6. ✅ Add validation and security checks

### Step 2: AI Analysis Integration
1. ✅ Create `BatchAIAnalysisService`
2. ✅ Design AI prompts for batch analysis
3. ✅ Integrate with existing LLM client
4. ✅ Add batch analysis route
5. ✅ Store analysis results

### Step 3: Frontend Implementation
1. ✅ Update upload modal for zip support
2. ✅ Create batch upload progress component
3. ✅ Create batch analysis results view
4. ✅ Update API client
5. ✅ Add real-time progress updates

### Step 4: Testing & Polish
1. ✅ Unit tests for zip extraction
2. ✅ Integration tests for batch upload
3. ✅ Test with various zip file structures
4. ✅ Test AI analysis with real documents
5. ✅ Performance testing (large batches)

## Technical Considerations

### Dependencies to Add
```json
{
  "adm-zip": "^0.5.10",  // For zip extraction
  "@types/adm-zip": "^0.5.0"
}
```

### File Structure
```
apps/backend-api/src/
  services/
    zip-extraction-service.ts (NEW)
    batch-upload-service.ts (NEW)
    batch-ai-analysis-service.ts (NEW)
  routes/
    document-routes.ts (MODIFY - add batch route)

apps/web-app/src/
  components/
    batch-upload-progress.tsx (NEW)
    batch-analysis-results.tsx (NEW)
    document-upload-modal.tsx (MODIFY)

packages/api-client/src/clients/
  document-client.ts (MODIFY - add batch methods)
```

### API Endpoints

#### New Endpoints
1. `POST /api/v1/documents/upload-batch`
   - Upload zip file
   - Returns: `{ data: { batchId, totalFiles, documentIds, status } }`

2. `GET /api/v1/documents/batch/:batchId/status`
   - Get batch processing status
   - Returns: `{ data: { status, processed, failed, documents: [...] } }`

3. `POST /api/v1/documents/batch/:batchId/analyze`
   - Trigger AI analysis for batch
   - Returns: `{ data: { analysisId, summary, riskScore } }`

4. `GET /api/v1/documents/batch/:batchId/analysis`
   - Get batch analysis results
   - Returns: `{ data: { summary, findings, riskScore } }`

## Risk Analysis AI Prompts

### Batch Analysis Prompt Template
```
You are analyzing a batch of financial documents for risk assessment.

Documents in batch: {count}
Client Company: {companyName}
Upload Date: {date}

Document Summary:
{documentSummaries}

Analyze the following:
1. Overall risk level of the batch
2. Common risk patterns across documents
3. Anomalies or inconsistencies
4. Recommendations for review

Provide a comprehensive risk analysis report in Turkish.
```

## Success Metrics
- ✅ Support zip files up to 100MB
- ✅ Process up to 100 files per zip
- ✅ Extract and validate files in < 30 seconds
- ✅ Generate AI analysis in < 60 seconds
- ✅ Real-time progress updates
- ✅ Comprehensive risk analysis report

## Future Enhancements
- Support for other archive formats (RAR, 7z)
- Drag-and-drop folder upload (client-side zip creation)
- Scheduled batch uploads
- Batch template matching
- Advanced cross-document correlation analysis
