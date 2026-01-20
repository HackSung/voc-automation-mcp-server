import { Logger, getEnvConfig } from '@voc-automation/shared';

const logger = new Logger('AssigneeResolver');

/**
 * IMPORTANT:
 * - We intentionally do NOT hardcode real-user fallbacks.
 * - If assignee env vars are missing, we prefer "no auto-assignment" over
 *   assigning to the wrong person.
 *
 * NOTE:
 * - Jira Server/Data Center uses `assignee.name` (username).
 */

export class AssigneeResolver {
  private readonly categoryToAssignee: Record<string, string>;
  private readonly defaultAssignee: string | null;
  private readonly bizringAssignee: string | null;

  constructor() {
    const config = getEnvConfig();

    const defaultAssignee = config.assignees.default?.trim();
    const bizringAssignee = config.assignees.bizring?.trim();

    this.defaultAssignee = defaultAssignee && defaultAssignee.length > 0 ? defaultAssignee : null;
    this.bizringAssignee = bizringAssignee && bizringAssignee.length > 0 ? bizringAssignee : null;

    this.categoryToAssignee = {
      authentication: config.assignees.auth || '',
      auth: config.assignees.auth || '',
      login: config.assignees.auth || '',
      billing: config.assignees.billing || '',
      payment: config.assignees.billing || '',
      // Prefer dedicated subscription assignee; fall back to billing for backward compatibility
      subscription: config.assignees.subscription || config.assignees.billing || '',
      performance: config.assignees.perf || '',
      perf: config.assignees.perf || '',
      slow: config.assignees.perf || '',
      ui: config.assignees.ui || '',
      ux: config.assignees.ui || '',
      'ui-ux': config.assignees.ui || '',
      interface: config.assignees.ui || '',
      // V비즈링 관련 자동 할당
      bizring: config.assignees.bizring || '',
      '비즈링': config.assignees.bizring || '',
      'v비즈링': config.assignees.bizring || '',
      'vbizring': config.assignees.bizring || '',
    };

    // Remove empty values
    Object.keys(this.categoryToAssignee).forEach((key) => {
      if (!this.categoryToAssignee[key]) {
        delete this.categoryToAssignee[key];
      }
    });

    logger.info('AssigneeResolver initialized', {
      mappings: Object.keys(this.categoryToAssignee).length,
      hasDefault: Boolean(this.defaultAssignee),
    });
  }

  resolve(category: string): string | null {
    if (!category) return this.defaultAssignee;

    const normalizedCategory = category
      .toLowerCase()
      .replace(/[_\s/\\]+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Special-case: Bizring categories should never fall back to default assignee.
    // If ASSIGNEE_BIZRING isn't configured, it's safer to leave unassigned.
    const bizringCategoryMarkers = ['비즈링', 'bizring', 'v비즈링', 'vbizring'];
    const isBizringCategory = bizringCategoryMarkers.some((m) => normalizedCategory.includes(m));
    if (isBizringCategory && !this.bizringAssignee) {
      logger.warn('bizring 카테고리이지만 ASSIGNEE_BIZRING 미설정 - 자동 할당 생략', {
        category,
        normalizedCategory,
      });
      return null;
    }

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

  /**
   * VOC 내용(제목, 설명)에서 키워드를 감지하여 담당자 자동 할당
   * V비즈링 관련 키워드가 있으면 환경변수의 담당자로 할당
   */
  resolveFromText(summary: string, description: string): string | null {
    const text = `${summary} ${description}`.toLowerCase();
    
    // V비즈링 관련 키워드 감지
    const bizringKeywords = ['비즈링', 'bizring', 'v비즈링', 'vbizring'];
    for (const keyword of bizringKeywords) {
      if (text.includes(keyword)) {
        // Only assign if explicit bizring assignee is configured.
        // Falling back to default here can easily mis-assign Bizring VOCs.
        const assignee = this.bizringAssignee;
        if (!assignee) {
          logger.warn('V비즈링 키워드 감지했지만 ASSIGNEE_BIZRING 미설정 - 자동 할당 생략', {
            keyword,
            summary: summary.substring(0, 50),
          });
          return null;
        }

        logger.info('V비즈링 관련 VOC 감지 - 담당자 자동 할당', {
          keyword,
          assignee,
          summary: summary.substring(0, 50),
        });
        return assignee;
      }
    }
    
    return null;
  }
}

