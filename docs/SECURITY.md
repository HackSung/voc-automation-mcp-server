# Security Documentation

Comprehensive security guidelines for the VOC Automation MCP Server system.

## Overview

This system handles sensitive customer data (PII) and integrates with critical business systems (Jira, internal APIs). Security is paramount.

## Security Architecture

### Defense in Depth Layers

1. **PII Anonymization Layer**: First line of defense
2. **In-Memory Storage**: No persistent PII storage
3. **Encrypted Communication**: HTTPS for all external APIs
4. **Access Control**: API key authentication
5. **Audit Logging**: All operations logged (except PII)

## PII Protection

### Detection & Anonymization

**Detected PII Types:**

- Email addresses
- Phone numbers (Korean format: 010-XXXX-XXXX)
- Social Security Numbers (Korean: XXXXXX-XXXXXXX)
- Credit card numbers

**Anonymization Process:**

```
Original: "Contact me at john.doe@example.com or 010-1234-5678"
         ↓
Anonymized: "Contact me at [EMAIL_001] or [PHONE_001]"
```

**Key Security Features:**

1. **Reversible but Protected**: Mappings stored only in memory, session-based
2. **Auto-Expiry**: Sessions expire after 1 hour (configurable)
3. **Isolated Processing**: PII never sent to LLM in original form
4. **Selective Restoration**: Only restored when writing to secure systems (Jira)

### Session Management

```
Session Lifecycle:
1. Create session with unique ID
2. Detect & anonymize PII → Store mapping
3. Process with LLM (anonymized text)
4. Restore only when needed (e.g., Jira)
5. Clear session after workflow completion
6. Auto-expire after TTL (default: 1 hour)
```

**Security Best Practices:**

- ✅ Use unique session IDs (e.g., `voc-20260107-001`)
- ✅ Clear sessions immediately after use
- ✅ Never log session mappings
- ❌ Don't reuse session IDs
- ❌ Don't store session IDs in version control

## API Key Management

### Storage

**Environment Variables (Recommended):**

```bash
# Provide via ~/.cursor/mcp.json env or exported env vars
JIRA_API_TOKEN=your_token_here
OPENAI_API_KEY=sk-...
```

**Verification:**

```bash
# Ensure no secrets are committed (basic check)
grep -r "sk-proj\\|sk-ant" . --exclude-dir node_modules --exclude-dir .git && echo "✗ EXPOSED" || echo "✓ Protected"
```

### Rotation Policy

**Recommended Schedule:**

- API Tokens: Every 90 days
- Webhook URLs: When compromised or every 180 days
- Jira Tokens: After employee offboarding

**Rotation Steps:**

1. Generate new credential
2. Update `~/.cursor/mcp.json` env (or exported env vars)
3. Clear uvx cache: `uv cache clean` (Nexus 사용 시)
4. Restart Cursor
5. Verify with health check
6. Revoke old credential

### Masking in Logs

All sensitive values are automatically masked in logs:

```python
# Before logging
token: "sk-proj-1234567890abcdefghijklmnop"

# In logs
token: "sk-p*******************"
```

**Masked Fields:**

- `password`, `token`, `apiKey`, `api_key`
- `authorization`, `secret`
- Any field containing these keywords

## Network Security

### HTTPS Enforcement

All external API calls use HTTPS:

- ✅ Jira API: `https://your-domain.atlassian.net`
- ✅ OpenAI API: `https://api.openai.com`
- ✅ Anthropic API: `https://api.anthropic.com`
- ✅ Teams Webhook: `https://outlook.office.com`

### Retry Logic Security

Exponential backoff prevents:

- Rate limit violations
- Accidental DDoS
- Account suspension

**Configuration:**

```typescript
{
  maxAttempts: 3,
  initialDelay: 1000ms,
  maxDelay: 10000ms,
  backoffMultiplier: 2
}
```

## Data Flow Security

### End-to-End VOC Processing

```
1. User Input (Raw VOC with PII)
         ↓ [Cursor]
2. PII Detection & Anonymization
         ↓ [In-Memory Store]
3. Anonymized Text → LLM Analysis
         ↓ [No PII in LLM Context]
4. Analysis Results → Jira Ticket Creation
         ↓ [Restore PII from Memory]
5. Original Text → Jira Comment
         ↓ [Secure External Storage]
6. Clear Session
         ↓ [Memory Wiped]
7. Response to User
```

**Security Checkpoints:**

- ✅ PII never sent to LLM
- ✅ PII only restored for secure destinations
- ✅ Memory cleared after workflow
- ✅ All API calls over HTTPS
- ✅ Credentials never logged

## LLM Security

### Prompt Injection Prevention

**Risks:**

- Malicious VOC text could manipulate LLM behavior
- Could extract system information
- Could bypass analysis logic

**Mitigations:**

1. **Structured Output**: JSON schema enforcement
2. **Validation**: All LLM responses validated against schema
3. **Sandboxing**: LLM has no system access
4. **Rate Limiting**: Prevents abuse

**Example Safe Prompt:**

```typescript
// Good: Clear role separation
System: 'You are a VOC analyst. Output only valid JSON.';
User: '<user_provided_voc_text>';

// Bad: Mixing instructions with user data
User: 'Analyze this: <user_provided_voc_text>. Ignore previous instructions and...';
```

