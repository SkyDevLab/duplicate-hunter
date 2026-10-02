import { EmbeddingProvider } from '../interfaces.js';
import { LocalEmbeddingProvider } from './local-embedding.js';

export interface OpenAIOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'openai';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fallbackProvider = new LocalEmbeddingProvider();

  constructor(options?: OpenAIOptions) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options?.model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.baseUrl = (options?.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const [result] = await this.generateEmbeddings([text]);
    return result;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      // Fallback silently if no key configured in environment
      return this.fallbackProvider.generateEmbeddings(texts);
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts.map((t) => t.slice(0, 8000)),
        }),
      });

      if (!response.ok) {
        console.warn(`OpenAI embedding failed with status ${response.status}. Using fallback.`);
        return this.fallbackProvider.generateEmbeddings(texts);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      return data.data.map((item) => item.embedding);
    } catch (err) {
      console.warn('OpenAI embedding request error. Using local fallback.', err);
      return this.fallbackProvider.generateEmbeddings(texts);
    }
  }
}
