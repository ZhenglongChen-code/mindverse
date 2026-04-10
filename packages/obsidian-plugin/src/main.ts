import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import { MindverseCore } from '@mindverse/core';
import { ModelProvider, ModelConfig } from '@mindverse/core';

type TriggerMode = 'manual' | 'auto' | 'save';

interface MindverseSettings {
  modelProvider: ModelProvider;
  modelConfigs: Record<ModelProvider, ModelConfig>;
  triggerMode: TriggerMode;
  cronTime: string;
}

const DEFAULT_SETTINGS: MindverseSettings = {
  modelProvider: 'anthropic',
  modelConfigs: {
    anthropic: { provider: 'anthropic', apiKey: '', modelName: 'claude-3-sonnet-20240229' },
    aliyun: { provider: 'aliyun', apiKey: '', modelName: 'qwen-turbo' },
    baidu: { provider: 'baidu', apiKey: '', modelName: 'ernie-4.0-8k-latest' },
    zhipu: { provider: 'zhipu', apiKey: '', modelName: 'glm-4-flash' },
    moonshot: { provider: 'moonshot', apiKey: '', modelName: 'moonshot-v1-8k' },
    deepseek: { provider: 'deepseek', apiKey: '', modelName: 'deepseek-chat' },
    spark: { provider: 'spark', apiKey: '', modelName: 'Spark-3.5' },
    hunyuan: { provider: 'hunyuan', apiKey: '', modelName: 'hunyuan' }
  },
  triggerMode: 'manual',
  cronTime: '0 */6 * * *'
};

const MODEL_LABELS: Record<ModelProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  aliyun: '阿里通义千问',
  baidu: '百度文心一言',
  zhipu: '智谱 GLM',
  moonshot: 'Kimi (月之暗面)',
  deepseek: 'DeepSeek',
  spark: '讯飞星火',
  hunyuan: '腾讯混元'
};

const TRIGGER_LABELS: Record<TriggerMode, string> = {
  manual: '手动触发',
  auto: '定时自动',
  save: '保存触发'
};

export default class MindversePlugin extends Plugin {
  settings!: MindverseSettings;
  private core: MindverseCore | null = null;
  private cronJob: NodeJS.Timeout | null = null;

  async onload() {
    await this.loadSettings();
    this.initCore();
    this.addRibbonIcon('dice', 'Mindverse - 处理 Inbox 素材', async () => {
      await this.processInbox();
    });
    this.addCommand({
      id: 'process-inbox',
      name: '处理 Inbox 素材',
      callback: async () => { await this.processInbox(); }
    });
    this.addSettingTab(new MindverseSettingTab(this.app, this));
    this.setupTrigger();
    console.log('Mindverse 插件已加载');
  }

  onunload() {
    if (this.cronJob) clearInterval(this.cronJob);
    console.log('Mindverse 插件已卸载');
  }

  private initCore() {
    try {
      this.core = new MindverseCore((this.app.vault.adapter as any).getBasePath());
      const config = this.core.getConfig();
      config.modelProvider = this.settings.modelProvider;
      config.modelConfigs = { ...config.modelConfigs, ...this.settings.modelConfigs };
      this.core.reloadConfig();
    } catch (error) {
      console.error('Mindverse 核心初始化失败:', error);
    }
  }

  private setupTrigger() {
    if (this.cronJob) { clearInterval(this.cronJob); this.cronJob = null; }

    if (this.settings.triggerMode === 'auto') {
      this.startCronJob();
    } else if (this.settings.triggerMode === 'save') {
      this.startSaveWatcher();
    }
  }

  private startCronJob() {
    this.cronJob = setInterval(async () => {
      const now = new Date();
      const [minute] = this.settings.cronTime.split(' ').map(Number);
      if (now.getMinutes() === minute) await this.processInbox();
    }, 60000);
  }

  private startSaveWatcher() {
    this.registerEvent(
      (this.app.vault.on as any)('modify', async (file: TFile) => {
        if (!file.path.startsWith('Inbox/') || !file.path.endsWith('.md')) return;
        await this.processInbox();
      })
    );
  }

