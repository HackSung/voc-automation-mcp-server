# Deployment Guide

Step-by-step guide to deploy the VOC Automation MCP Server system.

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- Jira Cloud account with API access
- OpenAI or Anthropic API key
- (Optional) MS Teams webhook URL
- (Optional) Internal API credentials

## Installation Steps

### 1. Clone and Install Dependencies

```bash
cd /Users/1004359/voc-automation-mcp-server

# Install all dependencies
npm install

# Install dependencies for all workspaces
npm install --workspaces
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

# LLM Configuration (at least one required)
OPENAI_API_KEY=<your-openai-key>
# OR
ANTHROPIC_API_KEY=<your-anthropic-key>

# Internal API (if you have legacy systems)
INTERNAL_API_BASE_URL=https://internal-api.example.com
INTERNAL_API_KEY=<your-internal-api-key>
```

**Optional Variables:**

```bash
# MS Teams Notifications
TEAMS_WEBHOOK_URL=<your-teams-webhook-url>

# Auto-Assignment (Jira Server/Data Center: username / assignee.name)
ASSIGNEE_AUTH=<jira-username-for-auth-team>
ASSIGNEE_BILLING=<jira-username-for-billing-team>
ASSIGNEE_SUBSCRIPTION=<jira-username-for-subscription-team>
ASSIGNEE_PERF=<jira-username-for-perf-team>
ASSIGNEE_UI=<jira-username-for-ui-team>

# PII Session TTL (default: 3600000 = 1 hour)
PII_SESSION_TTL=3600000
```

### 3. Build All Servers

```bash
# Build all MCP servers
npm run build
```

This will compile TypeScript to JavaScript in each server's `dist/` directory.

### 4. Test Individual Servers

Before configuring Cursor, test each server independently:

```bash
# Test PII Security Server
node servers/pii-security-server/dist/index.js

# Test VOC Analysis Server
node servers/voc-analysis-server/dist/index.js

# Test Jira Integration Server
node servers/jira-integration-server/dist/index.js

# Test Internal API Server
node servers/internal-api-server/dist/index.js
```

Press `Ctrl+C` to stop each server after confirming it starts without errors.

### 5. Configure Cursor MCP

#### Option A: Global Configuration

Edit `~/.cursor/mcp.json` (or equivalent for your OS):

```json
{
  "mcpServers": {
    "pii-security": {
      "command": "node",
      "args": [
        "/Users/1004359/voc-automation-mcp-server/servers/pii-security-server/dist/index.js"
      ]
    },
    "voc-analysis": {
      "command": "node",
      "args": [
        "/Users/1004359/voc-automation-mcp-server/servers/voc-analysis-server/dist/index.js"
      ]
    },
    "jira-integration": {
      "command": "node",
      "args": [
        "/Users/1004359/voc-automation-mcp-server/servers/jira-integration-server/dist/index.js"
      ]
    },
    "internal-api": {
      "command": "node",
      "args": [
        "/Users/1004359/voc-automation-mcp-server/servers/internal-api-server/dist/index.js"
      ]
    }
  }
}
```

#### Option B: Workspace Configuration

Copy the provided config file:

```bash
cp cursor-mcp-config.json .cursor/mcp.json
```

Update paths if necessary.

### 6. Restart Cursor

After configuration, restart Cursor Editor to load the MCP servers.

### 7. Verify Installation

In Cursor chat, type:

```
List all available MCP tools
```

You should see tools from all four servers:
- `detectAndAnonymizePII`, `restoreOriginalText`, etc.
- `analyzeVOC`, `findSimilarIssues`, etc.
- `createJiraIssue`, `addComment`, etc.
- `queryUserStatus`, `getErrorContext`, etc.

## Obtaining API Credentials

### Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "VOC Automation")
4. Copy the token immediately (it won't be shown again)

### Jira Account IDs (for Auto-Assignment)

1. Go to https://your-domain.atlassian.net/jira/people
2. Click on a user
3. The URL will contain the Account ID: `.../people/<ACCOUNT_ID>`

### MS Teams Webhook

1. In Teams, go to the channel where you want notifications
2. Click "..." → "Connectors" → "Incoming Webhook"
3. Configure and copy the webhook URL

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and save securely

### Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy and save securely

## Troubleshooting

### Server Not Starting

**Check logs:**

```bash
# Run server with verbose output
NODE_ENV=development node servers/pii-security-server/dist/index.js
```

**Common issues:**
- Missing environment variables → Check your `~/.cursor/mcp.json` `env` injection
- Port conflicts → Servers use stdio, not ports
- Permission issues → Ensure files are executable

### Cursor Not Detecting Servers

1. Check Cursor MCP config file location
2. Verify file paths are absolute
3. Restart Cursor completely
4. Check Cursor logs (Help → Show Logs)

### API Errors

**Jira API:**
- Verify base URL (should end with `.atlassian.net`, no trailing slash)
- Check API token is valid
- Ensure email matches Jira account

**LLM API:**
- Check API key is active
- Verify billing/usage limits not exceeded
- Test with a simple curl request

### PII Detection Not Working

- Check regex patterns in `pii-detector.ts`
- Add custom patterns if needed
- Test with known PII examples

## Updating

```bash
# Pull latest changes
git pull

# Rebuild all servers
npm run build
```

Restart Cursor after updating.

## Monitoring

Logs are written to stderr (to not interfere with MCP stdio protocol).

**View logs in real-time:**

```bash
# In Cursor: Help → Show Logs
# Look for lines with [PIISecurityServer], [VOCAnalysisServer], etc.
```

**Log levels:**
- `debug`: Detailed operational info
- `info`: Normal operations
- `warn`: Potential issues
- `error`: Failures

## Security Checklist

- [ ] No secrets are committed to Git
- [ ] API tokens are not hardcoded
- [ ] PII data is never logged
- [ ] Session TTL is appropriate (default: 1 hour)
- [ ] HTTPS used for all external APIs
- [ ] API keys rotated regularly (90 days recommended)

## Production Considerations

### Performance

- **LLM Calls**: Parallel execution where possible (already implemented)
- **Rate Limits**: Respect API limits (implemented with retry logic)
- **Caching**: Consider caching similar issue embeddings

### Scalability

- **In-Memory Store**: Current PII store is in-memory, suitable for single-user
- **For Multi-User**: Consider Redis or database-backed storage
- **Concurrent Requests**: MCP servers handle one request at a time per Cursor session

### High Availability

- **Fallback LLMs**: System auto-switches between OpenAI/Anthropic
- **Retry Logic**: Exponential backoff implemented
- **Health Checks**: Use `checkSystemHealth` tool regularly

## Uninstall

```bash
# Remove from Cursor config
# Edit ~/.cursor/mcp.json and remove server entries

# Delete project
rm -rf /Users/1004359/voc-automation-mcp-server
```

## Support

For issues or questions:
1. Check logs first
2. Review `docs/API.md` for tool usage
3. Test individual servers outside Cursor
4. Check example prompts in `examples/cursor-prompts.md`

