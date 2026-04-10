/**
 * Mindverse 配置加载模块
 * 负责加载和解析 MindverseConfig 目录下的配置文件
 */

import * as fs from 'fs';
import * as path from 'path';

// ============= 类型定义 =============

export type ModelProvider = 'anthropic' | 'aliyun' | 'baidu' | 'zhipu' | 'moonshot' | 'deepseek' | 'spark' | 'hunyuan';

export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
}

export interface MindverseConfig {
  claudeApiKey: string;
  triggerMode: 'manual' | 'auto' | 'save';
  cronTime: string;
  wikiSavePath: string;
  inboxPath: string;
  modelVersion: string;
  pluginName: string;
  modelProvider: ModelProvider;
  modelConfigs: Record<ModelProvider, ModelConfig>;
}

// ============= 默认配置 =============

const DEFAULT_CONFIG: MindverseConfig = {
  claudeApiKey: '',
  triggerMode: 'manual',
  cronTime: '0 */6 * * *',
  wikiSavePath: 'Wiki/',
  inboxPath: 'Inbox/',
  modelVersion: 'claude-3-sonnet-20240229',
  pluginName: 'Mindverse',
  modelProvider: 'anthropic',
  modelConfigs: {
    anthropic: { provider: 'anthropic', modelName: 'claude-3-sonnet-20240229', apiKey: '' },
    aliyun: { provider: 'aliyun', modelName: 'qwen-turbo', apiKey: '', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    baidu: { provider: 'baidu', modelName: 'ernie-4.0-8k-latest', apiKey: '' },
    zhipu: { provider: 'zhipu', modelName: 'glm-4-flash', apiKey: '' },
    moonshot: { provider: 'moonshot', modelName: 'moonshot-v1-8k', apiKey: '' },
    deepseek: { provider: 'deepseek', modelName: 'deepseek-chat', apiKey: '' },
    spark: { provider: 'spark', modelName: 'Spark-3.5', apiKey: '' },
    hunyuan: { provider: 'hunyuan', modelName: 'hunyuan', apiKey: '' }
  }
};

// ============= 配置加载器 =============

export class ConfigLoader {
  private configDir: string;
  private configPath: string;
  private systemPromptPath: string;

  constructor(basePath: string) {
    this.configDir = path.join(basePath, 'MindverseConfig');
    this.configPath = path.join(this.configDir, 'config.json');
    this.systemPromptPath = path.join(this.configDir, 'systemPrompt.txt');
  }

  /**
   * 加载插件配置
   */
  loadConfig(): MindverseConfig {
    if (!fs.existsSync(this.configPath)) {
      this.saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MindverseConfig>;
    // 合并默认配置
    return { ...DEFAULT_CONFIG, ...parsed, modelConfigs: { ...DEFAULT_CONFIG.modelConfigs, ...parsed.modelConfigs } };
  }

  /**
   * 获取当前选中的模型配置
   */
  getActiveModelConfig(): ModelConfig {
    const config = this.loadConfig();
    return config.modelConfigs[config.modelProvider];
  }

  /**
   * 加载系统提示词
   */
  loadSystemPrompt(): string {
    if (!fs.existsSync(this.systemPromptPath)) {
      throw new Error(`系统提示词文件不存在: ${this.systemPromptPath}`);
    }
    return fs.readFileSync(this.systemPromptPath, 'utf-8');
  }

  /**
   * 保存配置
   */
  saveConfig(config: MindverseConfig): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * 获取配置目录路径
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): Array<{ provider: ModelProvider; modelName: string }> {
    const config = this.loadConfig();
    return Object.values(config.modelConfigs).map(m => ({ provider: m.provider, modelName: m.modelName }));
  }
}
