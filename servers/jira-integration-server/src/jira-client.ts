import fetch from 'node-fetch';
import { Logger, retryWithBackoff, RetryableError } from '@voc-automation/shared';
import { AssigneeResolver } from './assignee-resolver.js';

const logger = new Logger('JiraClient');

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

  constructor(private config: JiraConfig) {
    this.assigneeResolver = new AssigneeResolver();
    logger.info('JiraClient initialized (Jira Server/Data Center)', { 
      baseUrl: config.baseUrl
    });
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
        description: params.description,
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
      // Jira Server/Data Center uses name (username)
      payload.fields.assignee = { name: assignee };
      logger.debug('Adding assignee to payload (Jira Server format)', { assignee });
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

    return {
      issueKey: result.key,
      issueId: result.id,
      url: `${this.config.baseUrl}/browse/${result.key}`,
      created: true,
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
          body: JSON.stringify({ body: comment }),
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

