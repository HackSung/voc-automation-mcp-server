import fetch from 'node-fetch';
import { Logger, retryWithBackoff, RetryableError } from '@voc-automation/shared';
import { AssigneeResolver } from './assignee-resolver.js';

const logger = new Logger('JiraClient');

/**
 * Jira Server/Data Center description field commonly interprets text as Wiki Markup.
 * In that markup, lines starting with `##` are nested ordered list items (causing `1. 1 ...`).
 * We normalize common Markdown headings to Jira wiki headings (h1./h2./...).
 *
 * We avoid transforming inside fenced code blocks.
 */
function normalizeDescriptionForJira(description: string): string {
  const lines = (description ?? '').replace(/\r\n/g, '\n').split('\n');
  let inCodeBlock = false;

  const out = lines.map((line) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    if (inCodeBlock) return line;

    // Jira wiki markup treats leading `#` as ordered-list markers.
    // Some descriptions may indent headings (e.g. "  ## VOC"), which Jira still interprets as a list.
    // Normalize Markdown headings to Jira wiki headings, and force them to start at column 0:
    // "  ## VOC" -> "h2. VOC" (NOT "  h2. VOC")
    const match = /^\s*(#{1,6})\s+(.*)$/.exec(line);
    if (!match) return line;

    const level = (match[1] ?? '').length;
    const title = (match[2] ?? '').trim();
    if (!title) return line;
    return `h${level}. ${title}`.trimEnd();
  });

  return out.join('\n');
}

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface CreateIssueParams {
  project: string;
  issueType: string;
  summary: string;
  description: string;
  priority: string;
  labels?: string[];
  components?: string[];
  category?: string;
  assignee?: string;
}

export interface CreateIssueResult {
  issueKey: string;
  issueId: string;
  url: string;
  created: boolean;
  assigneeRequested?: string | null;
  assigneeFinalDisplayName?: string | null;
  assigneeFinalUsername?: string | null;
  assigneeApplied?: boolean;
}

export interface AddCommentResult {
  commentId: string;
  added: boolean;
}

export interface TransitionResult {
  success: boolean;
  currentStatus: string;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  created: string;
  author: string;
  content: string; // Download URL
}

export interface AttachmentsResult {
  issueKey: string;
  count: number;
  attachments: Attachment[];
}

export class JiraClient {
  private assigneeResolver: AssigneeResolver;
  private assigneeFieldMode: 'name' | 'accountId' = 'name';
  private assigneeFieldModeDetected = false;

  constructor(private config: JiraConfig) {
    this.assigneeResolver = new AssigneeResolver();
    logger.info('JiraClient initialized (Jira Server/Data Center)', { 
      baseUrl: config.baseUrl
    });
  }

  private buildAssigneeField(assignee: string): { name: string } | { accountId: string } {
    const trimmed = assignee.trim();
    return this.assigneeFieldMode === 'accountId'
      ? { accountId: trimmed }
      : { name: trimmed };
  }

