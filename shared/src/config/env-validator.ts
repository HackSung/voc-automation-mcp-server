import { config } from 'dotenv';
import { join } from 'path';

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

const candidateEnvPaths: Array<string | undefined> = [
  explicitEnvPath,
  process.env.INIT_CWD ? join(process.env.INIT_CWD, '.env') : undefined,
  process.env.PWD ? join(process.env.PWD, '.env') : undefined,
  join(process.cwd(), '.env'),
];

for (const p of candidateEnvPaths) {
  if (!p) continue;
  const result = config({ path: p });
  if (!result.error) break;
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

