import { Readable } from "stream";
import type { IObjectStorage, FileMetadata } from "./interface";

interface S3StorageConfig {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

/**
 * S3-compatible object storage adapter.
 * Works with AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2, etc.
 *
 * Uses the AWS SDK v3 (@aws-sdk/client-s3 + @aws-sdk/s3-request-presigner).
 * These are optional peer dependencies — only required when STORAGE_TYPE=s3.
 */
export class S3ObjectStorage implements IObjectStorage {
  private config: S3StorageConfig;
  private client: any; // Lazily loaded S3Client
  private presigner: any; // Lazily loaded getSignedUrl

  constructor(config: S3StorageConfig) {
    this.config = config;
    if (!config.bucket) {
      throw new Error("S3 storage requires STORAGE_BUCKET_NAME to be set");
    }
  }

  private async getClient() {
    if (this.client) return this.client;

    try {
      const { S3Client } = await import("@aws-sdk/client-s3");

      const clientConfig: Record<string, any> = {
        region: this.config.region,
      };

      // Explicit credentials (for non-AWS environments like MinIO)
      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      }

      // Custom endpoint (MinIO, DigitalOcean Spaces, etc.)
      if (this.config.endpoint) {
        clientConfig.endpoint = this.config.endpoint;
        clientConfig.forcePathStyle = true; // Required for MinIO
      }

      this.client = new S3Client(clientConfig);
      return this.client;
    } catch {
      throw new Error(
        "S3 storage requires @aws-sdk/client-s3 package. Install it with: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner"
      );
    }
  }

  /**
   * Build the S3 object key with tenant isolation: {tenantId}/{key}
   */
  private getObjectKey(tenantId: string, key: string): string {
    return `${tenantId}/${key}`;
  }

  async uploadObject(
    tenantId: string,
    key: string,
    stream: Readable,
    metadata?: FileMetadata
  ): Promise<string> {
    const client = await this.getClient();
    const { Upload } = await import("@aws-sdk/lib-storage");

    const objectKey = this.getObjectKey(tenantId, key);

    const upload = new Upload({
      client,
      params: {
        Bucket: this.config.bucket,
        Key: objectKey,
        Body: stream,
        ContentType: metadata?.contentType || "application/octet-stream",
        ...(metadata?.contentLength && { ContentLength: metadata.contentLength }),
      },
    });

    await upload.done();
    return key;
  }

  async getObjectStream(tenantId: string, key: string): Promise<Readable> {
    const client = await this.getClient();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    const objectKey = this.getObjectKey(tenantId, key);

    const response = await client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      })
    );

    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // AWS SDK v3 returns a web ReadableStream — convert to Node Readable
    if (response.Body instanceof Readable) {
      return response.Body;
    }

    return Readable.from(response.Body as any);
  }

  async deleteObject(tenantId: string, key: string): Promise<void> {
    const client = await this.getClient();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

    const objectKey = this.getObjectKey(tenantId, key);

    await client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      })
    );
  }

  async getObjectUrl(tenantId: string, key: string): Promise<string> {
    const client = await this.getClient();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const objectKey = this.getObjectKey(tenantId, key);

    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
      { expiresIn: 3600 } // 1 hour signed URL
    );

    return url;
  }
}
