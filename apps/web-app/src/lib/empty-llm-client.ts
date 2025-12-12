// Empty module to replace LLM client in client-side bundles
// LLM client is server-only and should not be bundled for the browser

export function createLLMClient(): never {
  throw new Error("createLLMClient is server-only and cannot be used in the browser");
}

export function hasRealAIProvider(): boolean {
  return false;
}

export type LLMClient = never;
export type LLMClientConfig = never;




