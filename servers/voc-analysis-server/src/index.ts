#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PromptGenerator } from './prompt-generator.js';
import { ResultParser } from './result-parser.js';
import { SimilaritySearch } from './similarity-search.js';
import { Logger, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('VOCAnalysisServer');

const config = getEnvConfig();

// Initialize components (no LLM client needed!)
const promptGenerator = new PromptGenerator();
const resultParser = new ResultParser();

// Similarity search still needs OpenAI for embeddings
const similaritySearch = config.llm.openaiKey
  ? new SimilaritySearch(config.llm.openaiKey)
  : null;

const server = new Server(
  {
    name: 'voc-analysis-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================================================
// Resources: Expose prompt templates
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logger.debug('Listing prompt resources');

  return {
    resources: [
      {
        uri: 'prompt://voc/intent-classification',
        name: 'VOC Intent Classification Prompt',
        description: 'Prompt template for classifying VOC intent',
        mimeType: 'text/plain',
      },
      {
        uri: 'prompt://voc/priority-evaluation',
        name: 'VOC Priority Evaluation Prompt',
        description: 'Prompt template for evaluating VOC priority',
        mimeType: 'text/plain',
      },
      {
        uri: 'prompt://voc/category-extraction',
        name: 'VOC Category Extraction Prompt',
        description: 'Prompt template for extracting VOC categories',
        mimeType: 'text/plain',
      },
      {
        uri: 'prompt://voc/sentiment-analysis',
        name: 'VOC Sentiment Analysis Prompt',
        description: 'Prompt template for analyzing VOC sentiment',
        mimeType: 'text/plain',
      },
      {
        uri: 'prompt://voc/summary-generation',
        name: 'VOC Summary Generation Prompt',
        description: 'Prompt template for generating VOC summary',
        mimeType: 'text/plain',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  logger.debug('Reading resource', { uri });

  const typeMap: { [key: string]: 'intent' | 'priority' | 'category' | 'sentiment' | 'summary' } = {
    'prompt://voc/intent-classification': 'intent',
    'prompt://voc/priority-evaluation': 'priority',
    'prompt://voc/category-extraction': 'category',
    'prompt://voc/sentiment-analysis': 'sentiment',
    'prompt://voc/summary-generation': 'summary',
  };

  const type = typeMap[uri];
  if (!type) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  const template = promptGenerator.getPromptTemplate(type);

  return {
    contents: [
      {
        uri,
        mimeType: 'text/plain',
        text: template,
      },
    ],
  };
});

// ============================================================================
// Tools: Prompt generation and result parsing
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug('Listing tools');

  const tools: any[] = [
    {
      name: 'generateVOCAnalysisPrompt',
      description:
        'Generate a unified prompt for VOC analysis. Use this prompt with Cursor\'s LLM (Claude/GPT) to analyze customer feedback. Returns a single comprehensive prompt that extracts intent, priority, category, sentiment, and summary.',
      inputSchema: {
        type: 'object',
        properties: {
          vocText: {
            type: 'string',
            description: 'The VOC text to analyze (should be anonymized first)',
          },
        },
        required: ['vocText'],
      },
    },
    {
      name: 'parseVOCAnalysis',
      description:
        'Parse the LLM response from VOC analysis prompt. Validates and structures the analysis result into a standardized format.',
      inputSchema: {
        type: 'object',
        properties: {
          llmResponse: {
            type: 'string',
            description: 'The raw response from LLM (JSON format expected)',
          },
        },
        required: ['llmResponse'],
      },
    },
    {
      name: 'formatVOCAnalysis',
      description:
        'Format a parsed VOC analysis result into a human-readable summary. Useful for displaying analysis results to users.',
      inputSchema: {
        type: 'object',
        properties: {
          analysisResult: {
            type: 'string',
            description: 'The parsed VOC analysis result (JSON string)',
          },
        },
        required: ['analysisResult'],
      },
    },
  ];

  if (similaritySearch) {
    tools.push(
      {
        name: 'findSimilarIssues',
        description:
          'Find similar Jira issues using embedding-based similarity search. Helps detect duplicate VOCs.',
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
          'Index a Jira issue for similarity search. Call this after creating a new issue.',
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
    // ========================================================================
    // Generate VOC Analysis Prompt
    // ========================================================================
    if (name === 'generateVOCAnalysisPrompt') {
      const { vocText } = args as { vocText: string };

      if (!vocText) {
        throw new Error('Missing required parameter: vocText');
      }

      const prompt = promptGenerator.generateUnifiedAnalysisPrompt(vocText);

      return {
        content: [
          {
            type: 'text',
            text: `✅ **VOC Analysis Prompt Generated**

Use this prompt with your LLM (Claude/GPT) to analyze the VOC:

---

${prompt}

---

**Instructions:**
1. Copy the prompt above
2. Send it to your LLM
3. Copy the LLM's response
4. Use \`parseVOCAnalysis\` tool to parse the response

**Note:** The prompt is optimized to return structured JSON that can be parsed automatically.`,
          },
        ],
      };
    }

    // ========================================================================
    // Parse VOC Analysis Result
    // ========================================================================
    if (name === 'parseVOCAnalysis') {
      const { llmResponse } = args as { llmResponse: string };

      if (!llmResponse) {
        throw new Error('Missing required parameter: llmResponse');
      }

      const result = resultParser.parseUnifiedAnalysis(llmResponse);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    // ========================================================================
    // Format VOC Analysis
    // ========================================================================
    if (name === 'formatVOCAnalysis') {
      const { analysisResult } = args as { analysisResult: string };

      if (!analysisResult) {
        throw new Error('Missing required parameter: analysisResult');
      }

      const result = JSON.parse(analysisResult);
      const formatted = resultParser.formatAnalysisSummary(result);

      return {
        content: [
          {
            type: 'text',
            text: formatted,
          },
        ],
      };
    }

    // ========================================================================
    // Find Similar Issues
    // ========================================================================
    if (name === 'findSimilarIssues') {
      if (!similaritySearch) {
        throw new Error(
          'Similarity search not available (OpenAI API key required)'
        );
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

    // ========================================================================
    // Index Issue
    // ========================================================================
    if (name === 'indexIssue') {
      if (!similaritySearch) {
        throw new Error(
          'Similarity search not available (OpenAI API key required)'
        );
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

  logger.info('VOC Analysis Server v2.0 started on stdio');
  logger.info('Using Cursor LLM integration (no external API keys needed)');
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
