export type OCRProvider = "google_vision" | "aws_textract" | "tesseract" | "stub";

export interface OCRConfig {
  provider: OCRProvider;
  googleVision?: {
    apiKey?: string;
    projectId?: string;
  };
  awsTextract?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };
  tesseract?: {
    language?: string;
    dataPath?: string;
  };
}

export function getOCRConfig(): OCRConfig {
  const provider = (process.env.OCR_PROVIDER || "stub") as OCRProvider;

  return {
    provider,
    googleVision: {
      apiKey: process.env.GOOGLE_VISION_API_KEY,
      projectId: process.env.GOOGLE_VISION_PROJECT_ID,
    },
    awsTextract: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
    },
    tesseract: {
      language: process.env.TESSERACT_LANGUAGE || "tur+eng",
      dataPath: process.env.TESSERACT_DATA_PATH,
    },
  };
}

export function validateOCRConfig(config: OCRConfig): void {
  switch (config.provider) {
    case "google_vision":
      if (!config.googleVision?.apiKey) {
        throw new Error("GOOGLE_VISION_API_KEY is required when OCR_PROVIDER=google_vision");
      }
      break;
    case "aws_textract":
      if (!config.awsTextract?.accessKeyId || !config.awsTextract?.secretAccessKey) {
        throw new Error(
          "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when OCR_PROVIDER=aws_textract"
        );
      }
      break;
    case "tesseract":
      // Tesseract doesn't require additional config
      break;
    case "stub":
      // Stub doesn't require config
      break;
    default:
      throw new Error(`Unknown OCR provider: ${config.provider}`);
  }
}



