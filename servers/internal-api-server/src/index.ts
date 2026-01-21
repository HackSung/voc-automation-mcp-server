#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { InternalAPIClient } from './api-client.js';
import { ErrorResolver } from './error-resolver.js';
import { Logger, validateEnv, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('InternalAPIServer');

const errorResolver = new ErrorResolver();
let apiClient: InternalAPIClient | null = null;

/**
 * NOTE:
 * Do NOT validate env at process startup. Some Cursor workspaces won't configure internal API env.
 * Validate lazily when a tool is called to avoid crashing the MCP server.
 */
function requireInternalApiClient(): InternalAPIClient {
  try {
    validateEnv(['INTERNAL_API_BASE_URL', 'INTERNAL_API_KEY']);
  } catch (e) {
    const baseMsg = (e as Error).message;
    throw new Error(
      `${baseMsg}\n\nHow to fix:\n- Set these in ~/.cursor/mcp.json under internal-api.env\n- Or export them in the environment that launches Cursor\n`
    );
  }

  if (apiClient) return apiClient;

  const config = getEnvConfig();
  apiClient = new InternalAPIClient({
    baseUrl: config.internalApi.baseUrl,
    apiKey: config.internalApi.apiKey,
  });
  return apiClient;
}

const server = new Server(
  {
    name: 'internal-api-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('Listing tools');

  return {
    tools: [
      {
        name: 'queryUserStatus',
        description:
          'Queries internal legacy systems for user status (subscription, auth, cancellation). Returns status details and error logs.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID or email',
            },
            queryType: {
              type: 'string',
              enum: ['subscription', 'auth', 'cancellation'],
              description: 'Type of status to query',
            },
          },
          required: ['userId', 'queryType'],
        },
      },
      {
        name: 'getErrorContext',
        description:
          'Retrieves detailed context for an error code including description, possible causes, and resolution steps. Useful for root cause analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            errorCode: {
              type: 'string',
              description:
                "Error code from system logs (e.g., 'AUTH_001', 'BILL_002')",
            },
          },
          required: ['errorCode'],
        },
      },
      {
        name: 'getErrorLogs',
        description:
          'Fetches recent error logs for a specific user from internal systems.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User ID or email',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of logs to retrieve (default: 10)',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'searchErrorsByKeyword',
        description:
          'Searches error codes and contexts by keyword. Useful when error code is unknown.',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Search keyword (e.g., "authentication", "payment")',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'checkSystemHealth',
        description:
          'Checks health status of internal API systems. Useful for troubleshooting connectivity issues.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Tool called', { tool: name });

  try {
    // Ensure internal API credentials are available only when needed
    const apiClient = requireInternalApiClient();

    if (name === 'queryUserStatus') {
      const { userId, queryType } = args as {
        userId: string;
        queryType: 'subscription' | 'auth' | 'cancellation';
      };

      if (!userId || !queryType) {
        throw new Error('Missing required parameters: userId, queryType');
      }

      const result = await apiClient.queryUserStatus(userId, queryType);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'getErrorContext') {
      const { errorCode } = args as { errorCode: string };

      if (!errorCode) {
        throw new Error('Missing required parameter: errorCode');
      }

      const context = errorResolver.resolve(errorCode);

      if (!context) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Unknown error code: ${errorCode}`,
                  availableErrorCodes: errorResolver.getAllErrorCodes(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                errorCode,
                ...context,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getErrorLogs') {
      const { userId, limit } = args as { userId: string; limit?: number };

      if (!userId) {
        throw new Error('Missing required parameter: userId');
      }

      const logs = await apiClient.getErrorLogs(userId, limit || 10);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                userId,
                logs,
                count: logs.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'searchErrorsByKeyword') {
      const { keyword } = args as { keyword: string };

      if (!keyword) {
        throw new Error('Missing required parameter: keyword');
      }

      const results = errorResolver.searchByKeyword(keyword);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                keyword,
                results,
                count: results.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'checkSystemHealth') {
      const health = await apiClient.checkSystemHealth();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(health, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    logger.error('Tool execution failed', error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: (error as Error).message,
              tool: name,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Internal API Server started on stdio');
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

