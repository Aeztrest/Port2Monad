/**
 * File type detection and categorization logic
 */

import { FileType } from '../types/index.js';

const SOLIDITY_EXTENSIONS = ['.sol'];
const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx'];
const JAVASCRIPT_EXTENSIONS = ['.js', '.jsx'];
const CONFIG_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml', '.config.js'];
const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx'];

const IGNORE_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '.vercel',
  'artifacts',
  'cache',
  '.cache',
  'venv',
  '.venv',
  '__pycache__',
]);

const IGNORE_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.production',
  '.npmrc',
  '.yarnrc',
]);

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) {
    return '';
  }
  return '.' + parts.pop()!.toLowerCase();
}

export function detectFileType(filename: string): FileType {
  const ext = getFileExtension(filename);

  if (SOLIDITY_EXTENSIONS.includes(ext)) {
    return 'solidity';
  }
  if (TYPESCRIPT_EXTENSIONS.includes(ext)) {
    return 'typescript';
  }
  if (JAVASCRIPT_EXTENSIONS.includes(ext)) {
    return 'javascript';
  }
  if (CONFIG_EXTENSIONS.includes(ext) || CONFIG_EXTENSIONS.some((e) => filename.endsWith(e))) {
    return 'config';
  }
  if (MARKDOWN_EXTENSIONS.includes(ext)) {
    return 'markdown';
  }

  return 'other';
}

export function shouldIgnoreDirectory(dirName: string): boolean {
  return IGNORE_DIRECTORIES.has(dirName);
}

export function shouldIgnoreFile(fileName: string): boolean {
  return IGNORE_FILES.has(fileName);
}

export function isRelevantFile(fileType: FileType): boolean {
  return ['solidity', 'typescript', 'javascript', 'config'].includes(fileType);
}
