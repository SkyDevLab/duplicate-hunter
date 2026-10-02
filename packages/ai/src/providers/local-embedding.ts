import { EmbeddingProvider } from '../interfaces.js';

export class LocalEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'local-feature-hash';
  private readonly dimensions = 128;

  async generateEmbedding(text: string): Promise<number[]> {
    return this.computeVector(text);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.computeVector(t));
  }

  private computeVector(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    if (!text || !text.trim()) return vector;

    const clean = text.toLowerCase();

    // 1. Word tokens
    const words = clean.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      const hash = this.hashString(word);
      const index = Math.abs(hash) % this.dimensions;
      const sign = (hash & 1) === 0 ? 1 : -1;
      vector[index] += sign * 1.5;

      // 2. Character trigrams for morphological and misspelling resilience
      for (let i = 0; i < word.length - 2; i++) {
        const trigram = word.substring(i, i + 3);
        const triHash = this.hashString(trigram);
        const triIndex = Math.abs(triHash) % this.dimensions;
        const triSign = (triHash & 1) === 0 ? 0.4 : -0.4;
        vector[triIndex] += triSign;
      }
    }

    // 3. L2 Normalization
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  private hashString(str: string): number {
    let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    return hash;
  }
}
