import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../../..');
config({ path: join(rootDir, '.env') });

export interface EnvConfig {
  jira: {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
  };
  assignees: {
    auth?: string;
    billing?: string;
    perf?: string;
    ui?: string;
    bizring?: string;
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
      auth: process.env.ASSIGNEE_AUTH,
      billing: process.env.ASSIGNEE_BILLING,
      perf: process.env.ASSIGNEE_PERF,
      ui: process.env.ASSIGNEE_UI,
      bizring: process.env.ASSIGNEE_BIZRING,
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

