#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { LLMClient } from './llm-client.js';
import { VOCAnalyzer } from './voc-analyzer.js';
import { SimilaritySearch } from './similarity-search.js';
import { Logger, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('VOCAnalysisServer');

const config = getEnvConfig();

// Initialize LLM client (prefer OpenAI, fallback to Anthropic)
let llmClient: LLMClient;
if (config.llm.openaiKey) {
  llmClient = new LLMClient({
    provider: 'openai',
    apiKey: config.llm.openaiKey,
  });
} else if (config.llm.anthropicKey) {
  llmClient = new LLMClient({
    provider: 'anthropic',
    apiKey: config.llm.anthropicKey,
  });
} else {
  throw new Error(
    'No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY'
  );
}

const vocAnalyzer = new VOCAnalyzer(llmClient);
const similaritySearch = config.llm.openaiKey
  ? new SimilaritySearch(config.llm.openaiKey)
  : null;

const server = new Server(
  {
    name: 'voc-analysis-server',
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

  const tools: any[] = [
    {
      name: 'analyzeVOC',
      description:
        'Analyzes VOC text using LLM to extract intent, priority, categories, sentiment, and generate summary. This is the main analysis tool.',
      inputSchema: {
        type: 'object',
        properties: {
          vocText: {
            type: 'string',
            description: 'The VOC text to analyze (should be anonymized)',
          },
          metadata: {
            type: 'object',
            description: 'Optional metadata',
            properties: {
              customerId: { type: 'string' },
              source: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
        required: ['vocText'],
      },
    },
  ];

  if (similaritySearch) {
    tools.push(
      {
        name: 'findSimilarIssues',
        description:
          'Finds similar Jira issues using embedding-based similarity search. Helps detect duplicate VOCs.',
        inputSchema: {
          type: 'object',
          properties: {
            vocText: {
              type: 'string',
              description: 'The VOC text to find similar issues for',
            },
            topK: {
              type: 'number',
              description: 'Number of similar issues to return (default: 5)',
            },
          },
          required: ['vocText'],
        },
      },
      {
        name: 'indexIssue',
        description:
          'Indexes a Jira issue for similarity search. Call this after creating a new issue.',
        inputSchema: {
          type: 'object',
          properties: {
            jiraKey: {
              type: 'string',
              description: "Jira issue key (e.g., 'VOC-123')",
            },
            summary: {
              type: 'string',
              description: 'Issue summary/title',
            },
          },
          required: ['jiraKey', 'summary'],
        },
      }
    );
  }

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Tool called', { tool: name });

  try {
    if (name === 'analyzeVOC') {
      const { vocText, metadata } = args as {
        vocText: string;
        metadata?: any;
      };

      if (!vocText) {
        throw new Error('Missing required parameter: vocText');
      }

      const result = await vocAnalyzer.analyze(vocText);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...result,
                metadata,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'findSimilarIssues') {
      if (!similaritySearch) {
        throw new Error('Similarity search not available (OpenAI API key required)');
      }

      const { vocText, topK } = args as {
        vocText: string;
        topK?: number;
      };

      if (!vocText) {
        throw new Error('Missing required parameter: vocText');
      }

      const similarIssues = await similaritySearch.findSimilarIssues(
        vocText,
        topK || 5
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                similarIssues,
                count: similarIssues.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'indexIssue') {
      if (!similaritySearch) {
        throw new Error('Similarity search not available (OpenAI API key required)');
      }

      const { jiraKey, summary } = args as {
        jiraKey: string;
        summary: string;
      };

      if (!jiraKey || !summary) {
        throw new Error('Missing required parameters: jiraKey, summary');
      }

      await similaritySearch.indexIssue(jiraKey, summary);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                indexed: true,
                jiraKey,
              },
              null,
              2
            ),
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

  logger.info('VOC Analysis Server started on stdio');
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

