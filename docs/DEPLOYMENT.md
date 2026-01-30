# Deployment Guide

Step-by-step guide to deploy the VOC Automation MCP Server system (Python/FastMCP version).

## Prerequisites

- Python 3.13 or higher
- uv (recommended) or pip
- Jira Cloud/Server account with API access
- (Optional) OpenAI API key for similarity search
- (Optional) MS Teams webhook URL
- (Optional) Internal API credentials

## Installation Steps

### 1. Clone and Install Dependencies

```bash
cd /path/to/your/workspace
git clone https://github.com/HackSung/voc-automation-mcp-server.git
cd voc-automation-mcp-server

# Using uv (recommended)
uv python install 3.13
uv sync --all-extras

# Or using pip
python3.13 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### 2. Configure Environment Variables

This project intentionally **does not load env files at runtime**.
Provide required environment variables using one of:

- `~/.cursor/mcp.json` → `mcpServers.<server>`의 `env` 필드 (recommended)
- Exported environment variables in the shell/OS that launches Cursor

**Required Variables:**

```bash
# Jira Configuration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=<your-jira-api-token>
JIRA_PROJECT_KEY=VRBT

# Bitbucket Configuration
BITBUCKET_BASE_URL=http://code.your-company.com
BITBUCKET_TOKEN=<your-bitbucket-token>

# Internal API (if you have legacy systems)
INTERNAL_API_BASE_URL=https://internal-api.example.com
INTERNAL_API_KEY=<your-internal-api-key>
```

**Optional Variables:**

```bash
# OpenAI for similarity search
OPENAI_API_KEY=<your-openai-key>

# MS Teams Notifications
TEAMS_WEBHOOK_URL=<your-teams-webhook-url>

# Auto-Assignment (Jira Server/Data Center: username / Jira Cloud: accountId)
ASSIGNEE_DEFAULT=<default-assignee>
ASSIGNEE_AUTH=<jira-username-for-auth-team>
ASSIGNEE_BILLING=<jira-username-for-billing-team>
ASSIGNEE_SUBSCRIPTION=<jira-username-for-subscription-team>
ASSIGNEE_PERF=<jira-username-for-perf-team>
ASSIGNEE_UI=<jira-username-for-ui-team>
ASSIGNEE_BIZRING=<jira-username-for-bizring-team>

# PII Session TTL (default: 3600000 = 1 hour in ms)
PII_SESSION_TTL=3600000
```

### 3. Verify Installation

Test that all packages import correctly:

```bash
# Using uv
uv run python -c "from shared.config import get_env_config; print('OK')"
uv run python -c "from pii_security.detector import PIIDetector; print('OK')"
uv run python -c "from voc_analysis.prompts import PromptGenerator; print('OK')"
uv run python -c "from jira_integration.client import JiraClient; print('OK')"
uv run python -c "from bitbucket_integration.client import BitbucketClient; print('OK')"
uv run python -c "from internal_api.errors import ErrorResolver; print('OK')"
```

### 4. Test Individual Servers

Before configuring Cursor, test each server independently:

```bash
# Test PII Security Server
uv run voc-pii-security

# Test VOC Analysis Server
uv run voc-analysis

# Test Jira Integration Server
uv run voc-jira-integration

# Test Bitbucket Integration Server
uv run voc-bitbucket-integration

