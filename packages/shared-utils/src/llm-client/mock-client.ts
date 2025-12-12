import type { LLMClient } from "./interface";

/**
 * Mock LLM Client
 * 
 * Returns deterministic mock responses for local development and testing
 * when no real API keys are configured.
 */
export class MockLLMClient implements LLMClient {
  async generateText(input: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<string> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return a mock response based on the prompt
    const prompt = input.userPrompt.toLowerCase();

    if (prompt.includes("risk") || prompt.includes("risk")) {
      return `Bu bir örnek risk özeti yanıtıdır. Gerçek üretim ortamında burada AI tarafından oluşturulmuş detaylı bir risk analizi yer alacaktır. Kullanıcının sorusu: "${input.userPrompt}"`;
    }

    if (prompt.includes("portföy") || prompt.includes("portfolio")) {
      return `Bu bir örnek portföy özeti yanıtıdır. Gerçek üretim ortamında burada AI tarafından oluşturulmuş müşteri portföyü analizi yer alacaktır.`;
    }

    // Default mock response
    return `Bu bir örnek yanıttır. Gerçek üretim ortamında burada AI tarafından oluşturulmuş bir yanıt yer alacaktır. Sorunuz: "${input.userPrompt}"`;
  }

  async generateJSON<T = any>(input: {
    systemPrompt?: string;
    userPrompt: string;
    jsonSchema?: object;
    maxTokens?: number;
  }): Promise<T> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock JSON response
    return {} as T;
  }
}




