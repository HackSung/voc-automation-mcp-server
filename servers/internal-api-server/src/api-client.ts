import fetch from 'node-fetch';
import { Logger, retryWithBackoff, RetryableError } from '@voc-automation/shared';

const logger = new Logger('InternalAPIClient');

export interface APIConfig {
  baseUrl: string;
  apiKey: string;
}

export interface UserStatus {
  userId: string;
  status: string;
  details: Record<string, any>;
  errorLogs?: Array<{
    timestamp: string;
    errorCode: string;
    message: string;
  }>;
}

export class InternalAPIClient {
  constructor(private config: APIConfig) {
    logger.info('InternalAPIClient initialized', { baseUrl: config.baseUrl });
  }

  async queryUserStatus(
    userId: string,
    queryType: 'subscription' | 'auth' | 'cancellation'
  ): Promise<UserStatus> {
    logger.info('Querying user status', { userId, queryType });

    const endpoint = this.getEndpoint(queryType);

    const result = await retryWithBackoff(async () => {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({ userId, queryType }),
      });

      if (!response.ok) {
        const error = await response.text();
        const err = new Error(
          `Internal API error: ${response.status} - ${error}`
        ) as RetryableError;
        err.statusCode = response.status;
        throw err;
      }

      return response.json() as Promise<any>;
    });

    logger.info('User status retrieved', { userId, status: result.status });

    return {
      userId,
      status: result.status || 'unknown',
      details: result.details || {},
      errorLogs: result.errorLogs || [],
    };
  }

  async getErrorLogs(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    timestamp: string;
    errorCode: string;
    message: string;
    context?: any;
  }>> {
    logger.info('Fetching error logs', { userId, limit });

    try {
      const result = await retryWithBackoff(async () => {
        const response = await fetch(
          `${this.config.baseUrl}/api/logs/errors?userId=${userId}&limit=${limit}`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': this.config.apiKey,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();
          const err = new Error(
            `Failed to fetch logs: ${response.status} - ${error}`
          ) as RetryableError;
          err.statusCode = response.status;
          throw err;
        }

        return response.json() as Promise<any>;
      });

      logger.info('Error logs retrieved', {
        userId,
        count: result.logs?.length || 0,
      });

      return result.logs || [];
    } catch (error) {
      logger.error('Failed to fetch error logs', error);
      return [];
    }
  }

  async checkSystemHealth(): Promise<{
    status: string;
    services: Record<string, string>;
  }> {
    logger.debug('Checking system health');

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        return {
          status: 'unhealthy',
          services: {},
        };
      }

      const result = await response.json() as any;

      return {
        status: result.status || 'unknown',
        services: result.services || {},
      };
    } catch (error) {
      logger.warn('Health check failed', error);
      return {
        status: 'unreachable',
        services: {},
      };
    }
  }

  private getEndpoint(queryType: string): string {
    const endpoints: Record<string, string> = {
      subscription: '/api/user/subscription',
      auth: '/api/user/auth',
      cancellation: '/api/user/cancellation',
    };

    return endpoints[queryType] || '/api/user/status';
  }
}