# Test Internal API Server
uv run voc-internal-api
```

Press `Ctrl+C` to stop each server after confirming it starts without errors.

### 5. Configure Cursor MCP

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pii-security": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/voc-automation-mcp-server", "voc-pii-security"],
      "env": {}
    },
    "voc-analysis": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/voc-automation-mcp-server", "voc-analysis"],
      "env": {}
    },
    "jira-integration": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/voc-automation-mcp-server", "voc-jira-integration"],
      "env": {
        "JIRA_BASE_URL": "https://jira.your-company.com",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_PROJECT_KEY": "VRBT",
        "ASSIGNEE_DEFAULT": "your-username"
      }
    },
    "bitbucket-integration": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/voc-automation-mcp-server", "voc-bitbucket-integration"],
      "env": {
        "BITBUCKET_BASE_URL": "http://code.your-company.com",
        "BITBUCKET_TOKEN": "your-bitbucket-token",
        "BITBUCKET_PROJECT_KEY": "VRBT"
      }
    },
    "internal-api": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/voc-automation-mcp-server", "voc-internal-api"],
      "env": {
        "INTERNAL_API_BASE_URL": "your-api-url",
        "INTERNAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 6. Restart Cursor

After configuration, restart Cursor Editor to load the MCP servers.

### 7. Verify Installation

In Cursor chat, type:

```
List all available MCP tools
```

You should see tools from all five servers:
- `detectAndAnonymizePII`, `restoreOriginalText`, `clearSession`, `getStats`
- `generateVOCAnalysisPrompt`, `parseVOCAnalysis`, `formatVOCAnalysis`, `findSimilarIssues`, `indexIssue`
- `createJiraIssue`, `addComment`, `transitionIssue`, `getIssue`, `getIssueAttachments`, `downloadAttachment`
- `listRepositories`, `browseDirectory`, `getFileContent`, `searchCode`, `listPullRequests`, etc.
- `queryUserStatus`, `getErrorContext`, `getErrorLogs`, `searchErrorsByKeyword`, `checkSystemHealth`

## Obtaining API Credentials

### Jira API Token

#### Jira Cloud
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "VOC Automation")
4. Copy the token immediately (it won't be shown again)

#### Jira Server/Data Center
1. Go to Profile → Personal Access Tokens
2. Create a new token
3. Copy and save securely

### Bitbucket Token

#### Bitbucket Server
1. Go to Profile → Personal Access Tokens
2. Create a new token with read permissions
3. Copy and save securely

### MS Teams Webhook

1. In Teams, go to the channel where you want notifications
2. Click "..." → "Connectors" → "Incoming Webhook"
3. Configure and copy the webhook URL

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and save securely

## Troubleshooting

### Server Not Starting

**Check logs:**

```bash
# Run server directly to see errors
uv run voc-pii-security
```

**Common issues:**
- Missing Python version → `uv python install 3.13`
- Missing dependencies → `uv sync`
- Invalid env variables → Check `~/.cursor/mcp.json`

### Cursor Not Detecting Servers

1. Check Cursor MCP config file location (`~/.cursor/mcp.json`)
2. Verify file paths are absolute
3. Restart Cursor completely
4. Check Cursor logs (Help → Show Logs)

### "uv: command not found"

Install uv:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### API Errors

**Jira API:**
- Verify base URL (no trailing slash)
- Check API token is valid
- Ensure email matches Jira account

**Bitbucket API:**
- Check token permissions
- Verify base URL format

## Updating

```bash
# Pull latest changes
git pull

# Update dependencies
uv sync
```

Restart Cursor after updating.

## Monitoring

Logs are written to stderr (to not interfere with MCP stdio protocol).

**View logs in real-time:**

```bash
# In Cursor: Help → Show Logs
# Look for lines with [PIISecurityServer], [VOCAnalysisServer], etc.
```

**Log format (JSON):**
```json
{"level": "info", "message": "[ServerName] message", "timestamp": "...", "data": {...}}
```

## Security Checklist

- [ ] No secrets are committed to Git
- [ ] API tokens are not hardcoded
- [ ] PII data is never logged
- [ ] Session TTL is appropriate (default: 1 hour)
- [ ] HTTPS used for all external APIs
- [ ] API keys rotated regularly (90 days recommended)

## Production Considerations

### Performance

- **LLM Calls**: Cursor handles LLM integration
- **Rate Limits**: Respect API limits (implemented with retry logic)
- **Caching**: Consider caching similar issue embeddings

### Scalability

- **In-Memory Store**: Current PII store is in-memory, suitable for single-user
- **For Multi-User**: Consider Redis or database-backed storage
- **Concurrent Requests**: MCP servers handle one request at a time per Cursor session

### High Availability

- **Retry Logic**: Exponential backoff implemented (tenacity)
- **Health Checks**: Use `checkSystemHealth` tool regularly

## Uninstall

```bash
# Remove from Cursor config
# Edit ~/.cursor/mcp.json and remove server entries

# Delete project
rm -rf /path/to/voc-automation-mcp-server
```

## Support

For issues or questions:
1. Check logs first
2. Review `docs/API.md` for tool usage
3. Test individual servers outside Cursor
4. Check example prompts in `examples/cursor-prompts.md`
