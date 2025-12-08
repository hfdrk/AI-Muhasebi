import type { DocumentProcessingJob } from "@repo/core-domain";
export declare class DocumentJobService {
    getPendingJobs(limit?: number): Promise<DocumentProcessingJob[]>;
    markJobInProgress(jobId: string): Promise<void>;
    markJobSuccess(jobId: string, data: {
        tenantId: string;
        documentId: string;
        ocrResult: {
            rawText: string;
            ocrEngine: string;
            confidence?: number | null;
        };
        parsedData: {
            documentType: string;
            fields: any;
            parserVersion: string;
        };
        riskFeatures: {
            features: any;
            riskFlags: any[];
            riskScore?: number | null;
        };
    }): Promise<void>;
    markJobFailed(jobId: string, errorMessage: string, attempts: number): Promise<void>;
}
export declare const documentJobService: DocumentJobService;
//# sourceMappingURL=document-job-service.d.ts.map