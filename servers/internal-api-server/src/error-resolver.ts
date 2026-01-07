import { Logger } from '@voc-automation/shared';

const logger = new Logger('ErrorResolver');

export interface ErrorContext {
  errorDescription: string;
  possibleCauses: string[];
  resolutionSteps: string[];
}

export class ErrorResolver {
  private errorCodeMap: Map<string, ErrorContext>;

  constructor() {
    this.errorCodeMap = new Map();
    this.initializeErrorCodes();
    logger.info('ErrorResolver initialized', {
      knownErrors: this.errorCodeMap.size,
    });
  }

  private initializeErrorCodes(): void {
    // Authentication errors
    this.errorCodeMap.set('AUTH_001', {
      errorDescription: 'Invalid credentials or expired session',
      possibleCauses: [
        'User password changed recently',
        'Session expired (timeout)',
        'Account locked due to multiple failed attempts',
        'OAuth token revoked',
      ],
      resolutionSteps: [
        'Ask user to reset password',
        'Clear browser cookies and cache',
        'Check if account is locked in admin panel',
        'Regenerate OAuth tokens if applicable',
      ],
    });

    this.errorCodeMap.set('AUTH_002', {
      errorDescription: 'Multi-factor authentication failed',
      possibleCauses: [
        'Incorrect OTP code',
        'Time sync issue on authenticator app',
        'Backup codes already used',
      ],
      resolutionSteps: [
        'Verify system time is correct',
        'Use backup codes if available',
        'Contact support to disable MFA temporarily',
      ],
    });

    // Billing errors
    this.errorCodeMap.set('BILL_001', {
      errorDescription: 'Payment method declined',
      possibleCauses: [
        'Insufficient funds',
        'Card expired',
        'Billing address mismatch',
        'Card issuer blocked transaction',
      ],
      resolutionSteps: [
        'Verify card details and expiration date',
        'Check with bank for declined transactions',
        'Update billing address',
        'Try alternative payment method',
      ],
    });

    this.errorCodeMap.set('BILL_002', {
      errorDescription: 'Subscription not found or expired',
      possibleCauses: [
        'Subscription cancelled',
        'Payment failed and subscription suspended',
        'Account downgraded to free tier',
      ],
      resolutionSteps: [
        'Check subscription status in admin panel',
        'Reactivate subscription if payment issue resolved',
        'Contact billing support for restoration',
      ],
    });

    // Performance errors
    this.errorCodeMap.set('PERF_001', {
      errorDescription: 'Request timeout',
      possibleCauses: [
        'Large data query without pagination',
        'Database connection pool exhausted',
        'Network latency issues',
        'Unoptimized query causing slow response',
      ],
      resolutionSteps: [
        'Implement pagination for large datasets',
        'Analyze slow query logs',
        'Increase timeout threshold temporarily',
        'Add database indexes on frequently queried fields',
      ],
    });

    this.errorCodeMap.set('PERF_002', {
      errorDescription: 'Rate limit exceeded',
      possibleCauses: [
        'Too many API requests in short period',
        'Aggressive polling from client',
        'DDoS attack or abuse',
      ],
      resolutionSteps: [
        'Implement exponential backoff in client',
        'Increase rate limit for specific user if legitimate',
        'Monitor for abuse patterns',
        'Use webhooks instead of polling',
      ],
    });

    // Data errors
    this.errorCodeMap.set('DATA_001', {
      errorDescription: 'Data not found',
      possibleCauses: [
        'Resource deleted',
        'Incorrect resource ID',
        'User lacks permission to access',
        'Data migration incomplete',
      ],
      resolutionSteps: [
        'Verify resource ID is correct',
        'Check user permissions',
        'Search for resource in archive/trash',
        'Contact data team if migration-related',
      ],
    });

    // Integration errors
    this.errorCodeMap.set('INT_001', {
      errorDescription: 'Third-party API failure',
      possibleCauses: [
        'External service downtime',
        'API credentials invalid',
        'API rate limit reached',
        'Network connectivity issue',
      ],
      resolutionSteps: [
        'Check third-party service status page',
        'Verify API credentials are current',
        'Implement fallback mechanism',
        'Retry with exponential backoff',
      ],
    });
  }

  resolve(errorCode: string): ErrorContext | null {
    const context = this.errorCodeMap.get(errorCode.toUpperCase());

    if (context) {
      logger.debug('Error context resolved', { errorCode });
      return context;
    }

    logger.warn('Unknown error code', { errorCode });
    return null;
  }

  searchByKeyword(keyword: string): Array<{ errorCode: string; context: ErrorContext }> {
    const results: Array<{ errorCode: string; context: ErrorContext }> = [];
    const lowerKeyword = keyword.toLowerCase();

    for (const [errorCode, context] of this.errorCodeMap.entries()) {
      if (
        errorCode.toLowerCase().includes(lowerKeyword) ||
        context.errorDescription.toLowerCase().includes(lowerKeyword) ||
        context.possibleCauses.some((c) => c.toLowerCase().includes(lowerKeyword))
      ) {
        results.push({ errorCode, context });
      }
    }

    logger.debug('Keyword search completed', {
      keyword,
      results: results.length,
    });

    return results;
  }

  getAllErrorCodes(): string[] {
    return Array.from(this.errorCodeMap.keys());
  }
}

