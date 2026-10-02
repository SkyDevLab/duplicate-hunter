import { EmbeddingProvider } from '../interfaces.js';
import { LocalEmbeddingProvider } from './local-embedding.js';

export interface OllamaOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fallbackProvider = new LocalEmbeddingProvider();

  constructor(options?: OllamaOptions) {
    this.baseUrl = (options?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    this.model = options?.model || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text.slice(0, 8000),
        }),
      });

      if (!response.ok) {
        return this.fallbackProvider.generateEmbedding(text);
      }

      const data = (await response.json()) as { embedding: number[] };
      return data.embedding;
    } catch {
      return this.fallbackProvider.generateEmbedding(text);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text));
    }
    return results;
  }
}