  private async detectAssigneeFieldMode(): Promise<void> {
    if (this.assigneeFieldModeDetected) return;
    this.assigneeFieldModeDetected = true;

    try {
      const response = await fetch(`${this.config.baseUrl}/rest/api/2/serverInfo`, {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader() },
      });
      if (!response.ok) return;
      const data = (await response.json()) as any;
      const deploymentType = String(data?.deploymentType || '').toLowerCase();
      if (deploymentType === 'cloud') {
        this.assigneeFieldMode = 'accountId';
        logger.info('Detected Jira Cloud; using assignee.accountId mode');
      } else if (deploymentType) {
        this.assigneeFieldMode = 'name';
        logger.info('Detected Jira deployment; using assignee.name mode', { deploymentType });
      }
    } catch (e) {
      logger.debug('Failed to detect Jira deployment type; defaulting to assignee.name mode', {
        error: (e as Error).message,
      });
    }
  }

  private getAuthHeader(): string {
    // Check if token is already a Bearer token (for Jira Server/Data Center)
    // Bearer tokens don't contain colons and are typically 40+ characters
    if (this.config.apiToken.length > 30 && !this.config.apiToken.includes(':')) {
      // Likely a Bearer token for Jira Server
      logger.debug('Using Bearer token authentication (Jira Server)');
      return `Bearer ${this.config.apiToken}`;
    }
    
    // Default: Basic Auth for Jira Server/Data Center
    logger.debug('Using Basic authentication (Jira Server/Data Center)');
    const token = Buffer.from(
      `${this.config.email}:${this.config.apiToken}`
    ).toString('base64');
    return `Basic ${token}`;
  }

  private async setAssignee(issueKey: string, assignee: string): Promise<void> {
    const trimmed = assignee.trim();
    if (!trimmed) return;

    await this.detectAssigneeFieldMode();

    const tryModes: Array<'name' | 'accountId'> =
      this.assigneeFieldMode === 'accountId' ? ['accountId', 'name'] : ['name', 'accountId'];

    let lastError: { status: number; body: string; mode: 'name' | 'accountId' } | null = null;

    for (const mode of tryModes) {
      const result = await retryWithBackoff(async () => {
        const body = mode === 'accountId' ? { accountId: trimmed } : { name: trimmed };
        const response = await fetch(
          `${this.config.baseUrl}/rest/api/2/issue/${issueKey}/assignee`,
          {
            method: 'PUT',
            headers: {
              Authorization: this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        if (response.ok) {
          return { ok: true as const };
        }

        const error = await response.text();
        const status = response.status;

        // If forbidden/unauthorized, no reason to try other modes.
        if (status === 401 || status === 403) {
          const err = new Error(
            `Failed to set assignee (auth/permission): ${status} - ${error}`
          ) as RetryableError;
          err.statusCode = status;
          throw err;
        }

        // For "bad request" style errors, allow trying the other mode.
        if (status === 400 || status === 404) {
          return { ok: false as const, status, error, mode };
        }

        const err = new Error(`Failed to set assignee: ${status} - ${error}`) as RetryableError;
        err.statusCode = status;
        throw err;
      });

      if (result.ok) {
        // If we succeeded with the fallback mode, lock it in for future calls.
        if (this.assigneeFieldMode !== mode) {
          this.assigneeFieldMode = mode;
          logger.info('Assignee mode updated after successful set', { mode });
        }
        return;
      }

      // result.ok === false (400/404). Record and try next mode.
      lastError = { status: result.status, body: result.error, mode: result.mode };
    }

    if (lastError) {
      const err = new Error(
        `Failed to set assignee after trying modes (${tryModes.join(
          ','
        )}). Last error (${lastError.mode}): ${lastError.status} - ${lastError.body}`
      ) as RetryableError;
      err.statusCode = lastError.status;
      throw err;
    }
  }

  private async getAssigneeInfo(
    issueKey: string
  ): Promise<{ displayName: string | null; username: string | null }> {
    const response = await fetch(
      `${this.config.baseUrl}/rest/api/2/issue/${issueKey}?fields=assignee`,
      {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader() },
      }
    );
    if (!response.ok) return { displayName: null, username: null };
    const data = (await response.json()) as any;
    return {
      displayName: data?.fields?.assignee?.displayName || null,
      username: data?.fields?.assignee?.name || null,
    };
  }

  async createIssue(params: CreateIssueParams): Promise<CreateIssueResult> {
    logger.info('Creating Jira issue', {
      project: params.project,
      issueType: params.issueType,
      priority: params.priority,
    });

    // Auto-resolve assignee
    let assignee: string | undefined = params.assignee;
    
    // 1순위: VOC 내용(제목, 설명)에서 키워드 감지
    if (!assignee) {
      assignee = this.assigneeResolver.resolveFromText(
        params.summary,
        params.description
      ) || undefined;
    }
    
    // 2순위: 카테고리 기반 할당
    if (!assignee && params.category) {
      assignee = this.assigneeResolver.resolve(params.category) || undefined;
    }

    const payload: any = {
      fields: {
        project: { key: params.project },
        summary: params.summary,
        description: normalizeDescriptionForJira(params.description),
        issuetype: { name: params.issueType },
        priority: { name: params.priority },
        labels: params.labels || [],
      },
    };

    // Add components if specified
    if (params.components && params.components.length > 0) {
      payload.fields.components = params.components.map((name) => ({ name }));
    }

    // Add assignee (Jira Server/Data Center format only)
    if (assignee && typeof assignee === 'string' && assignee.trim().length > 0) {
      payload.fields.assignee = this.buildAssigneeField(assignee);
      logger.debug('Adding assignee to payload', { assignee, mode: this.assigneeFieldMode });
    } else {
      logger.debug('No valid assignee found, skipping assignee field');
    }

    const result = await retryWithBackoff(async () => {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/2/issue`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        const err = new Error(
          `Jira API error: ${response.status} - ${error}`
        ) as RetryableError;
        err.statusCode = response.status;
        throw err;
      }

      return response.json() as Promise<any>;
    });

    logger.info('Jira issue created', {
      issueKey: result.key,
      issueId: result.id,
    });

    // Jira project defaults / automation can override assignee on create.
    // To make our mapping effective, re-apply assignee once after creation and verify once.
    let assigneeFinalDisplayName: string | null = null;
    let assigneeFinalUsername: string | null = null;
    let assigneeApplied = false;
    if (assignee && assignee.trim().length > 0) {
      try {
        await this.setAssignee(result.key, assignee);
        const finalAssignee = await this.getAssigneeInfo(result.key);
        assigneeFinalDisplayName = finalAssignee.displayName;
        assigneeFinalUsername = finalAssignee.username;
        logger.info('Assignee applied after create', {
          issueKey: result.key,
          assigneeRequested: assignee,
          assigneeFinalDisplayName: finalAssignee.displayName,
          assigneeFinalUsername: finalAssignee.username,
        });

        // If still not applied (e.g., racing automation / permission), retry once.
        // Compare username (assignee.name) to requested username.
        if (finalAssignee.username && finalAssignee.username !== assignee) {
          await new Promise((r) => setTimeout(r, 1000));
          await this.setAssignee(result.key, assignee);
          const finalAssignee2 = await this.getAssigneeInfo(result.key);
          assigneeFinalDisplayName = finalAssignee2.displayName;
          assigneeFinalUsername = finalAssignee2.username;
          logger.info('Assignee re-applied after delay', {
            issueKey: result.key,
            assigneeRequested: assignee,
            assigneeFinalDisplayName: finalAssignee2.displayName,
            assigneeFinalUsername: finalAssignee2.username,
          });
        }

        assigneeApplied = Boolean(assigneeFinalUsername && assigneeFinalUsername === assignee);
      } catch (e) {
        logger.warn('Failed to apply assignee after create (mapping may be overridden)', {
          issueKey: result.key,
          assigneeRequested: assignee,
          error: (e as Error).message,
        });
      }
    }

    return {
      issueKey: result.key,
      issueId: result.id,
      url: `${this.config.baseUrl}/browse/${result.key}`,
      created: true,
      assigneeRequested: assignee ?? null,
      assigneeFinalDisplayName,
      assigneeFinalUsername,
      assigneeApplied,
    };
  }

  async addComment(
    issueKey: string,
    comment: string
  ): Promise<AddCommentResult> {
    logger.info('Adding comment to issue', { issueKey });

    const result = await retryWithBackoff(async () => {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/2/issue/${issueKey}/comment`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ body: normalizeDescriptionForJira(comment) }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        const err = new Error(
          `Failed to add comment: ${response.status} - ${error}`
        ) as RetryableError;
        err.statusCode = response.status;
        throw err;
      }

      return response.json() as Promise<any>;
    });

    logger.info('Comment added', { issueKey, commentId: result.id });

    return {
      commentId: result.id,
      added: true,
    };
  }

  async transitionIssue(
    issueKey: string,
    transitionName: string
  ): Promise<TransitionResult> {
    logger.info('Transitioning issue', { issueKey, transitionName });

    // Get available transitions
    const transitionsResponse = await fetch(
      `${this.config.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      }
    );

    if (!transitionsResponse.ok) {
      throw new Error(
        `Failed to get transitions: ${transitionsResponse.status}`
      );
    }

    const transitionsData = (await transitionsResponse.json()) as any;
    const transition = transitionsData.transitions.find(
      (t: any) => t.name.toLowerCase() === transitionName.toLowerCase()
    );

    if (!transition) {
      throw new Error(
        `Transition '${transitionName}' not available for issue ${issueKey}`
      );
    }

    // Execute transition
    await retryWithBackoff(async () => {
      const response = await fetch(
        `${this.config.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transition: { id: transition.id },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        const err = new Error(
          `Failed to transition: ${response.status} - ${error}`
        ) as RetryableError;
        err.statusCode = response.status;
        throw err;
      }
    });

    logger.info('Issue transitioned', {
      issueKey,
      newStatus: transition.to.name,
    });

    return {
      success: true,
      currentStatus: transition.to.name,
    };
  }

  async getIssue(issueKey: string): Promise<any> {
    logger.debug('Fetching issue', { issueKey });

    const response = await fetch(
      `${this.config.baseUrl}/rest/api/2/issue/${issueKey}`,
      {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get issue: ${response.status}`);
    }

    return response.json();
  }

  async getAttachments(issueKey: string): Promise<AttachmentsResult> {
    logger.info('Fetching attachments', { issueKey });

    const issue = await this.getIssue(issueKey);
    const attachments = issue.fields.attachment || [];

    const result: AttachmentsResult = {
      issueKey,
      count: attachments.length,
      attachments: attachments.map((att: any) => ({
        id: att.id,
        filename: att.filename,
        size: att.size,
        mimeType: att.mimeType,
        created: att.created,
        author: att.author?.displayName || att.author?.name || 'Unknown',
        content: att.content, // Download URL
      })),
    };

    logger.info('Attachments fetched', { 
      issueKey, 
      count: result.count,
      files: result.attachments.map(a => a.filename)
    });

    return result;
  }

  async downloadAttachment(
    attachmentUrl: string,
    saveAsBase64: boolean = false
  ): Promise<Buffer | string> {
    logger.info('Downloading attachment', { url: attachmentUrl });

    const response = await retryWithBackoff(async () => {
      const res = await fetch(attachmentUrl, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!res.ok) {
        const err = new Error(
          `Failed to download attachment: ${res.status} ${res.statusText}`
        ) as RetryableError;
        err.statusCode = res.status;
        throw err;
      }

      return res;
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    
    logger.info('Attachment downloaded', { 
      size: buffer.length,
      sizeKB: (buffer.length / 1024).toFixed(2)
    });

    if (saveAsBase64) {
      return buffer.toString('base64');
    }

    return buffer;
  }
}

