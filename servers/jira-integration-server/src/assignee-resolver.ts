import { Logger, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('AssigneeResolver');

export class AssigneeResolver {
  private readonly categoryToAssignee: Record<string, string>;
  private readonly defaultAssignee: string | null;

  constructor() {
    const config = getEnvConfig();

    this.categoryToAssignee = {
      authentication: config.assignees.auth || '',
      auth: config.assignees.auth || '',
      login: config.assignees.auth || '',
      billing: config.assignees.billing || '',
      payment: config.assignees.billing || '',
      subscription: config.assignees.billing || '',
      performance: config.assignees.perf || '',
      perf: config.assignees.perf || '',
      slow: config.assignees.perf || '',
      ui: config.assignees.ui || '',
      ux: config.assignees.ui || '',
      'ui-ux': config.assignees.ui || '',
      interface: config.assignees.ui || '',
    };

    // Remove empty values
    Object.keys(this.categoryToAssignee).forEach((key) => {
      if (!this.categoryToAssignee[key]) {
        delete this.categoryToAssignee[key];
      }
    });

    this.defaultAssignee = null;

    logger.info('AssigneeResolver initialized', {
      mappings: Object.keys(this.categoryToAssignee).length,
    });
  }

  resolve(category: string): string | null {
    if (!category) return this.defaultAssignee;

    const normalizedCategory = category
      .toLowerCase()
      .replace(/[_\s]/g, '-')
      .trim();

    // Direct match
    if (this.categoryToAssignee[normalizedCategory]) {
      logger.debug('Assignee resolved', {
        category,
        assignee: this.categoryToAssignee[normalizedCategory],
      });
      return this.categoryToAssignee[normalizedCategory];
    }

    // Partial match
    for (const [key, assignee] of Object.entries(this.categoryToAssignee)) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        logger.debug('Assignee resolved (partial match)', {
          category,
          matchedKey: key,
          assignee,
        });
        return assignee;
      }
    }

    logger.debug('No assignee found for category', { category });
    return this.defaultAssignee;
  }

  resolveMultiple(categories: string[]): string | null {
    for (const category of categories) {
      const assignee = this.resolve(category);
      if (assignee) return assignee;
    }
    return this.defaultAssignee;
  }
}

