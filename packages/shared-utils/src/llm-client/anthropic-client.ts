import type { LLMClient, LLMClientConfig } from "./interface";

/**
 * Anthropic Claude LLM Client
 * 
 * Uses Anthropic API (Claude)
 */
export class AnthropicClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMClientConfig) {
    if (!config.apiKey) {
      throw new Error("Anthropic API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "claude-3-sonnet-20240229";
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature ?? 0.7;
  }

  async generateText(input: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<string> {
    try {
      const messages: Array<{ role: string; content: string }> = [
        {
          role: "user",
          content: input.userPrompt,
        },
      ];

      const body: any = {
        model: this.model,
        max_tokens: input.maxTokens || this.maxTokens,
        temperature: this.temperature,
        messages,
      };

      // Anthropic supports system prompts in the body
      if (input.systemPrompt) {
        body.system = input.systemPrompt;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Anthropic returns content as an array of text blocks
      if (data.content && Array.isArray(data.content) && data.content.length > 0) {
        return data.content[0].text || "Yanıt alınamadı.";
      }
      
      return "Yanıt alınamadı.";
    } catch (error: any) {
      // Wrap network errors in a user-friendly message
      throw new Error(`AI yanıtı oluşturulurken bir hata oluştu: ${error.message}`);
    }
  }
}


