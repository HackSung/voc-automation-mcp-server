import { existsSync } from 'fs';
import { config } from 'dotenv';
import { dirname, join, resolve } from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('EnvValidator');

/**
 * Load environment variables for MCP servers.
 *
 * When executed via `npx`, the actual process cwd may be a generic directory
 * (or even a temp directory). npm typically sets `INIT_CWD` to the directory
 * where `npx`/`npm exec` was invoked (often the Cursor workspace root), so we
 * try that first.
 *
 * Precedence:
 * - Explicit path overrides (VOC_ENV_PATH / DOTENV_CONFIG_PATH / ENV_FILE)
 * - <INIT_CWD>/.env
 * - <PWD>/.env
 * - <process.cwd()>/.env
 */
const explicitEnvPath =
  process.env.VOC_ENV_PATH || process.env.DOTENV_CONFIG_PATH || process.env.ENV_FILE;

function findUpEnv(startDir: string, filename: string = '.env', maxDepth: number = 25): string | null {
  let current = resolve(startDir);
  for (let i = 0; i < maxDepth; i++) {
    const candidate = join(current, filename);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

const candidateRoots: Array<string | undefined> = [
  // Explicit override always wins
  explicitEnvPath,
  // Common npm/npx roots
  process.env.INIT_CWD,
  process.env.PWD,
  process.env.npm_config_local_prefix,
  process.env.npm_config_prefix,
  // IDE-specific (best-effort)
  process.env.VSCODE_CWD,
  process.env.CURSOR_WORKSPACE_PATH,
  process.env.CURSOR_WORKSPACE_DIR,
  // Fallback to actual cwd
  process.cwd(),
];

let loadedFrom: string | null = null;

for (const root of candidateRoots) {
  if (!root) continue;

  // If user passed a direct file path, use it as-is.
  const directPath = root.endsWith('.env') ? root : null;
  const envPath = directPath || findUpEnv(root, '.env');
  if (!envPath) continue;

  const result = config({ path: envPath });
  if (!result.error) {
    loadedFrom = envPath;
    break;
  }
}

if (loadedFrom) {
  logger.info('Loaded .env file', { path: loadedFrom });
} else {
  logger.warn('No .env file loaded; relying on process.env only', {
    tried: candidateRoots.filter(Boolean),
    hint: 'Set VOC_ENV_PATH (or DOTENV_CONFIG_PATH / ENV_FILE) to an explicit .env path, or provide env vars directly in Cursor mcp.json',
  });
}

/**
 * Returns the resolved path of the loaded .env file (if any).
 * Safe to expose: contains only filesystem path, no secrets.
 */
export function getLoadedEnvPath(): string | null {
  return loadedFrom;
}

export interface EnvConfig {
  jira: {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
  };
  assignees: {
    default?: string;
    auth?: string;
    billing?: string;
    subscription?: string;
    perf?: string;
    ui?: string;
    bizring?: string;
  };
  bitbucket: {
    baseUrl: string;
    username?: string;
    token: string;
    projectKey?: string;
    repoSlug?: string;
  };
  internalApi: {
    baseUrl: string;
    apiKey: string;
  };
  teams: {
    webhookUrl?: string;
  };
  llm: {
    openaiKey?: string;
    anthropicKey?: string;
  };
  pii: {
    sessionTTL: number;
  };
}

export function validateEnv(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}`
    );
  }
}

export function getEnvConfig(): EnvConfig {
  return {
    jira: {
      baseUrl: process.env.JIRA_BASE_URL || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN || '',
      projectKey: process.env.JIRA_PROJECT_KEY || 'VRBT',
    },
    assignees: {
      default: process.env.ASSIGNEE_DEFAULT,
      auth: process.env.ASSIGNEE_AUTH,
      billing: process.env.ASSIGNEE_BILLING,
      subscription: process.env.ASSIGNEE_SUBSCRIPTION,
      perf: process.env.ASSIGNEE_PERF,
      ui: process.env.ASSIGNEE_UI,
      bizring: process.env.ASSIGNEE_BIZRING,
    },
    bitbucket: {
      baseUrl: process.env.BITBUCKET_BASE_URL || '',
      username: process.env.BITBUCKET_USERNAME,
      token: process.env.BITBUCKET_TOKEN || '',
      projectKey: process.env.BITBUCKET_PROJECT_KEY,
      repoSlug: process.env.BITBUCKET_REPO_SLUG,
    },
    internalApi: {
      baseUrl: process.env.INTERNAL_API_BASE_URL || '',
      apiKey: process.env.INTERNAL_API_KEY || '',
    },
    teams: {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    },
    llm: {
      openaiKey: process.env.OPENAI_API_KEY,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
    },
    pii: {
      sessionTTL: parseInt(process.env.PII_SESSION_TTL || '3600000', 10),
    },
  };
}

