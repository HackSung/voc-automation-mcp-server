import fetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import { Logger, retryWithBackoff } from '@voc-automation/shared';

const logger = new Logger('BitbucketClient');

export interface BitbucketConfig {
  baseUrl: string; // e.g., https://bitbucket.company.com
  username?: string; // For Basic Auth
  token?: string; // Personal Access Token or App Password
}

export interface Repository {
  slug: string;
  name: string;
  project: {
    key: string;
    name: string;
  };
  links: {
    clone: Array<{ href: string; name: string }>;
    self: Array<{ href: string }>;
  };
}

export interface FileContent {
  lines: Array<{ text: string }>;
  size: number;
  isLastPage: boolean;
}

export interface DirectoryListing {
  path: {
    components: string[];
    toString: string;
  };
  children: {
    values: Array<{
      path: {
        components: string[];
        toString: string;
      };
      type: 'FILE' | 'DIRECTORY';
      size?: number;
    }>;
  };
}

export interface Branch {
  id: string;
  displayId: string;
  type: string;
  latestCommit: string;
  isDefault: boolean;
}

export interface SearchResult {
  code: {
    category: string;
    isLastPage: boolean;
    count: number;
    start: number;
    nextStart: number;
    values: Array<{
      repository: {
        slug: string;
        name: string;
        project: {
          key: string;
          name: string;
        };
      };
      file: string; // File path as string
      hitContexts: Array<
        Array<{
          line: number;
          text: string;
        }>
      >; // 2D array of hit contexts
      pathMatches: any[];
      hitCount: number;
    }>;
  };
  scope: {
    type: string;
  };
  query: {
    substituted: boolean;
  };
}

export class BitbucketClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: BitbucketConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');

    if (config.token) {
      // Bearer token (Personal Access Token)
      this.authHeader = `Bearer ${config.token}`;
    } else if (config.username && config.token) {
      // Basic Auth (username + app password)
      const credentials = Buffer.from(
        `${config.username}:${config.token}`
      ).toString('base64');
      this.authHeader = `Basic ${credentials}`;
    } else {
      throw new Error(
        'Either token or username+token must be provided for authentication'
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: NodeFetchRequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/1.0${endpoint}`;

    return retryWithBackoff(async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string>),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bitbucket API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return (await response.json()) as T;
    });
  }

  /**
   * Lists all repositories in a project
   */
  async listRepositories(projectKey: string): Promise<Repository[]> {
    logger.debug('Listing repositories', { projectKey });

    const response = await this.request<{ values: Repository[] }>(
      `/projects/${projectKey}/repos?limit=100`
    );

    return response.values;
  }

  /**
   * Get repository details
   */
  async getRepository(
    projectKey: string,
    repoSlug: string
  ): Promise<Repository> {
    logger.debug('Getting repository', { projectKey, repoSlug });

    return this.request<Repository>(
      `/projects/${projectKey}/repos/${repoSlug}`
    );
  }

  /**
   * Browse directory contents
   */
  async browseDirectory(
    projectKey: string,
    repoSlug: string,
    path: string = '',
    branch: string = 'main'
  ): Promise<DirectoryListing> {
    logger.debug('Browsing directory', { projectKey, repoSlug, path, branch });

    const pathParam = path ? `/${path}` : '';
    return this.request<DirectoryListing>(
      `/projects/${projectKey}/repos/${repoSlug}/browse${pathParam}?at=${branch}&limit=1000`
    );
  }

  /**
   * Get file content
   */
  async getFileContent(
    projectKey: string,
    repoSlug: string,
    filePath: string,
    branch: string = 'main'
  ): Promise<string> {
    logger.debug('Getting file content', {
      projectKey,
      repoSlug,
      filePath,
      branch,
    });

    const response = await this.request<FileContent>(
      `/projects/${projectKey}/repos/${repoSlug}/browse/${filePath}?at=${branch}&limit=10000`
    );

    return response.lines.map((line) => line.text).join('\n');
  }

  /**
   * List branches
   */
  async listBranches(
    projectKey: string,
    repoSlug: string
  ): Promise<Branch[]> {
    logger.debug('Listing branches', { projectKey, repoSlug });

    const response = await this.request<{ values: Branch[] }>(
      `/projects/${projectKey}/repos/${repoSlug}/branches?limit=100`
    );

    return response.values;
  }

  /**
   * Search code in repository
   * Uses Bitbucket Data Center 9.4+ search API
   */
  async searchCode(
    projectKey: string,
    repoSlug: string,
    query: string,
    branch?: string
  ): Promise<SearchResult> {
    logger.debug('Searching code', { projectKey, repoSlug, query, branch });

    const url = `${this.baseUrl}/rest/search/latest/search`;
    
    const requestBody = {
      query,
      entities: {
        code: {
          start: 0,
          limit: 50,
        },
      },
    };

    return retryWithBackoff(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bitbucket API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return (await response.json()) as SearchResult;
    });
  }

  /**
   * Get archive download URL (for bulk download)
   */
  getArchiveUrl(
    projectKey: string,
    repoSlug: string,
    format: 'zip' | 'tar.gz' = 'zip',
    branch: string = 'main'
  ): string {
    return `${this.baseUrl}/rest/api/1.0/projects/${projectKey}/repos/${repoSlug}/archive?format=${format}&at=${branch}`;
  }

  /**
   * Download repository archive
   */
  async downloadArchive(
    projectKey: string,
    repoSlug: string,
    format: 'zip' | 'tar.gz' = 'zip',
    branch: string = 'main'
  ): Promise<Buffer> {
    logger.debug('Downloading archive', {
      projectKey,
      repoSlug,
      format,
      branch,
    });

    const url = this.getArchiveUrl(projectKey, repoSlug, format, branch);

    return retryWithBackoff(async () => {
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download archive: ${response.status} ${response.statusText}`
        );
      }

      return Buffer.from(await response.arrayBuffer());
    });
  }

  /**
   * Get commits
   */
  async getCommits(
    projectKey: string,
    repoSlug: string,
    branch: string = 'main',
    limit: number = 25
  ): Promise<any[]> {
    logger.debug('Getting commits', { projectKey, repoSlug, branch, limit });

    const response = await this.request<{ values: any[] }>(
      `/projects/${projectKey}/repos/${repoSlug}/commits?until=${branch}&limit=${limit}`
    );

    return response.values;
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    projectKey: string,
    repoSlug: string,
    state: 'OPEN' | 'MERGED' | 'DECLINED' | 'ALL' = 'OPEN'
  ): Promise<any[]> {
    logger.debug('Listing pull requests', { projectKey, repoSlug, state });

    const response = await this.request<{ values: any[] }>(
      `/projects/${projectKey}/repos/${repoSlug}/pull-requests?state=${state}&limit=100`
    );

    return response.values;
  }

  /**
   * Get pull request details
   */
  async getPullRequest(
    projectKey: string,
    repoSlug: string,
    prId: number
  ): Promise<any> {
    logger.debug('Getting pull request', { projectKey, repoSlug, prId });

    return this.request<any>(
      `/projects/${projectKey}/repos/${repoSlug}/pull-requests/${prId}`
    );
  }
}
