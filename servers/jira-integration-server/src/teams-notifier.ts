import fetch from 'node-fetch';
import { Logger, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('TeamsNotifier');

export interface TeamsNotification {
  title: string;
  summary: string;
  issueKey: string;
  issueUrl: string;
  priority: string;
  assignee?: string;
}

export class TeamsNotifier {
  private readonly webhookUrl: string | null;

  constructor() {
    const config = getEnvConfig();
    this.webhookUrl = config.teams.webhookUrl || null;

    if (this.webhookUrl) {
      logger.info('TeamsNotifier initialized');
    } else {
      logger.warn('Teams webhook URL not configured');
    }
  }

  async sendNotification(notification: TeamsNotification): Promise<boolean> {
    if (!this.webhookUrl) {
      logger.debug('Teams notification skipped (not configured)');
      return false;
    }

    try {
      const card = this.buildAdaptiveCard(notification);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Teams API error: ${response.status} - ${error}`);
      }

      logger.info('Teams notification sent', {
        issueKey: notification.issueKey,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send Teams notification', error);
      return false;
    }
  }

  private buildAdaptiveCard(notification: TeamsNotification): any {
    const priorityColor = this.getPriorityColor(notification.priority);

    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: `🎫 ${notification.title}`,
                weight: 'Bolder',
                size: 'Large',
                wrap: true,
              },
              {
                type: 'FactSet',
                facts: [
                  {
                    title: 'Issue Key',
                    value: notification.issueKey,
                  },
                  {
                    title: 'Priority',
                    value: notification.priority,
                  },
                  ...(notification.assignee
                    ? [
                        {
                          title: 'Assignee',
                          value: notification.assignee,
                        },
                      ]
                    : []),
                ],
              },
              {
                type: 'TextBlock',
                text: notification.summary,
                wrap: true,
                separator: true,
              },
            ],
            actions: [
              {
                type: 'Action.OpenUrl',
                title: 'View in Jira',
                url: notification.issueUrl,
              },
            ],
            msteams: {
              width: 'Full',
            },
          },
        },
      ],
    };
  }

  private getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      Critical: 'attention',
      High: 'warning',
      Medium: 'good',
      Low: 'default',
    };
    return colors[priority] || 'default';
  }
}

