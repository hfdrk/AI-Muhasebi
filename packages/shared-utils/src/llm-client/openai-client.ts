import type { LLMClient, LLMClientConfig } from "./interface";

/**
 * OpenAI LLM Client
 * 
 * Uses OpenAI API (GPT-4 or GPT-3.5-turbo)
 */
export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMClientConfig) {
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = config.apiKey;
    this.model = config.model || "gpt-3.5-turbo";
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature ?? 0.7;
  }

  async generateText(input: {
    systemPrompt?: string;
    userPrompt: string;
    maxTokens?: number;
  }): Promise<string> {
    try {
      const messages: Array<{ role: string; content: string }> = [];

      if (input.systemPrompt) {
        messages.push({
          role: "system",
          content: input.systemPrompt,
        });
      }

      messages.push({
        role: "user",
        content: input.userPrompt,
      });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: input.maxTokens || this.maxTokens,
          temperature: this.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: "Unknown error", type: "parse_error" } }));
        const errorMessage = errorData.error?.message || response.statusText;
        const errorType = errorData.error?.type || "api_error";
        const statusCode = response.status;
        
        // Log detailed error for debugging
        console.error(`[OpenAI Client] API Error (${statusCode}):`, {
          type: errorType,
          message: errorMessage,
          status: statusCode,
        });
        
        throw new Error(`OpenAI API error (${statusCode}): ${errorMessage}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.warn("[OpenAI Client] No content in response:", data);
        return "Yanıt alınamadı.";
      }
      
      return content;
    } catch (error: any) {
      // Log the full error for debugging
      console.error("[OpenAI Client] Error generating text:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // Preserve original error message if it's already descriptive
      if (error.message.includes("OpenAI API error")) {
        throw error;
      }
      
      // Wrap network/unknown errors in a user-friendly message
      throw new Error(`AI yanıtı oluşturulurken bir hata oluştu: ${error.message}`);
    }
  }

  async generateJSON<T = any>(input: {
    systemPrompt?: string;
    userPrompt: string;
    jsonSchema?: object;
    maxTokens?: number;
  }): Promise<T> {
    try {
      const messages: Array<{ role: string; content: string }> = [];

      if (input.systemPrompt) {
        messages.push({
          role: "system",
          content: input.systemPrompt,
        });
      }

      // Add JSON schema instruction to user prompt
      let enhancedPrompt = input.userPrompt;
      if (input.jsonSchema) {
        enhancedPrompt += `\n\nLütfen yanıtı şu JSON şemasına uygun olarak döndürün:\n${JSON.stringify(input.jsonSchema, null, 2)}`;
      } else {
        enhancedPrompt += "\n\nLütfen yanıtı geçerli bir JSON formatında döndürün.";
      }

      messages.push({
        role: "user",
        content: enhancedPrompt,
      });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: input.maxTokens || this.maxTokens,
          temperature: this.temperature,
          response_format: { type: "json_object" }, // Force JSON mode for GPT-3.5-turbo and GPT-4
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: "Unknown error", type: "parse_error" } }));
        const errorMessage = errorData.error?.message || response.statusText;
        const statusCode = response.status;
        
        console.error(`[OpenAI Client] API Error (${statusCode}):`, {
          message: errorMessage,
          status: statusCode,
        });
        
        throw new Error(`OpenAI API error (${statusCode}): ${errorMessage}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.warn("[OpenAI Client] No content in response:", data);
        throw new Error("Yanıt alınamadı.");
      }

      // Parse JSON response
      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        console.error("[OpenAI Client] Failed to parse JSON response:", content);
        throw new Error("JSON yanıtı parse edilemedi.");
      }
    } catch (error: any) {
      console.error("[OpenAI Client] Error generating JSON:", {
        message: error.message,
        stack: error.stack,
      });
      
      if (error.message.includes("OpenAI API error") || error.message.includes("JSON")) {
        throw error;
      }
      
      throw new Error(`AI JSON yanıtı oluşturulurken bir hata oluştu: ${error.message}`);
    }
  }
}

