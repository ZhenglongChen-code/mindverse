import * as vscode from 'vscode';
import { MindverseCore } from '@mindverse/core';
import { ModelProvider, MindverseConfig } from '@mindverse/core';

type TriggerMode = 'manual' | 'auto' | 'save';

let mindverseCore: MindverseCore | null = null;
let saveWatcher: vscode.Disposable | null = null;

function getConfig(): MindverseConfig {
  const modelProvider = vscode.workspace.getConfiguration('mindverse').get<string>('modelProvider') as ModelProvider || 'anthropic';

  return {
    pluginName: 'Mindverse',
    modelProvider,
    triggerMode: vscode.workspace.getConfiguration('mindverse').get<'manual' | 'auto' | 'save'>('triggerMode') || 'manual',
    cronTime: vscode.workspace.getConfiguration('mindverse').get<string>('cronTime') || '0 */6 * * *',
    inboxPath: 'Inbox/',
    wikiSavePath: 'Wiki/',
    modelVersion: '',
    claudeApiKey: '',
    modelConfigs: {
      anthropic: {
        provider: 'anthropic',
        modelName: vscode.workspace.getConfiguration('mindverse').get<string>('anthropicModel') || 'claude-3-sonnet-20240229',
        apiKey: vscode.workspace.getConfiguration('mindverse').get<string>('anthropicApiKey') || ''
      },
      aliyun: {
        provider: 'aliyun',
        modelName: vscode.workspace.getConfiguration('mindverse').get<string>('aliyunModel') || 'qwen-turbo',
        apiKey: vscode.workspace.getConfiguration('mindverse').get<string>('aliyunApiKey') || '',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      },
      baidu: {
        provider: 'baidu',
        modelName: vscode.workspace.getConfiguration('mindverse').get<string>('baiduModel') || 'ernie-4.0-8k-latest',
        apiKey: vscode.workspace.getConfiguration('mindverse').get<string>('baiduApiKey') || ''
      },
      zhipu: {
        provider: 'zhipu',
        modelName: vscode.workspace.getConfiguration('mindverse').get<string>('zhipuModel') || 'glm-4-flash',
        apiKey: vscode.workspace.getConfiguration('mindverse').get<string>('zhipuApiKey') || ''
      },
      moonshot: {
        provider: 'moonshot',
        modelName: vscode.workspace.getConfiguration('mindverse').get<string>('moonshotModel') || 'moonshot-v1-8k',
        apiKey: vscode.workspace.getConfiguration('mindverse').get<string>('moonshotApiKey') || ''
      },
      deepseek: {
        provider: 'deepseek',
        modelName: vscode.workspace.getConfiguration('mindverse').get<string>('deepseekModel') || 'deepseek-chat',
        apiKey: vscode.workspace.getConfiguration('mindverse').get<string>('deepseekApiKey') || ''
      },
      spark: { provider: 'spark', modelName: 'Spark-3.5', apiKey: '' },
      hunyuan: { provider: 'hunyuan', modelName: 'hunyuan', apiKey: '' }
    }
  };
}

function setupTrigger(context: vscode.ExtensionContext, triggerMode: TriggerMode) {
  // 清理旧的 watcher
  if (saveWatcher) { saveWatcher.dispose(); saveWatcher = null; }

  if (triggerMode === 'save') {
    saveWatcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const workspaceRoot = vscode.workspace.rootPath || '';
      if (!workspaceRoot) return;

      const inboxPath = vscode.Uri.file(`${workspaceRoot}/Inbox`);
      if (!doc.uri.fsPath.startsWith(inboxPath.fsPath)) return;
      if (!doc.uri.fsPath.endsWith('.md')) return;

      await processInboxInternal();
    });
    context.subscriptions.push(saveWatcher);
  }
}

async function processInboxInternal(): Promise<void> {
  if (!mindverseCore) return;
  try {
    const result = await mindverseCore.processAll();
    if (result.processed === 0 && result.failed === 0) return;
    const message = `Mindverse 已处理 ${result.processed} 个素材${result.failed > 0 ? `，失败 ${result.failed} 个` : ''}`;
    vscode.window.showInformationMessage(message);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Mindverse 处理失败: ${error.message}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.rootPath || '';

  if (!workspaceRoot) {
    vscode.window.showWarningMessage('Mindverse: 请先打开一个工作区文件夹');
    return;
  }

  try {
    mindverseCore = new MindverseCore(workspaceRoot);
    const config = getConfig();
    mindverseCore.getConfig().modelProvider = config.modelProvider;
    mindverseCore.getConfig().modelConfigs = config.modelConfigs;
    mindverseCore.reloadConfig();
  } catch (error: any) {
    vscode.window.showErrorMessage(`Mindverse 初始化失败: ${error.message}`);
    return;
  }

  // 设置触发模式
  const triggerMode = vscode.workspace.getConfiguration('mindverse').get<'manual' | 'auto' | 'save'>('triggerMode') || 'manual';
  setupTrigger(context, triggerMode);

  // 注册命令：处理 Inbox
  const processCommand = vscode.commands.registerCommand('mindverse.processInbox', async () => {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Mindverse 处理中...',
      cancellable: false
    }, async () => {
      await processInboxInternal();
    });
  });

  // 注册命令：打开配置
  const configCommand = vscode.commands.registerCommand('mindverse.openConfig', async () => {
    const configPath = vscode.Uri.file(`${workspaceRoot}/MindverseConfig/config.json`);
    vscode.window.showTextDocument(configPath);
  });

  // 注册命令：验证模型
  const validateCommand = vscode.commands.registerCommand('mindverse.validate', async () => {
    if (!mindverseCore) { vscode.window.showErrorMessage('Mindverse 核心未初始化'); return; }
    const result = await mindverseCore.validateCurrentModel();
    vscode.window.showInformationMessage(result.valid ? 'API 验证通过' : `验证失败: ${result.error}`);
  });

  // 监听配置变化
  const configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('mindverse.triggerMode')) {
      const newMode = vscode.workspace.getConfiguration('mindverse').get<'manual' | 'auto' | 'save'>('triggerMode') || 'manual';
      setupTrigger(context, newMode);
      vscode.window.showInformationMessage(`Mindverse 触发模式已切换为: ${
        newMode === 'manual' ? '手动触发' : newMode === 'auto' ? '定时自动' : '保存触发'
      }`);
    }
  });

  // 状态栏
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(mindverse) Mindverse';
  statusBar.command = 'mindverse.processInbox';
  statusBar.tooltip = '点击处理 Inbox 素材';
  statusBar.show();

  context.subscriptions.push(processCommand, configCommand, validateCommand, configWatcher, statusBar);

  console.log('Mindverse VSCode 插件已激活');
}

export function deactivate() {
  if (saveWatcher) saveWatcher.dispose();
  console.log('Mindverse VSCode 插件已停用');
}
