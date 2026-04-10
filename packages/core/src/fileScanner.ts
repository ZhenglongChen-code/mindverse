/**
 * Mindverse 文件扫描模块
 * 负责扫描 Inbox 目录，筛选未处理文件
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RawFile {
  name: string;
  path: string;
  content: string;
  createTime: string;
}

export class FileScanner {
  private inboxPath: string;

  constructor(basePath: string, inboxPath: string) {
    this.inboxPath = path.join(basePath, inboxPath);
  }

  /**
   * 扫描 Inbox 目录下所有未处理的文件
   * @param processedPaths 已处理文件的路径集合
   */
  scanUnprocessed(processedPaths: Set<string>): RawFile[] {
    if (!fs.existsSync(this.inboxPath)) {
      fs.mkdirSync(this.inboxPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.inboxPath);
    const unprocessed: RawFile[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(this.inboxPath, file);

      // 跳过已处理的文件
      if (processedPaths.has(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);
      const createTime = stats.birthtime.toISOString().replace('T', ' ').substring(0, 19);

      unprocessed.push({
        name: file,
        path: filePath,
        content,
        createTime
      });
    }

    return unprocessed;
  }

  /**
   * 获取 Inbox 目录路径
   */
  getInboxPath(): string {
    return this.inboxPath;
  }

  /**
   * 获取所有已处理文件的路径集合
   */
  getProcessedPaths(index: { processedFiles: { filePath: string }[] }): Set<string> {
    return new Set(index.processedFiles.map(f => f.filePath));
  }
}
