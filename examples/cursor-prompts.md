# Cursor Prompts for VOC Automation

This document contains example prompts to use in Cursor chat for VOC processing automation.

## Basic VOC Analysis

```
I received a VOC from a customer:

"My email john.doe@example.com is having login issues. 
Account ID: 12345. Phone: 010-1234-5678. 
I keep getting AUTH_001 error when trying to log in."

Please:
1. Anonymize any personal information
2. Analyze the VOC (intent, priority, category)
3. Check for similar existing issues
4. Query the error context for AUTH_001
5. Create a Jira ticket with all findings
6. Restore the original text in the Jira comment
```

## Complete Workflow Example

```
Process this VOC end-to-end:

VOC: "URGENT! Payment processing is down. Error BILL_001. 
Customer: sarah.smith@company.com, phone 010-9876-5432. 
This is affecting all our transactions!"

Steps:
1. Use detectAndAnonymizePII to anonymize (session: voc-20260107-001)
2. Use analyzeVOC to determine intent/priority/category
3. Use findSimilarIssues to check duplicates
4. Use getErrorContext for BILL_001
5. Use queryUserStatus for the customer (if you can extract user ID)
6. Use createJiraIssue with:
   - Project: VOC
   - Priority from analysis
   - Category-based auto-assignment
   - Send Teams notification
7. Use restoreOriginalText and add as Jira comment
8. Use clearSession to cleanup
```

## Testing Individual Tools

### 1. Test PII Detection

```
Use the detectAndAnonymizePII tool with:
- text: "Contact me at john.doe@example.com or 010-1234-5678. My SSN is 123456-1234567."
- sessionId: "test-session-001"

Then restore it with restoreOriginalText using the same sessionId.
```

### 2. Test VOC Analysis

```
Use the analyzeVOC tool to analyze:

"The mobile app crashes every time I try to upload a photo. 
This has been happening for 3 days now and I can't use the app at all. 
Very disappointed with this bug."

What intent, priority, and categories does it return?
```

### 3. Test Jira Creation

```
Create a test Jira issue:
- Project: VOC
- Type: Bug
- Summary: "Login authentication fails with AUTH_001"
- Description: "Customer reports repeated authentication failures. Error code AUTH_001 appearing consistently. High priority due to impact on user access."
- Priority: High
- Category: authentication
- Labels: ["voc", "auth-issue"]
```

### 4. Test Error Context

```
Get the error context for these error codes:
- AUTH_001
- BILL_001
- PERF_001

Compare the resolution steps for each.
```

## Advanced Workflow: Duplicate Detection

```
I have this VOC:

"Login page is broken, getting error AUTH_001 constantly."

Before creating a new ticket:
1. Anonymize if needed
2. Analyze the VOC
3. Use findSimilarIssues to check if we already have similar tickets
4. If similarity > 0.85, don't create new ticket, just add comment to existing one
5. Otherwise, create new ticket and index it with indexIssue
```

## Error Handling Example

```
Process this VOC but handle potential errors gracefully:

"Contact urgent: admin@secretcompany.com, card 1234-5678-9012-3456"

If any tool fails:
- Log the error
- Try fallback approaches
- Still create a basic Jira ticket even if analysis fails
- Report what worked and what didn't
```

## Batch Processing Example

```
I have 3 VOCs to process. For each:
1. Anonymize PII (use unique session IDs)
2. Analyze
3. Create Jira tickets
4. Clear sessions

VOC 1: "Feature request: Add export to CSV functionality"
VOC 2: "Bug: Dashboard not loading, error PERF_001"
VOC 3: "Question: How do I change my email address?"

Process all three and give me a summary table.
```

## Monitoring & Health Check

```
Check the health of all systems:
1. Get PII mapping store stats
2. Check internal API system health
3. Verify Jira connectivity by fetching a known issue (e.g., VOC-1)
4. Report any issues found
```

## Tips for Best Results

1. **Always use unique session IDs** for PII anonymization (e.g., `voc-YYYYMMDD-NNN`)
2. **Chain tool calls logically**: anonymize → analyze → create ticket → restore → cleanup
3. **Check for duplicates** before creating new tickets to avoid spam
4. **Include error context** in Jira descriptions for faster resolution
5. **Use Teams notifications** for Critical/High priority issues
6. **Clear sessions** after workflow completion to prevent memory leaks

## Example Output

After running a complete workflow, you should see:

```json
{
  "vocProcessed": true,
  "sessionId": "voc-20260107-001",
  "piiDetected": {
    "email": 1,
    "phone": 1
  },
  "analysis": {
    "intent": "bug_report",
    "priority": "High",
    "category": ["authentication"],
    "confidence": 0.92
  },
  "similarIssues": 0,
  "jiraTicket": {
    "key": "VOC-123",
    "url": "https://your-domain.atlassian.net/browse/VOC-123",
    "assignee": "auth-team-id"
  },
  "teamsNotificationSent": true,
  "sessionCleared": true
}
```

