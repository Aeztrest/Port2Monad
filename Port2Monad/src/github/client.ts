/**
 * GitHub API Client
 * Handles interactions with GitHub repositories
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { RepositoryMetadata } from '../types/index.js';

interface GitHubRepoResponse {
  owner: {
    login: string;
  };
  name: string;
  full_name: string;
  html_url: string;
  description?: string;
  default_branch: string;
  private: boolean;
  size: number;
}

interface GitHubContentResponse {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
}

export class GitHubClient {
  private _client: AxiosInstance;

  constructor(token?: string) {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    
    // Only add Authorization header if a valid token is provided
    if (token && token !== 'your_github_token_here') {
      headers.Authorization = `token ${token}`;
    }

    this._client = axios.create({
      baseURL: 'https://api.github.com',
      headers,
      timeout: 10000,
    });

    logger.info('GitHubClient initialized');
  }

  async getRepository(owner: string, repo: string): Promise<RepositoryMetadata> {
    logger.debug({ owner, repo }, `Fetching repository metadata`);

    try {
      const response = await this._client.get<GitHubRepoResponse>(
        `/repos/${owner}/${repo}`
      );

      const data = response.data;
      return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        description: data.description || undefined,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
        size: data.size,
      };
    } catch (error) {
      logger.error({ error, owner, repo }, `Failed to fetch repository metadata`);
      throw new Error(`Failed to fetch repository ${owner}/${repo}`);
    }
  }

  async getRepositoryContents(
    owner: string,
    repo: string,
    path: string = ''
  ): Promise<GitHubContentResponse[]> {
    logger.debug({ owner, repo, path }, `Fetching repository contents`);

    try {
      const response = await this._client.get<GitHubContentResponse[]>(
        `/repos/${owner}/${repo}/contents/${path}`,
        {
          params: {
            per_page: 100,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(
        { error, owner, repo, path },
        `Failed to fetch repository contents`
      );
      throw new Error(`Failed to fetch contents from ${owner}/${repo}/${path}`);
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    logger.debug({ owner, repo, path }, `Fetching file content`);

    try {
      const response = await this._client.get(
        `/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3.raw',
          },
        }
      );

      return response.data as string;
    } catch (error) {
      logger.error({ error, owner, repo, path }, `Failed to fetch file content`);
      throw new Error(`Failed to fetch file ${owner}/${repo}/${path}`);
    }
  }
}

export function createGitHubClient(token?: string): GitHubClient {
  return new GitHubClient(token);
}
