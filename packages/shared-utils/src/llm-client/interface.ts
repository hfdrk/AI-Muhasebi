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




