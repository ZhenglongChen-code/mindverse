/**
 * Mindverse 索引管理模块
 * 负责管理 processedIndex.json，记录已处理文件状态
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProcessedFile {
  fileName: string;
  filePath: string;
  processTime: string;
  wikiOutputPath: string;
  processedBy: string;
}

export interface ProcessedIndex {
  processedFiles: ProcessedFile[];
  lastScanTime: string;
  pluginVersion: string;
}

export class IndexManager {
  private indexDir: string;
  private indexPath: string;

  constructor(basePath: string) {
    this.indexDir = path.join(basePath, 'MindverseIndex');
    this.indexPath = path.join(this.indexDir, 'processedIndex.json');
  }

  /**
   * 加载索引文件
   */
  loadIndex(): ProcessedIndex {
    if (!fs.existsSync(this.indexPath)) {
      // 索引文件丢失，重新创建
      return this.rebuildIndex();
    }
    const raw = fs.readFileSync(this.indexPath, 'utf-8');
    return JSON.parse(raw) as ProcessedIndex;
  }

  /**
   * 保存索引文件
   */
  saveIndex(index: ProcessedIndex): void {
    if (!fs.existsSync(this.indexDir)) {
      fs.mkdirSync(this.indexDir, { recursive: true });
    }
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 添加已处理文件记录
   */
  addProcessedFile(file: ProcessedFile): void {
    const index = this.loadIndex();
    // 避免重复添加
    const exists = index.processedFiles.some(f => f.filePath === file.filePath);
    if (!exists) {
      index.processedFiles.push(file);
    }
    index.lastScanTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.saveIndex(index);
  }

  /**
   * 检查文件是否已处理
   */
  isProcessed(filePath: string): boolean {
    const index = this.loadIndex();
    return index.processedFiles.some(f => f.filePath === filePath);
  }

  /**
   * 重建索引（索引文件丢失时调用）
   */
  private rebuildIndex(): ProcessedIndex {
    const defaultIndex: ProcessedIndex = {
      processedFiles: [],
      lastScanTime: '',
      pluginVersion: '1.0.0'
    };
    if (!fs.existsSync(this.indexDir)) {
      fs.mkdirSync(this.indexDir, { recursive: true });
    }
    this.saveIndex(defaultIndex);
    return defaultIndex;
  }

  /**
   * 获取索引目录路径
   */
  getIndexDir(): string {
    return this.indexDir;
  }
}
