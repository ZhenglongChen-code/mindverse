/**
 * Mindverse 核心模块导出
 */

export { ConfigLoader, MindverseConfig, ModelConfig, ModelProvider } from './configLoader';
export { IndexManager, ProcessedFile, ProcessedIndex } from './indexManager';
export { FileScanner, RawFile } from './fileScanner';
export { AiService, AiRequest, AiResponse, createAiAdapter, IAiAdapter, ModelConfig as AiModelConfig } from './aiService';
export { WikiGenerator, WikiOutput } from './wikiGenerator';

/**
 * Mindverse 主入口类
 * 整合所有核心模块，提供统一调用接口
 */

import { ConfigLoader, MindverseConfig, ModelConfig } from './configLoader';
import { IndexManager, ProcessedFile } from './indexManager';
import { FileScanner } from './fileScanner';
import { AiService, createAiAdapter, IAiAdapter } from './aiService';
import { WikiGenerator } from './wikiGenerator';

export interface ProcessResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  results: Array<{
    fileName: string;
    wikiPath: string;
    success: boolean;
    error?: string;
  }>;
}

export class MindverseCore {
  private configLoader: ConfigLoader;
  private indexManager: IndexManager;
  private fileScanner: FileScanner;
  private aiAdapter!: IAiAdapter;
  private config: MindverseConfig;

  constructor(basePath: string) {
    this.configLoader = new ConfigLoader(basePath);
    this.config = this.configLoader.loadConfig();

    this.indexManager = new IndexManager(basePath);
    this.fileScanner = new FileScanner(basePath, this.config.inboxPath);
    this.initAiAdapter();
    this.wikiGenerator = new WikiGenerator(basePath, this.config.wikiSavePath);
  }

  private initAiAdapter() {
    const modelConfig = this.configLoader.getActiveModelConfig();
    this.aiAdapter = createAiAdapter(modelConfig);
  }

  private wikiGenerator!: WikiGenerator;

  /**
   * 执行全量处理流程
   */
  async processAll(): Promise<ProcessResult> {
    const result: ProcessResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      results: []
    };

    // 1. 加载索引
    const index = this.indexManager.loadIndex();
    const processedPaths = this.fileScanner.getProcessedPaths(index);

    // 2. 扫描未处理文件
    const unprocessedFiles = this.fileScanner.scanUnprocessed(processedPaths);

    if (unprocessedFiles.length === 0) {
      return { success: true, processed: 0, failed: 0, errors: [], results: [] };
    }

    // 3. 加载系统提示词
    const systemPrompt = this.configLoader.loadSystemPrompt();
    const modelConfig = this.configLoader.getActiveModelConfig();

    // 4. 逐个处理文件
    for (const file of unprocessedFiles) {
      try {
        // 调用 AI 处理
        const aiResponse = await this.aiAdapter.chat({
          systemPrompt,
          userContent: file.content,
          modelVersion: modelConfig.modelName
        });

        if (!aiResponse.success) {
          result.failed++;
          result.errors.push(`${file.name}: ${aiResponse.error}`);
          result.results.push({ fileName: file.name, wikiPath: '', success: false, error: aiResponse.error });
          continue;
        }

        // 生成 Wiki 文件
        const processTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const wikiOutput = this.wikiGenerator.generateWikiFile(aiResponse.content!, file.name, processTime);

        // 更新索引
        const processedFile: ProcessedFile = {
          fileName: file.name,
          filePath: file.path,
          processTime,
          wikiOutputPath: wikiOutput.filePath,
          processedBy: this.config.pluginName
        };
        this.indexManager.addProcessedFile(processedFile);

        result.processed++;
        result.results.push({ fileName: file.name, wikiPath: wikiOutput.filePath, success: true });
      } catch (error: any) {
        result.failed++;
        result.errors.push(`${file.name}: ${error.message}`);
        result.results.push({ fileName: file.name, wikiPath: '', success: false, error: error.message });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * 获取配置
   */
  getConfig(): MindverseConfig {
    return this.config;
  }

  /**
   * 切换模型提供商
   */
  switchModel(provider: string): boolean {
    const config = this.configLoader.loadConfig();
    if (!config.modelConfigs[provider as keyof typeof config.modelConfigs]) {
      return false;
    }
    config.modelProvider = provider as any;
    this.config = config;
    this.initAiAdapter();
    return true;
  }

  /**
   * 重新加载配置
   */
  reloadConfig(): void {
    this.config = this.configLoader.loadConfig();
    this.initAiAdapter();
  }

  /**
   * 验证当前模型 API 是否可用
   */
  async validateCurrentModel(): Promise<{ valid: boolean; error?: string }> {
    try {
      const valid = await this.aiAdapter.validate();
      return { valid };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}
