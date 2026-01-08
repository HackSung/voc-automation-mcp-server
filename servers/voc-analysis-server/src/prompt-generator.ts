import { Logger } from '@voc-automation/shared';
import {
  INTENT_CLASSIFICATION_PROMPT,
  PRIORITY_EVALUATION_PROMPT,
  CATEGORY_EXTRACTION_PROMPT,
  SENTIMENT_ANALYSIS_PROMPT,
  SUMMARY_GENERATION_PROMPT,
} from './prompts/intent-classifier.js';

const logger = new Logger('PromptGenerator');

export interface VOCAnalysisPrompts {
  intent: string;
  priority: string;
  category: string;
  sentiment: string;
  summary: string;
}

export class PromptGenerator {
  constructor() {
    logger.info('PromptGenerator initialized');
  }

  /**
   * Generate all prompts needed for VOC analysis.
   * The user should run each prompt with their LLM and collect results.
   */
  generateAnalysisPrompts(vocText: string): VOCAnalysisPrompts {
    logger.debug('Generating VOC analysis prompts');

    return {
      intent: this.generateIntentPrompt(vocText),
      priority: this.generatePriorityPrompt(vocText),
      category: this.generateCategoryPrompt(vocText),
      sentiment: this.generateSentimentPrompt(vocText),
      summary: this.generateSummaryPrompt(vocText),
    };
  }

  /**
   * Generate a unified prompt for complete VOC analysis in one LLM call.
   * This is more efficient than running 5 separate prompts.
   */
  generateUnifiedAnalysisPrompt(vocText: string): string {
    logger.debug('Generating unified VOC analysis prompt');

    return `You are a VOC (Voice of Customer) analyst. Analyze the given customer feedback comprehensively.

**Your Task:**
Analyze the VOC text and provide:
1. Intent classification
2. Priority evaluation
3. Category extraction
4. Sentiment analysis
5. Summary generation

**Intent Types:**
- bug_report: Customer reports a software bug, error, or malfunction
- feature_request: Customer requests a new feature or enhancement
- question: Customer asks a question or seeks clarification
- complaint: Customer expresses dissatisfaction or frustration
- feedback: General feedback or suggestions

**Priority Levels:**
- Critical: System down, data loss, security issue, affecting all users
- High: Major functionality broken, affecting many users
- Medium: Moderate impact, workaround available
- Low: Minor issue, cosmetic, nice-to-have

**Common Categories:**
authentication, login, billing, payment, performance, ui/ux, data, api, security, mobile, notification, search, etc.

**Sentiment:**
- negative: Angry, frustrated, disappointed (-1.0 to -0.1)
- neutral: Factual, informative (0.0)
- positive: Happy, satisfied, grateful (0.1 to 1.0)

**Output Format (JSON only):**
\`\`\`json
{
  "intent": {
    "type": "bug_report" | "feature_request" | "question" | "complaint" | "feedback",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation"
  },
  "priority": {
    "level": "Critical" | "High" | "Medium" | "Low",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation",
    "affectedUsers": "all" | "many" | "some" | "few"
  },
  "category": {
    "categories": ["category1", "category2"],
    "primary": "most_relevant_category"
  },
  "sentiment": {
    "type": "negative" | "neutral" | "positive",
    "score": -1.0 to 1.0,
    "reasoning": "Brief explanation"
  },
  "summary": "1-2 sentence clear and actionable summary for Jira ticket"
}
\`\`\`

**VOC Text:**
---
${vocText}
---

**Instructions:**
1. Read the VOC text carefully
2. Analyze all aspects (intent, priority, category, sentiment)
3. Generate a concise summary
4. Return ONLY valid JSON in the format specified above

Respond with JSON only:`;
  }

  private generateIntentPrompt(vocText: string): string {
    return INTENT_CLASSIFICATION_PROMPT.replace('{vocText}', vocText);
  }

  private generatePriorityPrompt(vocText: string, intent?: string): string {
    let prompt = PRIORITY_EVALUATION_PROMPT.replace('{vocText}', vocText);
    if (intent) {
      prompt = prompt.replace('{intent}', intent);
    } else {
      prompt = prompt.replace('\nIntent: {intent}\n', '\n');
    }
    return prompt;
  }

  private generateCategoryPrompt(vocText: string): string {
    return CATEGORY_EXTRACTION_PROMPT.replace('{vocText}', vocText);
  }

  private generateSentimentPrompt(vocText: string): string {
    return SENTIMENT_ANALYSIS_PROMPT.replace('{vocText}', vocText);
  }

  private generateSummaryPrompt(vocText: string): string {
    return SUMMARY_GENERATION_PROMPT.replace('{vocText}', vocText);
  }

  /**
   * Get a specific prompt by type
   */
  getPromptTemplate(
    type: 'intent' | 'priority' | 'category' | 'sentiment' | 'summary'
  ): string {
    switch (type) {
      case 'intent':
        return INTENT_CLASSIFICATION_PROMPT;
      case 'priority':
        return PRIORITY_EVALUATION_PROMPT;
      case 'category':
        return CATEGORY_EXTRACTION_PROMPT;
      case 'sentiment':
        return SENTIMENT_ANALYSIS_PROMPT;
      case 'summary':
        return SUMMARY_GENERATION_PROMPT;
      default:
        throw new Error(`Unknown prompt type: ${type}`);
    }
  }
}

