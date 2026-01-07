export const INTENT_CLASSIFICATION_PROMPT = `You are a VOC (Voice of Customer) analyst. Analyze the given customer feedback and classify it into one of the following intents:

**Intent Types:**
- bug_report: Customer reports a software bug, error, or malfunction
- feature_request: Customer requests a new feature or enhancement
- question: Customer asks a question or seeks clarification
- complaint: Customer expresses dissatisfaction or frustration
- feedback: General feedback or suggestions

**Instructions:**
1. Read the VOC text carefully
2. Identify the primary intent
3. Extract key information
4. Return ONLY valid JSON

**Output Format:**
\`\`\`json
{
  "intent": "bug_report" | "feature_request" | "question" | "complaint" | "feedback",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification"
}
\`\`\`

VOC Text:
---
{vocText}
---

Respond with JSON only:`;

export const PRIORITY_EVALUATION_PROMPT = `You are a priority evaluation expert. Analyze the VOC and determine its priority level.

**Priority Levels:**
- Critical: System down, data loss, security issue, affecting all users
- High: Major functionality broken, affecting many users
- Medium: Moderate impact, workaround available
- Low: Minor issue, cosmetic, nice-to-have

**Consider:**
- Business impact
- Number of affected users
- Severity of the issue
- Workaround availability

**Output Format:**
\`\`\`json
{
  "priority": "Critical" | "High" | "Medium" | "Low",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "affectedUsers": "all" | "many" | "some" | "few"
}
\`\`\`

VOC Text:
---
{vocText}
---

Intent: {intent}

Respond with JSON only:`;

export const CATEGORY_EXTRACTION_PROMPT = `Extract categories from the VOC text. Identify the main technical/functional areas involved.

**Common Categories:**
- authentication, login, signup
- billing, payment, subscription
- performance, speed, latency
- ui, ux, interface, design
- data, database, storage
- api, integration
- security, privacy
- mobile, ios, android
- notification, email
- search, filter

**Output Format:**
\`\`\`json
{
  "categories": ["category1", "category2"],
  "primary": "most_relevant_category"
}
\`\`\`

VOC Text:
---
{vocText}
---

Respond with JSON only:`;

export const SENTIMENT_ANALYSIS_PROMPT = `Analyze the sentiment of the VOC text.

**Sentiment:**
- negative: Angry, frustrated, disappointed
- neutral: Factual, informative
- positive: Happy, satisfied, grateful

**Output Format:**
\`\`\`json
{
  "sentiment": "negative" | "neutral" | "positive",
  "score": -1.0 to 1.0,
  "reasoning": "Brief explanation"
}
\`\`\`

VOC Text:
---
{vocText}
---

Respond with JSON only:`;

export const SUMMARY_GENERATION_PROMPT = `Generate a concise summary of the VOC for Jira ticket creation.

**Requirements:**
- 1-2 sentences
- Clear and actionable
- Technical details included
- User-friendly language

VOC Text:
---
{vocText}
---

Respond with plain text summary (no JSON):`;