  private async processInbox() {
    if (!this.core) {
      new Notice('Mindverse 核心未初始化，请检查配置');
      return;
    }
    try {
      const result = await this.core.processAll();
      if (result.processed === 0 && result.failed === 0) return;
      const message = `Mindverse 已处理 ${result.processed} 个素材${result.failed > 0 ? `，失败 ${result.failed} 个` : ''}`;
      new Notice(message);
      if (result.errors.length > 0) console.error('Mindverse 处理错误:', result.errors);
    } catch (error: any) {
      new Notice(`Mindverse 处理失败: ${error.message}`);
    }
  }

  async loadSettings() {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded || {});
    // 确保 modelConfigs 有完整结构
    for (const key of Object.keys(DEFAULT_SETTINGS.modelConfigs) as ModelProvider[]) {
      if (!this.settings.modelConfigs[key]) {
        this.settings.modelConfigs[key] = DEFAULT_SETTINGS.modelConfigs[key];
      }
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initCore();
    this.setupTrigger();
  }

  getCore(): MindverseCore | null {
    return this.core;
  }
}

class MindverseSettingTab extends PluginSettingTab {
  plugin: MindversePlugin;

  constructor(app: App, plugin: MindversePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('模型提供商')
      .setDesc('选择使用的大模型')
      .addDropdown((dropdown: any) => {
        (Object.keys(MODEL_LABELS) as ModelProvider[]).forEach(key => {
          dropdown.addOption(key, MODEL_LABELS[key]);
        });
        dropdown.setValue(this.plugin.settings.modelProvider).onChange(async (value: string) => {
          this.plugin.settings.modelProvider = value as ModelProvider;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    const currentProvider = this.plugin.settings.modelProvider;
    const currentConfig = this.plugin.settings.modelConfigs[currentProvider];

    new Setting(containerEl)
      .setName(`${MODEL_LABELS[currentProvider]} API Key`)
      .setDesc(currentProvider === 'baidu' ? '格式: API_KEY|SECRET_KEY' : '输入 API 密钥')
      .addText((text: any) => text
        .setPlaceholder('')
        .setValue(currentConfig?.apiKey || '')
        .onChange(async (value: string) => {
          this.plugin.settings.modelConfigs[currentProvider] = { ...currentConfig, apiKey: value };
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(`${MODEL_LABELS[currentProvider]} 模型名称`)
      .setDesc('可自定义模型名称，默认使用推荐模型')
      .addText((text: any) => text
        .setPlaceholder(currentConfig?.modelName || '')
        .setValue(currentConfig?.modelName || '')
        .onChange(async (value: string) => {
          this.plugin.settings.modelConfigs[currentProvider] = { ...currentConfig, modelName: value };
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('hr');

    new Setting(containerEl)
      .setName('触发模式')
      .setDesc('选择手动触发、定时自动或保存触发')
      .addDropdown((dropdown: any) => {
        (Object.keys(TRIGGER_LABELS) as TriggerMode[]).forEach(key => {
          dropdown.addOption(key, TRIGGER_LABELS[key]);
        });
        dropdown.setValue(this.plugin.settings.triggerMode).onChange(async (value: string) => {
          this.plugin.settings.triggerMode = value as TriggerMode;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (this.plugin.settings.triggerMode === 'auto') {
      new Setting(containerEl)
        .setName('定时规则')
        .setDesc('Cron 表达式，默认每 6 小时处理一次')
        .addText((text: any) => text
          .setPlaceholder('0 */6 * * *')
          .setValue(this.plugin.settings.cronTime)
          .onChange(async (value: string) => {
            this.plugin.settings.cronTime = value;
            await this.plugin.saveSettings();
          }));
    }

    if (this.plugin.settings.triggerMode === 'save') {
      new Setting(containerEl)
        .setName('保存触发已开启')
        .setDesc('在 Inbox 文件夹中保存或编辑 .md 文件时，将自动触发处理');
    }

    containerEl.createEl('hr');

    new Setting(containerEl)
      .setName('验证模型配置')
      .setDesc('测试当前模型的 API 是否可用')
      .addButton((button: any) => button
        .setButtonText('验证')
        .setCta()
        .onClick(async () => {
          const core = this.plugin.getCore();
          if (!core) { new Notice('核心未初始化'); return; }
          const result = await core.validateCurrentModel();
          new Notice(result.valid ? 'API 验证通过' : `验证失败: ${result.error}`);
        }));
  }
}
