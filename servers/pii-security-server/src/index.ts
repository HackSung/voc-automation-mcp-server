#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PIIDetector } from './pii-detector.js';
import { PIIMappingStore } from './mapping-store.js';
import { Logger, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('PIISecurityServer');

const server = new Server(
  {
    name: 'pii-security-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const config = getEnvConfig();
const piiDetector = new PIIDetector();
const mappingStore = new PIIMappingStore(config.pii.sessionTTL);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('Listing tools');

  return {
    tools: [
      {
        name: 'detectAndAnonymizePII',
        description:
          'Detects and anonymizes PII (email, phone, SSN, credit card) in text, storing mapping for later restoration. Returns anonymized text safe for LLM processing.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Original text containing potential PII',
            },
            sessionId: {
              type: 'string',
              description:
                'Unique session identifier for mapping storage (e.g., UUID)',
            },
          },
          required: ['text', 'sessionId'],
        },
      },
      {
        name: 'restoreOriginalText',
        description:
          'Restores anonymized text to original form using session mapping. Use this before storing data in external systems (e.g., Jira).',
        inputSchema: {
          type: 'object',
          properties: {
            anonymizedText: {
              type: 'string',
              description: 'Text with PII placeholders',
            },
            sessionId: {
              type: 'string',
              description: 'Session identifier used during anonymization',
            },
          },
          required: ['anonymizedText', 'sessionId'],
        },
      },
      {
        name: 'clearSession',
        description:
          'Manually clears PII mapping data for a session. Useful after workflow completion.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session identifier to clear',
            },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'getStats',
        description:
          'Returns statistics about the PII mapping store (total sessions, TTL).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Tool called', { tool: name });

  try {
    if (name === 'detectAndAnonymizePII') {
      const { text, sessionId } = args as { text: string; sessionId: string };

      if (!text || !sessionId) {
        throw new Error('Missing required parameters: text, sessionId');
      }

      // Detect PII patterns
      const detectedPII = piiDetector.detect(text);

      // Generate placeholders and anonymize
      const { anonymizedText, mappings } = piiDetector.anonymize(
        text,
        detectedPII
      );

      // Store mappings
      mappingStore.storeMappings(sessionId, mappings);

      logger.info('PII anonymization completed', {
        sessionId,
        detectedCount: detectedPII.length,
        hasPII: detectedPII.length > 0,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                anonymizedText,
                detectedPII: detectedPII.map((pii) => ({
                  type: pii.type,
                  placeholder: pii.placeholder,
                  position: pii.position,
                })),
                hasPII: detectedPII.length > 0,
                sessionId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'restoreOriginalText') {
      const { anonymizedText, sessionId } = args as {
        anonymizedText: string;
        sessionId: string;
      };

      if (!anonymizedText || !sessionId) {
        throw new Error(
          'Missing required parameters: anonymizedText, sessionId'
        );
      }

      const mappings = mappingStore.retrieve(sessionId);
      if (!mappings) {
        throw new Error(`No mapping found for session: ${sessionId}`);
      }

      const originalText = piiDetector.restore(anonymizedText, mappings);

      logger.info('PII restoration completed', {
        sessionId,
        restoredCount: mappings.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                originalText,
                restoredCount: mappings.length,
                sessionId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'clearSession') {
      const { sessionId } = args as { sessionId: string };

      if (!sessionId) {
        throw new Error('Missing required parameter: sessionId');
      }

      mappingStore.clearSession(sessionId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                cleared: true,
                sessionId,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getStats') {
      const stats = mappingStore.getStats();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('PII Security Server started on stdio');

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    mappingStore.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    mappingStore.destroy();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

