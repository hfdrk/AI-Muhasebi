/**
 * LLM Client Interface
 * 
 * Abstraction for different LLM providers (OpenAI, Anthropic, etc.)
 */
export interface LLMClient {
  /**
   * Generate text using the LLM
   * @param input - Input parameters
   * @returns Generated text response
   */
  generateText(input: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<string>;

  /**
   * Generate structured JSON output using the LLM
   * @param input - Input parameters with JSON schema
   * @returns Parsed JSON object
   */
  generateJSON<T = any>(input: {
    systemPrompt?: string;
    userPrompt: string;
    jsonSchema?: object;
    maxTokens?: number;
  }): Promise<T>;
}

/**
 * LLM Client Configuration
 */
export interface LLMClientConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}