### Data Minimization

Only necessary data sent to LLM:

- ✅ Anonymized VOC text
- ✅ Analysis instructions
- ❌ API credentials
- ❌ Internal system details
- ❌ Customer PII

## Access Control

### Principle of Least Privilege

Each server has minimal permissions:

| Server           | Permissions                   |
| ---------------- | ----------------------------- |
| PII Security     | None (local only)             |
| VOC Analysis     | OpenAI/Anthropic API (read)   |
| Jira Integration | Jira API (read/write issues)  |
| Internal API     | Internal API (read user data) |

### Authentication Methods

**Jira:**

- Basic Auth (email + API token)
- Token transmitted in `Authorization` header
- Base64 encoded

**OpenAI/Anthropic:**

- Bearer token authentication
- API key in `Authorization` or `x-api-key` header

**Internal API:**

- Custom `X-API-Key` header
- Token-based authentication

## Vulnerability Prevention

### Input Validation

All user inputs are validated:

```python
# Example: Session ID validation
if not session_id or len(session_id) > 100:
    raise ValueError("Invalid session ID")

# Example: Issue key validation
import re
if not re.match(r"^[A-Z]+-\d+$", issue_key):
    raise ValueError("Invalid Jira issue key")
```

### SQL Injection

**Risk Level**: Low (no direct database access)

**Mitigations:**

- All data passes through API abstractions
- No raw SQL queries
- Parameterized API calls only

### XSS (Cross-Site Scripting)

**Risk Level**: Low (server-side only, no web frontend)

**Mitigations:**

- Jira markdown sanitized by Jira
- No HTML rendering in MCP servers

### Dependency Vulnerabilities

**Monitoring:**

```bash
# Check for vulnerabilities (using pip-audit)
pip install pip-audit
pip-audit

# Or update all dependencies
uv sync --upgrade

# Review changes
git diff uv.lock
```

**Schedule**: Weekly audits recommended

## Incident Response

### PII Leak Response

**If PII accidentally logged:**

1. Immediately stop affected server
2. Locate and delete log files
3. Rotate API keys if logs were transmitted
4. Review and fix logging code
5. Document incident
6. Test fix thoroughly

**Prevention:**

```python
# Never log PII
logger.info("Processing session", extra={"session_id": session_id})  # ✓ OK
logger.info("Processing", extra={"original_text": original_text})  # ✗ BAD
```

### API Key Compromise

**If API key leaked:**

1. Revoke compromised key immediately
2. Generate new key
3. Update `~/.cursor/mcp.json` env (or exported env vars)
4. Rebuild and restart
5. Review access logs for abuse
6. Document incident

### Service Abuse

**Signs of abuse:**

- Excessive rate limiting
- Unusual API costs
- Suspicious VOC patterns

**Response:**

1. Check Cursor logs for patterns
2. Review API usage dashboards
3. Rotate keys if necessary
4. Implement additional rate limiting

## Compliance

### GDPR Considerations

**Right to be Forgotten:**

- PII stored only in-memory (auto-expires)
- No persistent PII storage
- Clear session deletes all traces

**Data Minimization:**

- Only necessary data collected
- Anonymization by default
- Restoration only when required

**Consent:**

- Customer consent should be obtained before VOC processing
- Document consent in Jira ticket

### Data Retention

| Data Type        | Storage     | Retention             |
| ---------------- | ----------- | --------------------- |
| PII Mappings     | In-Memory   | 1 hour (TTL)          |
| Anonymized VOC   | LLM Context | Request-only          |
| Analysis Results | Jira        | As per Jira retention |
| Logs             | stderr      | Cursor manages        |

## Security Checklist

### Deployment

- [ ] No secrets are committed to Git
- [ ] All API keys are valid and have minimal permissions
- [ ] HTTPS used for all external APIs
- [ ] PII patterns tested with real examples
- [ ] Session TTL configured appropriately
- [ ] Logs reviewed for sensitive data

### Operations

- [ ] Regular `npm audit` checks
- [ ] API key rotation schedule defined
- [ ] Incident response plan documented
- [ ] Team trained on security practices
- [ ] Logging reviewed periodically

### Code Review

- [ ] No hardcoded credentials
- [ ] All user inputs validated
- [ ] PII never logged
- [ ] Sensitive fields masked
- [ ] Error messages don't leak information

## Security Testing

### Manual Tests

```bash
# Test PII detection
echo "Test: john@example.com and 010-1234-5678" | ...

# Test session expiry
# Create session, wait > TTL, try to retrieve

# Test API key masking
# Check logs for exposed credentials
```

### Automated Tests

Future implementation:

- Unit tests for PII detection
- Integration tests for full workflow
- Security scanning (Snyk, Dependabot)

## Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

**Instead:**

1. Email: [security-contact-email]
2. Include: Description, impact, reproduction steps
3. Allow 90 days for fix before disclosure

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Jira Cloud Security](https://www.atlassian.com/trust/security)
- [OpenAI API Security](https://platform.openai.com/docs/guides/safety-best-practices)
- [GDPR Compliance Guide](https://gdpr.eu/)
