import { PIIMapping } from './pii-detector.js';
import { Logger } from '@voc-automation/shared';

const logger = new Logger('MappingStore');

interface SessionEntry {
  mappings: PIIMapping[];
  timestamp: number;
}

export class PIIMappingStore {
  private store = new Map<string, SessionEntry>();
  private readonly ttl: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(ttl: number = 3600000) {
    // Default: 1 hour
    this.ttl = ttl;

    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);

    logger.info('PIIMappingStore initialized', { ttl });
  }

  store(sessionId: string, mappings: PIIMapping[]): void {
    this.store.set(sessionId, {
      mappings,
      timestamp: Date.now(),
    });

    logger.debug('Stored PII mappings', {
      sessionId,
      count: mappings.length,
    });

    // Trigger cleanup to remove old sessions
    this.cleanup();
  }

  retrieve(sessionId: string): PIIMapping[] | null {
    const entry = this.store.get(sessionId);

    if (!entry) {
      logger.warn('Session not found', { sessionId });
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(sessionId);
      logger.warn('Session expired', { sessionId });
      return null;
    }

    logger.debug('Retrieved PII mappings', {
      sessionId,
      count: entry.mappings.length,
    });

    return entry.mappings;
  }

  clearSession(sessionId: string): void {
    this.store.delete(sessionId);
    logger.info('Session cleared', { sessionId });
  }

  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [sessionId, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.store.delete(sessionId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info('Cleanup completed', { removedCount });
    }
  }

  getStats(): { totalSessions: number; ttl: number } {
    return {
      totalSessions: this.store.size,
      ttl: this.ttl,
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
    logger.info('PIIMappingStore destroyed');
  }
}

