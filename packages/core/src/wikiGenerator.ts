/**
 * Mindverse Wiki 生成模块
 * 负责将 AI 返回的结构化内容写入 Wiki 目录
 */

import * as fs from 'fs';
import * as path from 'path';

export interface WikiOutput {
  fileName: string;
  filePath: string;
  content: string;
}

export class WikiGenerator {
  private wikiPath: string;

  constructor(basePath: string, wikiSavePath: string) {
    this.wikiPath = path.join(basePath, wikiSavePath);
  }

  /**
   * 生成 Wiki 文件
   * @param content AI 返回的结构化 Markdown 内容
   * @param originalFileName 原始文件名，用于记录来源
   * @param processTime 处理时间
   */
  generateWikiFile(
    content: string,
    originalFileName: string,
    processTime: string
  ): WikiOutput {
    if (!fs.existsSync(this.wikiPath)) {
      fs.mkdirSync(this.wikiPath, { recursive: true });
    }

    // 从内容中提取标题作为文件名
    const titleMatch = content.match(/^#\s+(.+)$/m);
    let baseFileName = titleMatch
      ? titleMatch[1].replace(/[\\/:*?"<>|]/g, '').trim()
      : path.basename(originalFileName, '.md');

    // 避免文件名冲突
    let fileName = `${baseFileName}.md`;
    let filePath = path.join(this.wikiPath, fileName);
    let counter = 1;

    while (fs.existsSync(filePath)) {
      fileName = `${baseFileName}_${counter}.md`;
      filePath = path.join(this.wikiPath, fileName);
      counter++;
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    return {
      fileName,
      filePath,
      content
    };
  }

  /**
   * 获取 Wiki 目录路径
   */
  getWikiPath(): string {
    return this.wikiPath;
  }
}
