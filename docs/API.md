# API Documentation

Complete API reference for all MCP servers in the VOC Automation system.

## Table of Contents

1. [PII Security Server](#pii-security-server)
2. [VOC Analysis Server](#voc-analysis-server)
3. [Jira Integration Server](#jira-integration-server)
4. [Internal API Server](#internal-api-server)

---

## PII Security Server

Detects and anonymizes personal information to protect sensitive data.

### Tools

#### `detectAndAnonymizePII`

Detects and anonymizes PII in text.

**Input:**

```json
{
  "text": "string - Original text with potential PII",
  "sessionId": "string - Unique session identifier (e.g., 'voc-20260107-001')"
}
```

**Output:**

```json
{
  "anonymizedText": "string - Text with PII replaced by placeholders",
  "detectedPII": [
    {
      "type": "email|phone|ssn|card",
      "placeholder": "string - e.g., [EMAIL_001]",
      "position": { "start": 0, "end": 0 }
    }
  ],
  "hasPII": "boolean",
  "sessionId": "string"
}
```

#### `restoreOriginalText`

Restores anonymized text to original form.

**Input:**

```json
{
  "anonymizedText": "string - Text with placeholders",
  "sessionId": "string - Session ID used during anonymization"
}
```

**Output:**

```json
{
  "originalText": "string - Restored text",
  "restoredCount": "number - Number of items restored",
  "sessionId": "string"
}
```

#### `clearSession`

Manually clears PII mapping for a session.

**Input:**

```json
{
  "sessionId": "string"
}
```

#### `getStats`

Returns store statistics.

**Output:**

```json
{
  "totalSessions": "number",
  "ttl": "number - Time-to-live in milliseconds"
}
```

---

## VOC Analysis Server

Prompt generation and result parsing for LLM-based VOC analysis.

> **Note (v2.0)**: Cursor의 LLM을 활용하므로 별도 API 키가 필요 없습니다!

### Tools

#### `generateVOCAnalysisPrompt`

VOC 분석용 프롬프트를 생성합니다. 생성된 프롬프트를 Cursor LLM에 전달하여 분석합니다.

**Input:**

```json
{
  "vocText": "string - VOC text (should be anonymized)",
  "metadata": {
    "customerId": "string - optional",
    "source": "string - optional",
    "timestamp": "string - optional"
  }
}
```

**Output:**

```json
{
  "prompt": "string - LLM에 전달할 프롬프트",
  "vocText": "string - 입력된 VOC 텍스트",
  "metadata": "object - echoed back"
}
```

#### `parseVOCAnalysis`

LLM 응답을 파싱하여 구조화된 분석 결과를 반환합니다.

**Input:**

```json
{
  "llmResponse": "string - LLM의 JSON 응답"
}
```

**Output:**

```json
{
  "intent": "bug_report|feature_request|question|complaint|feedback",
  "category": ["string"],
  "primaryCategory": "string",
  "priority": "Critical|High|Medium|Low",
  "sentiment": "negative|neutral|positive",
  "sentimentScore": "number - -1.0 to 1.0",
  "summary": "string - Concise summary",
  "confidence": {
    "intent": "number - 0.0 to 1.0",
    "priority": "number"
  },
  "reasoning": {
    "intent": "string",
    "priority": "string"
  },
  "affectedUsers": "string - all|many|some|few"
}
```

#### `formatVOCAnalysis`

분석 결과를 읽기 쉬운 형식으로 포맷팅합니다.

**Input:**

```json
{
  "analysis": "object - parseVOCAnalysis의 결과"
}
```

**Output:**

```json
{
  "formatted": "string - 포맷팅된 분석 결과",
  "jiraDescription": "string - Jira 티켓용 설명"
}
```

#### `findSimilarIssues`

Finds similar issues using embeddings (requires OpenAI API key).

**Input:**

```json
{
  "vocText": "string",
  "topK": "number - default: 5"
}
```

**Output:**

```json
{
  "similarIssues": [
    {
      "jiraKey": "string",
      "similarity": "number - 0.0 to 1.0",
      "summary": "string"
    }
  ],
  "count": "number"
}
```

#### `indexIssue`

Indexes a Jira issue for similarity search.

**Input:**

```json
{
  "jiraKey": "string - e.g., 'VOC-123'",
  "summary": "string - Issue title"
}
```

---

## Jira Integration Server

Manages Jira tickets and notifications.

### Tools

#### `createJiraIssue`

Creates a new Jira issue with auto-assignment.

**Input:**

```json
{
  "project": "string - Project key (e.g., 'VOC')",
  "issueType": "Bug|Task|Story|Epic",
  "summary": "string - Max 255 chars",
  "description": "string - Supports Jira markdown",
  "priority": "Critical|High|Medium|Low",
  "labels": ["string"],
  "category": "string - For auto-assignment (e.g., 'authentication')",
  "assignee": "string - Optional: Override auto-assignment",
  "sendNotification": "boolean - Send Teams alert (default: false)"
}
```

**Output:**

```json
{
  "issueKey": "string",
  "issueId": "string",
  "url": "string",
  "created": true
}
```

#### `addComment`

Adds a comment to an existing issue.

**Input:**

```json
{
  "issueKey": "string",
  "comment": "string - Supports Jira markdown"
}
```

**Output:**

```json
{
  "commentId": "string",
  "added": true
}
```

#### `transitionIssue`

Changes issue status (e.g., "In Progress", "Done").

**Input:**

```json
{
  "issueKey": "string",
  "transitionName": "string - Case-insensitive"
}
```

**Output:**

```json
{
  "success": true,
  "currentStatus": "string"
}
```

#### `getIssue`

Retrieves issue details.

**Input:**

```json
{
  "issueKey": "string"
}
```

**Output:**

```json
{
  "key": "string",
  "summary": "string",
  "status": "string",
  "priority": "string",
  "assignee": "string",
  "created": "string",
  "updated": "string"
}
```

---

## Internal API Server

Integrates with legacy systems for error context.

### Tools

#### `queryUserStatus`

Queries user status from internal systems.

**Input:**

```json
{
  "userId": "string",
  "queryType": "subscription|auth|cancellation"
}
```

**Output:**

```json
{
  "userId": "string",
  "status": "string",
  "details": {},
  "errorLogs": [
    {
      "timestamp": "string",
      "errorCode": "string",
      "message": "string"
    }
  ]
}
```

#### `getErrorContext`

Retrieves detailed error information.

**Input:**

```json
{
  "errorCode": "string - e.g., 'AUTH_001'"
}
```

**Output:**

```json
{
  "errorCode": "string",
  "errorDescription": "string",
  "possibleCauses": ["string"],
  "resolutionSteps": ["string"]
}
```

**Available Error Codes:**

- `AUTH_001` - Invalid credentials
- `AUTH_002` - MFA failed
- `BILL_001` - Payment declined
- `BILL_002` - Subscription expired
- `PERF_001` - Request timeout
- `PERF_002` - Rate limit exceeded
- `DATA_001` - Data not found
- `INT_001` - Third-party API failure

#### `getErrorLogs`

Fetches recent error logs for a user.

**Input:**

```json
{
  "userId": "string",
  "limit": "number - default: 10"
}
```

**Output:**

```json
{
  "userId": "string",
  "logs": [
    {
      "timestamp": "string",
      "errorCode": "string",
      "message": "string",
      "context": {}
    }
  ],
  "count": "number"
}
```

#### `searchErrorsByKeyword`

Searches error codes by keyword.

**Input:**

```json
{
  "keyword": "string - e.g., 'authentication'"
}
```

**Output:**

```json
{
  "keyword": "string",
  "results": [
    {
      "errorCode": "string",
      "context": {
        "errorDescription": "string",
        "possibleCauses": ["string"],
        "resolutionSteps": ["string"]
      }
    }
  ],
  "count": "number"
}
```

#### `checkSystemHealth`

Checks internal API health.

**Output:**

```json
{
  "status": "healthy|unhealthy|unreachable",
  "services": {}
}
```

---

## Error Handling

All tools return errors in this format:

```json
{
  "error": "string - Error message",
  "tool": "string - Tool name"
}
```

With `isError: true` flag set.

## Best Practices

1. **Always anonymize first**: Use PII tools before analysis
2. **Use unique session IDs**: Format: `voc-YYYYMMDD-NNN`
3. **Check for duplicates**: Use `findSimilarIssues` before creating tickets
4. **Clear sessions**: Call `clearSession` after workflow completion
5. **Handle errors gracefully**: All tools may fail, implement fallbacks
6. **Index new issues**: Call `indexIssue` after creating tickets for future similarity search

---

**Version**: 2.0.0 (Python/FastMCP)  
**Last Updated**: 2026-01-29
