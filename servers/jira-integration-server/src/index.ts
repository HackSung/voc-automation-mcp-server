#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from './jira-client.js';
import { TeamsNotifier } from './teams-notifier.js';
import { Logger, validateEnv, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('JiraIntegrationServer');

// Validate required environment variables
validateEnv(['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN']);

const config = getEnvConfig();
const jiraClient = new JiraClient({
  baseUrl: config.jira.baseUrl,
  email: config.jira.email,
  apiToken: config.jira.apiToken,
});
const teamsNotifier = new TeamsNotifier();

const server = new Server(
  {
    name: 'jira-integration-server',
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
        name: 'createJiraIssue',
        description:
          'Creates a new Jira issue with automatic assignee resolution based on category. Returns issue key, ID, and URL.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: "Project key (default: 'VRBT' from env). Override if needed.",
            },
            issueType: {
              type: 'string',
              enum: ['Bug', 'New Feature', 'Story', 'Epic', 'Task', 'Work', 'Defect_QA', 'Story_QA', 'Improvement'],
              description: 'Issue type (VRBT 프로젝트 지원 타입)',
            },
            summary: {
              type: 'string',
              description: 'Issue title/summary (max 255 chars)',
            },
            description: {
              type: 'string',
              description: 'Detailed description (supports Jira markdown)',
            },
            priority: {
              type: 'string',
              enum: ['Major', 'Blocker', 'Critical', 'Minor', 'Medium', 'Trivial', 'High', 'Low'],
              description: 'Issue priority (VRBT 프로젝트 지원 우선순위)',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional labels for categorization',
            },
            components: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional Jira components (e.g., ["VOC", "Customer Support"])',
            },
            category: {
              type: 'string',
              description:
                'VOC category for auto-assignment (e.g., authentication, billing, performance)',
            },
            assignee: {
              type: 'string',
              description: 'Optional: Jira account ID to override auto-assignment',
            },
            sendNotification: {
              type: 'boolean',
              description: 'Send Teams notification (default: false)',
            },
          },
          required: ['issueType', 'summary', 'description', 'priority'],
        },
      },
      {
        name: 'addComment',
        description:
          'Adds a comment to an existing Jira issue. Useful for adding analysis results or updates.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: "Jira issue key (e.g., 'VOC-123')",
            },
            comment: {
              type: 'string',
              description: 'Comment text (supports Jira markdown)',
            },
          },
          required: ['issueKey', 'comment'],
        },
      },
      {
        name: 'transitionIssue',
        description:
          "Changes the status of a Jira issue (e.g., 'In Progress', 'Done', 'Closed'). Validates available transitions.",
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: "Jira issue key (e.g., 'VOC-123')",
            },
            transitionName: {
              type: 'string',
              description:
                "Target status name (e.g., 'In Progress', 'Done'). Case-insensitive.",
            },
          },
          required: ['issueKey', 'transitionName'],
        },
      },
      {
        name: 'getIssue',
        description:
          'Retrieves full details of a Jira issue including fields, comments, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: {
              type: 'string',
              description: "Jira issue key (e.g., 'VOC-123')",
            },
          },
          required: ['issueKey'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Tool called', { tool: name });

  try {
    if (name === 'createJiraIssue') {
      const params = args as any;

      const result = await jiraClient.createIssue({
        project: params.project || config.jira.projectKey,
        issueType: params.issueType,
        summary: params.summary,
        description: params.description,
        priority: params.priority,
        labels: params.labels,
        components: params.components,
        category: params.category,
        assignee: params.assignee,
      });

      // Send Teams notification if requested
      if (params.sendNotification) {
        await teamsNotifier.sendNotification({
          title: `New ${params.issueType}: ${params.summary}`,
          summary: params.description.substring(0, 200),
          issueKey: result.issueKey,
          issueUrl: result.url,
          priority: params.priority,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'addComment') {
      const { issueKey, comment } = args as {
        issueKey: string;
        comment: string;
      };

      const result = await jiraClient.addComment(issueKey, comment);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'transitionIssue') {
      const { issueKey, transitionName } = args as {
        issueKey: string;
        transitionName: string;
      };

      const result = await jiraClient.transitionIssue(issueKey, transitionName);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'getIssue') {
      const { issueKey } = args as { issueKey: string };

      const issue = await jiraClient.getIssue(issueKey);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                priority: issue.fields.priority?.name,
                assignee: issue.fields.assignee?.displayName,
                created: issue.fields.created,
                updated: issue.fields.updated,
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

  logger.info('Jira Integration Server started on stdio');
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});

