import fetch from 'node-fetch';
import { Logger, retryWithBackoff } from '@voc-automation/shared';

const logger = new Logger('SimilaritySearch');

export interface SimilarIssue {
  jiraKey: string;
  similarity: number;
  summary: string;
  description?: string;
}

export interface EmbeddingCache {
  [jiraKey: string]: {
    embedding: number[];
    summary: string;
    timestamp: number;
  };
}

export class SimilaritySearch {
  private cache: EmbeddingCache = {};
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    logger.info('SimilaritySearch initialized');
  }

  async findSimilarIssues(
    vocText: string,
    topK: number = 5
  ): Promise<SimilarIssue[]> {
    logger.info('Finding similar issues', { topK });

    try {
      // Get embedding for VOC text
      const vocEmbedding = await this.getEmbedding(vocText);

      // Calculate similarities with cached issues
      const similarities: SimilarIssue[] = [];

      for (const [jiraKey, cached] of Object.entries(this.cache)) {
        const similarity = this.cosineSimilarity(
          vocEmbedding,
          cached.embedding
        );

        similarities.push({
          jiraKey,
          similarity,
          summary: cached.summary,
        });
      }

      // Sort by similarity (descending) and take top K
      const topSimilar = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK)
        .filter((s) => s.similarity > 0.7); // Threshold

      logger.info('Similar issues found', { count: topSimilar.length });

      return topSimilar;
    } catch (error) {
      logger.error('Similarity search failed', error);
      return [];
    }
  }

  async indexIssue(jiraKey: string, summary: string): Promise<void> {
    logger.debug('Indexing issue', { jiraKey });

    try {
      const embedding = await this.getEmbedding(summary);

      this.cache[jiraKey] = {
        embedding,
        summary,
        timestamp: Date.now(),
      };

      logger.debug('Issue indexed', { jiraKey });
    } catch (error) {
      logger.error('Failed to index issue', error);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await retryWithBackoff(async () => {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`OpenAI Embedding API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<any>;
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  getCacheStats(): { totalIssues: number } {
    return {
      totalIssues: Object.keys(this.cache).length,
    };
  }

  clearCache(): void {
    this.cache = {};
    logger.info('Cache cleared');
  }
}

