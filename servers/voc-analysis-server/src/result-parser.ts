import { Logger } from '@voc-automation/shared';

const logger = new Logger('ResultParser');

export interface VOCAnalysisResult {
  intent: 'bug_report' | 'feature_request' | 'question' | 'complaint' | 'feedback';
  category: string[];
  primaryCategory: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  sentiment: 'negative' | 'neutral' | 'positive';
  sentimentScore: number;
  summary: string;
  confidence: {
    intent: number;
    priority: number;
  };
  reasoning: {
    intent: string;
    priority: string;
  };
  affectedUsers: string;
}

export class ResultParser {
  constructor() {
    logger.info('ResultParser initialized');
  }

  /**
   * Parse LLM response from unified analysis prompt
   */
  parseUnifiedAnalysis(llmResponse: string): VOCAnalysisResult {
    logger.debug('Parsing unified analysis result');

    try {
      const json = this.extractJSON(llmResponse);

      // Validate structure
      this.validateUnifiedResult(json);

      // Convert to our result format
      const result: VOCAnalysisResult = {
        intent: json.intent.type,
        category: json.category.categories || [],
        primaryCategory: json.category.primary || json.category.categories[0] || 'general',
        priority: json.priority.level,
        sentiment: json.sentiment.type,
        sentimentScore: json.sentiment.score || 0,
        summary: json.summary || '',
        confidence: {
          intent: json.intent.confidence || 0.5,
          priority: json.priority.confidence || 0.5,
        },
        reasoning: {
          intent: json.intent.reasoning || '',
          priority: json.priority.reasoning || '',
        },
        affectedUsers: json.priority.affectedUsers || 'unknown',
      };

      logger.info('Analysis result parsed successfully', {
        intent: result.intent,
        priority: result.priority,
      });

      return result;
    } catch (error) {
      logger.error('Failed to parse unified analysis', error);
      throw new Error(
        `Failed to parse LLM response: ${(error as Error).message}`
      );
    }
  }

  /**
   * Parse individual analysis results (if user runs prompts separately)
   */
  parseIndividualResults(results: {
    intent: string;
    priority: string;
    category: string;
    sentiment: string;
    summary: string;
  }): VOCAnalysisResult {
    logger.debug('Parsing individual analysis results');

    try {
      const intentJson = this.extractJSON(results.intent);
      const priorityJson = this.extractJSON(results.priority);
      const categoryJson = this.extractJSON(results.category);
      const sentimentJson = this.extractJSON(results.sentiment);

      const result: VOCAnalysisResult = {
        intent: intentJson.intent,
        category: categoryJson.categories || [],
        primaryCategory: categoryJson.primary || categoryJson.categories[0] || 'general',
        priority: priorityJson.priority,
        sentiment: sentimentJson.sentiment,
        sentimentScore: sentimentJson.score || 0,
        summary: results.summary.trim(),
        confidence: {
          intent: intentJson.confidence || 0.5,
          priority: priorityJson.confidence || 0.5,
        },
        reasoning: {
          intent: intentJson.reasoning || '',
          priority: priorityJson.reasoning || '',
        },
        affectedUsers: priorityJson.affectedUsers || 'unknown',
      };

      logger.info('Individual results parsed successfully', {
        intent: result.intent,
        priority: result.priority,
      });

      return result;
    } catch (error) {
      logger.error('Failed to parse individual results', error);
      throw new Error(
        `Failed to parse individual results: ${(error as Error).message}`
      );
    }
  }

  /**
   * Extract JSON from LLM response (handles markdown code blocks)
   */
  private extractJSON(text: string): any {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try direct JSON parsing
    try {
      return JSON.parse(text.trim());
    } catch (error) {
      logger.warn('Failed to extract JSON from text', { text: text.slice(0, 200) });
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Validate unified analysis result structure
   */
  private validateUnifiedResult(json: any): void {
    const requiredFields = ['intent', 'priority', 'category', 'sentiment', 'summary'];
    const missingFields = requiredFields.filter((field) => !json[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate intent
    const validIntents = ['bug_report', 'feature_request', 'question', 'complaint', 'feedback'];
    if (!validIntents.includes(json.intent.type)) {
      throw new Error(`Invalid intent type: ${json.intent.type}`);
    }

    // Validate priority
    const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
    if (!validPriorities.includes(json.priority.level)) {
      throw new Error(`Invalid priority level: ${json.priority.level}`);
    }

    // Validate sentiment
    const validSentiments = ['negative', 'neutral', 'positive'];
    if (!validSentiments.includes(json.sentiment.type)) {
      throw new Error(`Invalid sentiment type: ${json.sentiment.type}`);
    }

    // Validate categories
    if (!Array.isArray(json.category.categories)) {
      throw new Error('Categories must be an array');
    }
  }

  /**
   * Create a human-readable summary of the analysis
   */
  formatAnalysisSummary(result: VOCAnalysisResult): string {
    return `
📊 **VOC Analysis Result**

**Intent:** ${result.intent} (${(result.confidence.intent * 100).toFixed(0)}% confidence)
**Priority:** ${result.priority} (${(result.confidence.priority * 100).toFixed(0)}% confidence)
**Category:** ${result.primaryCategory} ${result.category.length > 1 ? `(+${result.category.length - 1} more)` : ''}
**Sentiment:** ${result.sentiment} (${result.sentimentScore.toFixed(2)})
**Affected Users:** ${result.affectedUsers}

**Summary:**
${result.summary}

**Reasoning:**
- Intent: ${result.reasoning.intent}
- Priority: ${result.reasoning.priority}
    `.trim();
  }
}

