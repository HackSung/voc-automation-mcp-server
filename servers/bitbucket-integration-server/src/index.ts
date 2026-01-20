#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BitbucketClient } from './bitbucket-client.js';
import { Logger, validateEnv, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('BitbucketIntegrationServer');

/**
 * NOTE:
 * Do NOT validate env at process startup.
 * Cursor loads MCP servers globally, so some workspaces won't have Bitbucket env configured.
 * Instead, validate lazily when a tool is called and return an MCP tool error (without crashing).
 */
let bitbucketClient: BitbucketClient | null = null;

function requireBitbucketClient(): BitbucketClient {
  try {
    validateEnv(['BITBUCKET_BASE_URL', 'BITBUCKET_TOKEN']);
  } catch (e) {
    const baseMsg = (e as Error).message;
    throw new Error(
      `${baseMsg}\n\nHow to fix:\n- Set these in the current project's .env\n- Or set them in ~/.cursor/mcp.json under bitbucket-integration.env\n`
    );
  }

  if (bitbucketClient) return bitbucketClient;

  const config = getEnvConfig();
  bitbucketClient = new BitbucketClient({
    baseUrl: config.bitbucket.baseUrl,
    token: config.bitbucket.token,
    username: config.bitbucket.username,
  });
  return bitbucketClient;
}

const server = new Server(
  {
    name: 'bitbucket-integration-server',
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
        name: 'listRepositories',
        description:
          'Lists all repositories in a Bitbucket project. Returns repository names, slugs, and clone URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key (e.g., "PROJ", "MYTEAM")',
            },
          },
          required: ['projectKey'],
        },
      },
      {
        name: 'getRepository',
        description:
          'Gets detailed information about a specific repository including project info and links.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug (e.g., "my-repo")',
            },
          },
          required: ['projectKey', 'repoSlug'],
        },
      },
      {
        name: 'browseDirectory',
        description:
          'Browse directory contents in a repository. Returns list of files and subdirectories at the specified path.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            path: {
              type: 'string',
              description:
                'Directory path (e.g., "src/main/java"). Leave empty for root.',
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
            },
          },
          required: ['projectKey', 'repoSlug'],
        },
      },
      {
        name: 'getFileContent',
        description:
          'Retrieves the complete content of a file from a repository. Use this to read source code, configs, or documentation.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            filePath: {
              type: 'string',
              description: 'File path (e.g., "src/index.ts", "README.md")',
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
            },
          },
          required: ['projectKey', 'repoSlug', 'filePath'],
        },
      },
      {
        name: 'listBranches',
        description:
          'Lists all branches in a repository with their latest commit IDs and default branch indicator.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
          },
          required: ['projectKey', 'repoSlug'],
        },
      },
      {
        name: 'searchCode',
        description:
          'Searches for code within a repository using text matching. Returns file paths and matching line contexts.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            query: {
              type: 'string',
              description: 'Search query (text to find in code)',
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
            },
          },
          required: ['projectKey', 'repoSlug', 'query'],
        },
      },
      {
        name: 'getArchiveUrl',
        description:
          'Generates a download URL for a complete repository archive (zip or tar.gz). Useful for bulk downloads.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            format: {
              type: 'string',
              enum: ['zip', 'tar.gz'],
              description: 'Archive format (default: "zip")',
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
            },
          },
          required: ['projectKey', 'repoSlug'],
        },
      },
      {
        name: 'getCommits',
        description:
          'Retrieves recent commits from a repository branch with author info, messages, and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
            },
            limit: {
              type: 'number',
              description: 'Number of commits to retrieve (default: 25)',
            },
          },
          required: ['projectKey', 'repoSlug'],
        },
      },
      {
        name: 'listPullRequests',
        description:
          'Lists pull requests in a repository filtered by state (OPEN, MERGED, DECLINED, or ALL).',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            state: {
              type: 'string',
              enum: ['OPEN', 'MERGED', 'DECLINED', 'ALL'],
              description: 'Pull request state filter (default: "OPEN")',
            },
          },
          required: ['projectKey', 'repoSlug'],
        },
      },
      {
        name: 'getPullRequest',
        description:
          'Gets detailed information about a specific pull request including description, reviewers, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Project key',
            },
            repoSlug: {
              type: 'string',
              description: 'Repository slug',
            },
            prId: {
              type: 'number',
              description: 'Pull request ID',
            },
          },
          required: ['projectKey', 'repoSlug', 'prId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  logger.info('Tool called', { tool: name });

  try {
    // Ensure Bitbucket credentials are available only when needed
    const bitbucketClient = requireBitbucketClient();

    if (name === 'listRepositories') {
      const { projectKey } = args as { projectKey: string };

      const repos = await bitbucketClient.listRepositories(projectKey);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: repos.length,
                repositories: repos.map((repo) => ({
                  name: repo.name,
                  slug: repo.slug,
                  project: repo.project.name,
                  cloneUrl: repo.links.clone[0]?.href,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getRepository') {
      const { projectKey, repoSlug } = args as {
        projectKey: string;
        repoSlug: string;
      };

      const repo = await bitbucketClient.getRepository(projectKey, repoSlug);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(repo, null, 2),
          },
        ],
      };
    }

    if (name === 'browseDirectory') {
      const { projectKey, repoSlug, path, branch } = args as {
        projectKey: string;
        repoSlug: string;
        path?: string;
        branch?: string;
      };

      const listing = await bitbucketClient.browseDirectory(
        projectKey,
        repoSlug,
        path || '',
        branch || 'main'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                path: listing.path.toString,
                items: listing.children.values.map((item) => ({
                  path: item.path.toString,
                  type: item.type,
                  size: item.size,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getFileContent') {
      const { projectKey, repoSlug, filePath, branch } = args as {
        projectKey: string;
        repoSlug: string;
        filePath: string;
        branch?: string;
      };

      const content = await bitbucketClient.getFileContent(
        projectKey,
        repoSlug,
        filePath,
        branch || 'main'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                filePath,
                branch: branch || 'main',
                content,
                lines: content.split('\n').length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'listBranches') {
      const { projectKey, repoSlug } = args as {
        projectKey: string;
        repoSlug: string;
      };

      const branches = await bitbucketClient.listBranches(
        projectKey,
        repoSlug
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: branches.length,
                branches: branches.map((branch) => ({
                  name: branch.displayId,
                  id: branch.id,
                  latestCommit: branch.latestCommit,
                  isDefault: branch.isDefault,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'searchCode') {
      const { projectKey, repoSlug, query, branch } = args as {
        projectKey: string;
        repoSlug: string;
        query: string;
        branch?: string;
      };

      const results = await bitbucketClient.searchCode(
        projectKey,
        repoSlug,
        query,
        branch
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                query,
                count: results.code.count,
                isLastPage: results.code.isLastPage,
                results: results.code.values.map((result) => ({
                  repository: result.repository.name,
                  file: result.file,
                  hitCount: result.hitCount,
                  matches: result.hitContexts.flat().map((hit) => ({
                    line: hit.line,
                    text: hit.text,
                  })),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getArchiveUrl') {
      const { projectKey, repoSlug, format, branch } = args as {
        projectKey: string;
        repoSlug: string;
        format?: 'zip' | 'tar.gz';
        branch?: string;
      };

      const url = bitbucketClient.getArchiveUrl(
        projectKey,
        repoSlug,
        format || 'zip',
        branch || 'main'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                archiveUrl: url,
                format: format || 'zip',
                branch: branch || 'main',
                note: 'Use this URL with curl or wget to download the archive',
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getCommits') {
      const { projectKey, repoSlug, branch, limit } = args as {
        projectKey: string;
        repoSlug: string;
        branch?: string;
        limit?: number;
      };

      const commits = await bitbucketClient.getCommits(
        projectKey,
        repoSlug,
        branch || 'main',
        limit || 25
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: commits.length,
                commits: commits.map((commit) => ({
                  id: commit.id,
                  message: commit.message,
                  author: commit.author?.name,
                  timestamp: commit.authorTimestamp,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'listPullRequests') {
      const { projectKey, repoSlug, state } = args as {
        projectKey: string;
        repoSlug: string;
        state?: 'OPEN' | 'MERGED' | 'DECLINED' | 'ALL';
      };

      const prs = await bitbucketClient.listPullRequests(
        projectKey,
        repoSlug,
        state || 'OPEN'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: prs.length,
                state: state || 'OPEN',
                pullRequests: prs.map((pr) => ({
                  id: pr.id,
                  title: pr.title,
                  state: pr.state,
                  author: pr.author?.user?.displayName,
                  createdDate: pr.createdDate,
                  updatedDate: pr.updatedDate,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'getPullRequest') {
      const { projectKey, repoSlug, prId } = args as {
        projectKey: string;
        repoSlug: string;
        prId: number;
      };

      const pr = await bitbucketClient.getPullRequest(
        projectKey,
        repoSlug,
        prId
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: pr.id,
                title: pr.title,
                description: pr.description,
                state: pr.state,
                author: pr.author?.user?.displayName,
                reviewers: pr.reviewers?.map((r: any) => ({
                  name: r.user?.displayName,
                  approved: r.approved,
                  status: r.status,
                })),
                fromBranch: pr.fromRef?.displayId,
                toBranch: pr.toRef?.displayId,
                createdDate: pr.createdDate,
                updatedDate: pr.updatedDate,
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

  logger.info('Bitbucket Integration Server started on stdio');
}

main().catch((error) => {
  logger.error('Fatal error', error);
  process.exit(1);
});
