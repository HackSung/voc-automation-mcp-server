import fetch from 'node-fetch';
import { Logger, retryWithBackoff } from '@voc-automation/shared';

const logger = new Logger('LLMClient');

export interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMClient {
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: LLMConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;

    // Default models
    this.model =
      config.model ||
      (config.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-20241022');

    logger.info('LLMClient initialized', {
      provider: this.provider,
      model: this.model,
    });
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    logger.debug('LLM chat request', { messageCount: messages.length });

    if (this.provider === 'openai') {
      return this.chatOpenAI(messages);
    } else if (this.provider === 'anthropic') {
      return this.chatAnthropic(messages);
    }

    throw new Error(`Unsupported provider: ${this.provider}`);
  }

  private async chatOpenAI(messages: LLMMessage[]): Promise<string> {
    const response = await retryWithBackoff(async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`OpenAI API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<any>;
    });

    const content = response.choices[0].message.content;
    logger.debug('LLM response received', {
      tokens: response.usage.total_tokens,
    });

    return content;
  }

  private async chatAnthropic(messages: LLMMessage[]): Promise<string> {
    // Separate system message
    const systemMessage = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const response = await retryWithBackoff(async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2000,
          temperature: 0.3,
          system: systemMessage?.content || '',
          messages: otherMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Anthropic API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<any>;
    });

    const content = response.content[0].text;
    logger.debug('LLM response received', {
      tokens:
        response.usage.input_tokens + response.usage.output_tokens,
    });

    return content;
  }

  async extractJSON(text: string): Promise<any> {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try direct JSON parsing
    try {
      return JSON.parse(text.trim());
    } catch (error) {
      logger.warn('Failed to extract JSON from LLM response', { text });
      throw new Error('Invalid JSON response from LLM');
    }
  }
}

