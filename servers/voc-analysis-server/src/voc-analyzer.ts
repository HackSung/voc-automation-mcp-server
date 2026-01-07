import { LLMClient, LLMMessage } from './llm-client.js';
import { Logger } from '@voc-automation/shared';
import {
  INTENT_CLASSIFICATION_PROMPT,
  PRIORITY_EVALUATION_PROMPT,
  CATEGORY_EXTRACTION_PROMPT,
  SENTIMENT_ANALYSIS_PROMPT,
  SUMMARY_GENERATION_PROMPT,
} from './prompts/intent-classifier.js';

const logger = new Logger('VOCAnalyzer');

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

export class VOCAnalyzer {
  constructor(private llmClient: LLMClient) {
    logger.info('VOCAnalyzer initialized');
  }

  async analyze(vocText: string): Promise<VOCAnalysisResult> {
    logger.info('Starting VOC analysis');

    try {
      // Parallel analysis for better performance
      const [intentResult, categoryResult, sentimentResult] = await Promise.all([
        this.analyzeIntent(vocText),
        this.extractCategories(vocText),
        this.analyzeSentiment(vocText),
      ]);

      // Priority depends on intent, so run after
      const priorityResult = await this.evaluatePriority(
        vocText,
        intentResult.intent
      );

      // Generate summary last
      const summary = await this.generateSummary(vocText);

      const result: VOCAnalysisResult = {
        intent: intentResult.intent,
        category: categoryResult.categories,
        primaryCategory: categoryResult.primary,
        priority: priorityResult.priority,
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        summary,
        confidence: {
          intent: intentResult.confidence,
          priority: priorityResult.confidence,
        },
        reasoning: {
          intent: intentResult.reasoning,
          priority: priorityResult.reasoning,
        },
        affectedUsers: priorityResult.affectedUsers,
      };

      logger.info('VOC analysis completed', {
        intent: result.intent,
        priority: result.priority,
        categories: result.category.length,
      });

      return result;
    } catch (error) {
      logger.error('VOC analysis failed', error);
      throw error;
    }
  }

  private async analyzeIntent(vocText: string): Promise<{
    intent: VOCAnalysisResult['intent'];
    confidence: number;
    reasoning: string;
  }> {
    const prompt = INTENT_CLASSIFICATION_PROMPT.replace('{vocText}', vocText);

    const response = await this.llmClient.chat([
      { role: 'user', content: prompt },
    ]);

    const parsed = await this.llmClient.extractJSON(response);

    return {
      intent: parsed.intent,
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || '',
    };
  }

  private async evaluatePriority(
    vocText: string,
    intent: string
  ): Promise<{
    priority: VOCAnalysisResult['priority'];
    confidence: number;
    reasoning: string;
    affectedUsers: string;
  }> {
    const prompt = PRIORITY_EVALUATION_PROMPT.replace(
      '{vocText}',
      vocText
    ).replace('{intent}', intent);

    const response = await this.llmClient.chat([
      { role: 'user', content: prompt },
    ]);

    const parsed = await this.llmClient.extractJSON(response);

    return {
      priority: parsed.priority,
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || '',
      affectedUsers: parsed.affectedUsers || 'unknown',
    };
  }

  private async extractCategories(vocText: string): Promise<{
    categories: string[];
    primary: string;
  }> {
    const prompt = CATEGORY_EXTRACTION_PROMPT.replace('{vocText}', vocText);

    const response = await this.llmClient.chat([
      { role: 'user', content: prompt },
    ]);

    const parsed = await this.llmClient.extractJSON(response);

    return {
      categories: parsed.categories || [],
      primary: parsed.primary || parsed.categories[0] || 'general',
    };
  }

  private async analyzeSentiment(vocText: string): Promise<{
    sentiment: VOCAnalysisResult['sentiment'];
    score: number;
    reasoning: string;
  }> {
    const prompt = SENTIMENT_ANALYSIS_PROMPT.replace('{vocText}', vocText);

    const response = await this.llmClient.chat([
      { role: 'user', content: prompt },
    ]);

    const parsed = await this.llmClient.extractJSON(response);

    return {
      sentiment: parsed.sentiment,
      score: parsed.score || 0,
      reasoning: parsed.reasoning || '',
    };
  }

  private async generateSummary(vocText: string): Promise<string> {
    const prompt = SUMMARY_GENERATION_PROMPT.replace('{vocText}', vocText);

    const response = await this.llmClient.chat([
      { role: 'user', content: prompt },
    ]);

    return response.trim();
  }
}

