/**
 * Repository ingestion module
 * Fetches and parses GitHub repositories into structured format
 */

import { GitHubClient } from '../github/client.js';
import { logger } from '../utils/logger.js';
import {
  RepositoryTree,
  RepositoryFile,
  RepositoryDirectory,
} from '../types/index.js';
import {
  getFileExtension,
  detectFileType,
  shouldIgnoreDirectory,
  shouldIgnoreFile,
} from './fileTypeDetector.js';

const MAX_RECURSION_DEPTH = 10;
const MAX_FILES_TO_FETCH = 5000;

interface ParsedRepoUrl {
  owner: string;
  repo: string;
}

function parseRepositoryUrl(repoUrl: string): ParsedRepoUrl {
  // Handle URLs like:
  // https://github.com/owner/repo
  // https://github.com/owner/repo/
  // github.com/owner/repo
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/)?$/);

  if (!match) {
    throw new Error(
      `Invalid GitHub repository URL: ${repoUrl}. Expected format: https://github.com/owner/repo`
    );
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

export class RepositoryIngester {
  private client: GitHubClient;
  private fileCount: number = 0;
  private solidityCount: number = 0;
  private typescriptCount: number = 0;
  private javascriptCount: number = 0;
  private configCount: number = 0;
  private otherCount: number = 0;

  constructor(githubToken?: string) {
    this.client = new GitHubClient(githubToken);
  }

  async ingestRepository(repoUrl: string): Promise<RepositoryTree> {
    logger.info({ repoUrl }, 'Starting repository ingestion');

    try {
      const { owner, repo } = parseRepositoryUrl(repoUrl);

      // Reset counters
      this.fileCount = 0;
      this.solidityCount = 0;
      this.typescriptCount = 0;
      this.javascriptCount = 0;
      this.configCount = 0;
      this.otherCount = 0;

      // Fetch repository metadata
      const metadata = await this.client.getRepository(owner, repo);
      logger.info({ owner, repo }, `Repository metadata fetched`);

      // Recursively fetch repository structure
      const root = await this.fetchDirectoryTree(
        owner,
        repo,
        '',
        0
      );

      const totalSize = metadata.size * 1024; // GitHub size is in KB

      const result: RepositoryTree = {
        metadata,
        root,
        stats: {
          totalFiles: this.fileCount,
          solidityFiles: this.solidityCount,
          typescriptFiles: this.typescriptCount,
          javascriptFiles: this.javascriptCount,
          configFiles: this.configCount,
          otherFiles: this.otherCount,
          totalSize,
        },
        fetchedAt: new Date().toISOString(),
      };

      logger.info(
        { stats: result.stats },
        `Repository ingestion completed`
      );

      return result;
    } catch (error) {
      logger.error({ error, repoUrl }, 'Repository ingestion failed');
      throw error;
    }
  }

  private async fetchDirectoryTree(
    owner: string,
    repo: string,
    path: string,
    depth: number
  ): Promise<RepositoryDirectory> {
    // Prevent infinite recursion and respect depth limits
    if (depth > MAX_RECURSION_DEPTH || this.fileCount > MAX_FILES_TO_FETCH) {
      return {
        path,
        name: path.split('/').pop() || 'root',
        files: [],
        subdirectories: [],
      };
    }

    try {
      const contents = await this.client.getRepositoryContents(
        owner,
        repo,
        path
      );

      const directory: RepositoryDirectory = {
        path,
        name: path.split('/').pop() || 'root',
        files: [],
        subdirectories: [],
      };

      // Process contents
      for (const item of contents) {
        // Skip ignored directories
        if (item.type === 'dir') {
          if (shouldIgnoreDirectory(item.name)) {
            logger.debug({ dir: item.path }, 'Ignoring directory');
            continue;
          }

          // Recursively fetch subdirectory
          const subdir = await this.fetchDirectoryTree(
            owner,
            repo,
            item.path,
            depth + 1
          );

          if (subdir.files.length > 0 || subdir.subdirectories.length > 0) {
            directory.subdirectories.push(subdir);
          }
        } else {
          // Process file
          if (shouldIgnoreFile(item.name)) {
            logger.debug({ file: item.path }, 'Ignoring file');
            continue;
          }

          const fileType = detectFileType(item.name);
          const file: RepositoryFile = {
            path: item.path,
            name: item.name,
            extension: getFileExtension(item.name),
            type: fileType,
            size: item.size,
            sha: item.sha,
          };

          directory.files.push(file);
          this.fileCount++;

          // Update type counters
          switch (fileType) {
            case 'solidity':
              this.solidityCount++;
              break;
            case 'typescript':
              this.typescriptCount++;
              break;
            case 'javascript':
              this.javascriptCount++;
              break;
            case 'config':
              this.configCount++;
              break;
            default:
              this.otherCount++;
          }
        }
      }

      return directory;
    } catch (error) {
      logger.error(
        { error, path },
        'Failed to fetch directory tree'
      );
      // Return empty directory on error instead of propagating
      return {
        path,
        name: path.split('/').pop() || 'root',
        files: [],
        subdirectories: [],
      };
    }
  }
}

export async function ingestRepository(
  repoUrl: string,
  githubToken?: string
): Promise<RepositoryTree> {
  const ingester = new RepositoryIngester(githubToken);
  return ingester.ingestRepository(repoUrl);
}
